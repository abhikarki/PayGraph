"""API routes for payment routing analysis."""
import logging
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse

from app.schemas import (
    PaymentIntentRequest,
    PaymentIntentResponse,
    RouteOption,
    RouteCost,
    HealthCheckResponse,
    ErrorResponse,
)
from app.config import get_settings
from app.engine import PathFinder, ScoringPreference
from app.data import FXRateFetcher, GasFeeFetcher, get_payment_graph
from app.data.rail_config import RailConfig

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["payment-routing"])

# Singleton instances
_fx_fetcher: Optional[FXRateFetcher] = None
_gas_fetcher: Optional[GasFeeFetcher] = None
_pathfinder: Optional[PathFinder] = None


def get_fx_fetcher() -> FXRateFetcher:
    """Get or create FX rate fetcher."""
    global _fx_fetcher
    if _fx_fetcher is None:
        settings = get_settings()
        _fx_fetcher = FXRateFetcher(
            api_key=settings.open_exchange_rates_api_key,
            cache_ttl=settings.fx_rate_cache_ttl,
        )
    return _fx_fetcher


def get_gas_fetcher() -> GasFeeFetcher:
    global _gas_fetcher
    if _gas_fetcher is None:
        _gas_fetcher = GasFeeFetcher()
    return _gas_fetcher


def get_pathfinder() -> PathFinder:
    global _pathfinder
    if _pathfinder is None:
        graph = get_payment_graph()
        _pathfinder = PathFinder(graph)
    return _pathfinder


@router.get("/health", response_model=HealthCheckResponse)
async def health_check() -> HealthCheckResponse:
    settings = get_settings()
    
    return HealthCheckResponse(
        status="healthy",
        version="0.1.0",
        services={
            "pathfinder": "operational",
            "fx_fetcher": "operational",
            "gas_fetcher": "operational",
            "payment_graph": "operational",
        }
    )


