from fastapi import APIRouter
from config import TOKENS
from models import Token, TokensResponse

router = APIRouter(prefix="/tokens", tags=["tokens"])


@router.get("", response_model=TokensResponse)
async def get_tokens():
    tokens = [
        Token(
            symbol=token.symbol,
            address=token.address,
            decimals=token.decimals,
            logo_url=token.logo_url,
        )
        for token in TOKENS.values()
    ]
    return TokensResponse(tokens=tokens)
