from __future__ import annotations
from typing import Optional, Any
from pydantic import BaseModel
from datetime import datetime


class Token(BaseModel):
    symbol: str
    address: str
    decimals: int
    logo_url: Optional[str] = None


class Metrics(BaseModel):
    liquidity_score: float
    estimated_slippage_1pct: float
    price_impact_1pct: float


class TokensResponse(BaseModel):
    tokens: list[Token]


class PairResponse(BaseModel):
    pair_address_count: int
    api_response: dict[str, Any]
    metrics: Metrics


class PairData(BaseModel):
    pair_id: str
    token0: str
    token1: str
    pair_address_count: int
    api_response: dict[str, Any]
    metrics: Metrics


class AllPairsResponse(BaseModel):
    timestamp: datetime
    pairs: list[PairData]

