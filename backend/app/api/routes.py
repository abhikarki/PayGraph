import logging
import uuid
from datetime import datetime
from typing import Optional

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
from app.services.rate_fetcher import RateFetcher
from app.services.cost_calculator import CostCalculator
from app.services.routing_engine import RoutingEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["payment-routing"])

_rate_fetcher: Optional[RateFetcher] = None
_cost_calculator = CostCalculator()
_routing_engine = RoutingEngine()


def get_rate_fetcher() -> RateFetcher:
    # Dependency injection for rate fetcher
    global _rate_fetcher
    if _rate_fetcher is None:
        settings = get_settings()
        _rate_fetcher = RateFetcher(
            open_exchange_rates_key=settings.open_exchange_rates_api_key,
            cache_ttl=settings.fx_rate_cache_ttl,
            gas_cache_ttl=settings.gas_price_cache_ttl
        )
    return _rate_fetcher


@router.get("/health", response_model=HealthCheckResponse)
async def health_check() -> HealthCheckResponse:
    settings = get_settings()
    
    return HealthCheckResponse(
        status="healthy",
        version="0.1.0",
        services={
            "rate_fetcher": "operational",
            "cost_calculator": "operational",
            "routing_engine": "operational",
            "database": "operational",
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
    rate_fetcher: RateFetcher = Depends(get_rate_fetcher)
) -> PaymentIntentResponse:
    
    request_id = str(uuid.uuid4())
    intent_id = f"intent_{request_id}"
    
    logger.info(
        f"[{request_id}] Analyzing route: {request.source_currency} → "
        f"{request.destination_currency} ({request.destination_country}) | "
        f"Amount: {request.amount}"
    )
    
    try:
        # Fetch current FX rates
        logger.debug(f"[{request_id}] Fetching FX rates")
        fx_rates = await rate_fetcher.get_fx_rates(base=request.source_currency)
        
        if request.destination_currency not in fx_rates:
            raise ValueError(f"Currency {request.destination_currency} not supported")
        
        fx_rate = fx_rates[request.destination_currency]
        logger.debug(f"[{request_id}] FX Rate: 1 {request.source_currency} = {fx_rate} {request.destination_currency}")

        # Calculate costs for each available method
        available_methods = {}
        
        # ACH
        if request.source_currency == "USD" and request.destination_country == "US":
            available_methods["ACH"] = _cost_calculator.calculate_ach_cost(request.amount)
        
        # International Wire
        if request.source_currency == "USD":
            available_methods["Wire"] = _cost_calculator.calculate_international_wire_cost(
                request.amount,
                request.destination_country
            )
        
        # Wise 
        available_methods["Wise"] = _cost_calculator.calculate_wise_cost(
            request.amount,
            request.source_currency,
            request.destination_currency
        )
        
        # Stablecoin routes 
        if get_settings().enable_stablecoin_routes:
            available_methods["USDC_Solana"] = _cost_calculator.calculate_stablecoin_cost(
                request.amount,
                request.source_currency,
                request.destination_currency,
                network="solana",
                fx_rate=fx_rate
            )
            available_methods["USDC_Polygon"] = _cost_calculator.calculate_stablecoin_cost(
                request.amount,
                request.source_currency,
                request.destination_currency,
                network="polygon",
                fx_rate=fx_rate
            )

        # Analyze routes
        logger.debug(f"[{request_id}] Analyzing {len(available_methods)} methods")
        
        analyzed_routes = _routing_engine.analyze_routes(
            source_currency=request.source_currency.value,
            destination_currency=request.destination_currency.value,
            destination_country=request.destination_country,
            amount=request.amount,
            available_methods=available_methods,
            constraints={
                "max_cost_percentage": request.constraints.max_cost_percentage if request.constraints else None,
                "max_time_minutes": request.constraints.max_time_minutes if request.constraints else None,
                "min_reliability_score": request.constraints.min_reliability_score if request.constraints else None,
            } if request.constraints else None
        )

        # Convert to response objects
        route_options = []
        for idx, route in enumerate(analyzed_routes, 1):
            destination_amount = route["destination_amount"]
            
            route_option = RouteOption(
                route_id=f"route_{request_id}_{idx}",
                route_type=route["route_type"],
                provider=route["provider"],
                cost=RouteCost(
                    provider_fee=route["cost"].get("provider_fee", 0),
                    fx_spread=route["cost"].get("fx_spread", 0),
                    network_fee=route["cost"].get("network_fee", 0),
                    off_ramp_cost=route["cost"].get("off_ramp_cost", 0),
                    total_cost=route["cost"].get("total_cost", 0),
                    effective_rate=_cost_calculator.calculate_effective_rate(
                        request.amount,
                        destination_amount,
                        fx_rate
                    )
                ),
                cost_rank=route.get("cost_rank", idx),
                estimated_time_minutes=route["estimated_time_minutes"],
                time_rank=route.get("speed_rank", idx),
                reliability_score=route["reliability_score"],
                success_rank=route.get("reliability_rank", idx),
                overall_rank=route.get("overall_rank", idx),
                steps=route.get("steps", []),
                warnings=route.get("warnings", [])
            )
            route_options.append(route_option)

        # Determine best options
        cheapest = min(route_options, key=lambda r: r.cost.total_cost, default=None)
        fastest = min(route_options, key=lambda r: r.estimated_time_minutes, default=None)
        best = route_options[0] if route_options else None

        logger.info(
            f"[{request_id}] Analysis complete: {len(route_options)} routes returned | "
            f"Cheapest: {cheapest.provider if cheapest else 'N/A'} | "
            f"Fastest: {fastest.provider if fastest else 'N/A'}"
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
                    "currency": request.destination_currency
                }
                for r in route_options
            ]
        )

    except ValueError as e:
        logger.error(f"[{request_id}] Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"[{request_id}] Unexpected error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/routes/corridors")
async def get_supported_corridors():
    corridors = _routing_engine.supported_corridors
    
    return {
        "supported_corridors": len(corridors),
        "corridors": corridors
    }


@router.post("/cache/clear")
async def clear_cache() -> dict:
    rate_fetcher = get_rate_fetcher()
    rate_fetcher.clear_cache()
    
    logger.info("Cache cleared")
    
    return {
        "status": "success",
        "message": "All caches cleared"
    }


@router.get("/")
async def root():
    return {
        "service": "PayGraph API",
        "version": "0.1.0",
        "description": "Payment routing advisory platform",
        "endpoints": {
            "health": "/api/v1/health",
            "analyze_routes": "POST /api/v1/routes/analyze",
            "supported_corridors": "/api/v1/routes/corridors",
        }
    }
