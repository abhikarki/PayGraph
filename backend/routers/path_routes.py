from fastapi import APIRouter, HTTPException, Query
from graph.router import find_routes
from models import RoutesOut

router = APIRouter(prefix="/routes", tags=["routes"])

VALID_TOKENS = None   # lazy-loaded


def _valid_tokens():
    from config import TOKENS
    return set(TOKENS.keys())


@router.get("", response_model=RoutesOut)
async def get_routes(
    from_token: str = Query(..., description="Source token symbol, e.g. WETH"),
    to_token: str = Query(..., description="Destination token symbol, e.g. USDC"),
    optimize: str = Query("balanced", description="One of: liquidity | fees | balanced"),
) -> RoutesOut:
    valid = _valid_tokens()
    if from_token not in valid:
        raise HTTPException(400, f"Unknown token '{from_token}'. Valid: {sorted(valid)}")
    if to_token not in valid:
        raise HTTPException(400, f"Unknown token '{to_token}'. Valid: {sorted(valid)}")
    if from_token == to_token:
        raise HTTPException(400, "from_token and to_token must differ")
    if optimize not in ("liquidity", "fees", "balanced"):
        raise HTTPException(400, "optimize must be one of: liquidity, fees, balanced")

    try:
        result = find_routes(from_token, to_token, optimize)
    except ValueError as exc:
        raise HTTPException(400, str(exc))

    return result