from fastapi import APIRouter, HTTPException
from config import TOKENS
from services.moralis import get_pair_data
from models import PairResponse

router = APIRouter(prefix="/pairs", tags=["pairs"])


@router.get("/{token0_symbol}/{token1_symbol}", response_model=PairResponse)
async def get_pair(token0_symbol: str, token1_symbol: str):    
    if token0_symbol not in TOKENS:
        raise HTTPException(400, f"Unknown token: {token0_symbol}")
    if token1_symbol not in TOKENS:
        raise HTTPException(400, f"Unknown token: {token1_symbol}")
    if token0_symbol == token1_symbol:
        raise HTTPException(400, "Tokens must be different")
    
    token0 = TOKENS[token0_symbol]
    token1 = TOKENS[token1_symbol]
    
    try:
        result = await get_pair_data(token0.address, token1.address)
        return PairResponse(
            pair_address_count=result["pair_address_count"],
            api_response=result["api_response"],
        )
    except Exception as exc:
        raise HTTPException(500, str(exc))
