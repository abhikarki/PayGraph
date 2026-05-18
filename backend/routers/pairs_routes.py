from fastapi import APIRouter, HTTPException
from datetime import datetime
from config import TOKENS, PAIRS
from services.moralis import get_pair_data, get_all_pairs_data
from models import PairResponse, AllPairsResponse, PairData

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


@router.get("/all", response_model=AllPairsResponse)
async def get_all_pairs():
    try:
        pairs_data = await get_all_pairs_data(PAIRS)
        
        pair_data_objects = [
            PairData(
                pair_id=pd["pair_id"],
                token0=pd["token0"],
                token1=pd["token1"],
                pair_address_count=pd["pair_address_count"],
                api_response=pd["api_response"],
            )
            for pd in pairs_data
        ]
        
        return AllPairsResponse(
            timestamp=datetime.now(),
            pairs=pair_data_objects,
        )
    except Exception as exc:
        raise HTTPException(500, f"Failed to fetch all pairs: {str(exc)}")
