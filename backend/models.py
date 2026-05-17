from __future__ import annotations
from typing import Optional, Any
from pydantic import BaseModel


class Token(BaseModel):
    symbol: str
    address: str
    decimals: int
    logo_url: Optional[str] = None


class TokensResponse(BaseModel):
    tokens: list[Token]


class PairResponse(BaseModel):
    pair_address_count: int
    api_response: dict[str, Any]