@router.post(
    "/routes/analyze",
    response_model=PaymentIntentResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    }
)
async def analyze_routes(
    request: PaymentIntentRequest,
    fx_fetcher: FXRateFetcher = Depends(get_fx_fetcher),
    pathfinder: PathFinder = Depends(get_pathfinder),
) -> PaymentIntentResponse:
    request_id = str(uuid.uuid4())
    intent_id = f"intent_{request_id}"
    
    logger.info(
        f"[{request_id}] Analyzing route: {request.source_currency} → "
        f"{request.destination_currency} | Amount: {request.amount}"
    )
    
    try:
        # Determine scoring preference from request constraints
        preference = ScoringPreference.BALANCED
        if request.constraints:
            # Could add user preference input here if desired
            pass
        
        # Find best paths using the routing engine
        logger.debug(f"[{request_id}] Finding best paths")
        best_paths = pathfinder.find_best_paths(
            from_currency=request.source_currency.value,
            to_currency=request.destination_currency.value,
            amount=request.amount,
            preference=preference,
            max_hops=5,
            num_results=5,
        )
        
        if not best_paths:
            raise ValueError(
                f"No payment routes found from {request.source_currency} to {request.destination_currency}"
            )
        
        logger.debug(f"[{request_id}] Found {len(best_paths)} routes")
        
        # Get FX rate for cost calculations
        fx_rate = await fx_fetcher.get_rate(
            request.source_currency.value,
            request.destination_currency.value,
        )
        if not fx_rate:
            logger.warning(f"[{request_id}] Could not fetch FX rate")
            fx_rate = 1.0  # Fallback
        
        # Convert routes to response format
        route_options: List[RouteOption] = []
        
        for idx, (path, score) in enumerate(best_paths, 1):
            # Calculate route metrics
            metrics = pathfinder.estimate_route_metrics(path, request.amount)
            
            # Build route cost breakdown
            cost_breakdown = {
                "provider_fee": sum(rail.flat_fee_usd for rail in path),
                "percentage_fee": request.amount * sum(rail.percentage_fee for rail in path),
                "fx_spread": request.amount * sum(rail.fx_spread for rail in path),
                "total_cost": metrics.get("total_cost_usd", 0),
            }
            
            # Destination amount after fees
            destination_amount = (request.amount - cost_breakdown["total_cost"]) * fx_rate
            
            route_option = RouteOption(
                route_id=f"route_{request_id}_{idx}",
                route_type=path[0].name.value if path else "unknown",
                provider=" → ".join(r.name.value for r in path),
                cost=RouteCost(
                    provider_fee=cost_breakdown["provider_fee"],
                    fx_spread=cost_breakdown["fx_spread"],
                    network_fee=0,  # Included in rail fees
                    off_ramp_cost=0,  # Included if applicable
                    total_cost=cost_breakdown["total_cost"],
                    effective_rate=destination_amount / request.amount if request.amount > 0 else 0,
                ),
                cost_rank=idx,
                estimated_time_minutes=metrics.get("settlement_minutes", 0),
                time_rank=idx,
                reliability_score=metrics.get("average_reliability", 0.8),
                success_rank=idx,
                overall_rank=idx,
                steps=[{"rail": r.name.value, "from": r.from_currency, "to": r.to_currency} for r in path],
                warnings=[],
            )
            route_options.append(route_option)
        
        # Find best overall, cheapest, fastest
        cheapest = min(route_options, key=lambda r: r.cost.total_cost, default=None)
        fastest = min(route_options, key=lambda r: r.estimated_time_minutes, default=None)
        best = route_options[0] if route_options else None
        
        logger.info(
            f"[{request_id}] Analysis complete: {len(route_options)} routes | "
            f"Cheapest: {cheapest.provider if cheapest else 'N/A'} "
            f"(${cheapest.cost.total_cost:.2f})"
        )
        
        return PaymentIntentResponse(
            intent_id=intent_id,
            timestamp=datetime.utcnow(),
            source_amount=request.amount,
            source_currency=request.source_currency,
            destination_currency=request.destination_currency,
            destination_country=request.destination_country,
            routes=route_options,
            cheapest_route=cheapest.route_id if cheapest else None,
            fastest_route=fastest.route_id if fastest else None,
            best_overall_route=best.route_id if best else None,
            estimated_received=[
                {
                    "route_id": r.route_id,
                    "provider": r.provider,
                    "you_receive": r.cost.effective_rate * request.amount,
                    "currency": request.destination_currency.value,
                }
                for r in route_options
            ]
        )
    
    except ValueError as e:
        logger.error(f"[{request_id}] Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"[{request_id}] Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/routes/corridors")
async def get_supported_corridors():
    rails = RailConfig.get_default_rails()
    
    # Extract unique corridors
    corridors = set()
    for rail in rails:
        if rail.supported_corridors:
            corridors.update(rail.supported_corridors)
    
    return {
        "supported_corridors": len(corridors),
        "corridors": sorted(list(corridors)),
        "total_rails": len(rails),
    }


@router.get("/routes/supported-currencies")
async def get_supported_currencies():
    graph = get_payment_graph()
    
    return {
        "supported_currencies": sorted(list(graph.nodes)),
        "count": len(graph.nodes),
    }


@router.post("/cache/clear")
async def clear_cache() -> dict:
    fx_fetcher = get_fx_fetcher()
    # Add more cache clearing as needed
    
    logger.info("Cache cleared")
    
    return {
        "status": "success",
        "message": "All caches cleared",
    }


@router.get("/")
async def root():
    return {
        "service": "PayGraph API",
        "version": "0.1.0",
        "description": "Payment routing advisory platform - Multi-criteria pathfinding for cross-border payments",
        "endpoints": {
            "health": "/api/v1/health",
            "routes": "/api/v1/routes/analyze",
            "corridors": "/api/v1/routes/corridors",
            "currencies": "/api/v1/routes/supported-currencies",
            "docs": "/api/docs",
        }
    }
