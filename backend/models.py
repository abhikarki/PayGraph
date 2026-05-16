from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TokenMeta(BaseModel):
    address: str
    name: str
    symbol: str
    decimals: int
    logo: Optional[str] = None


class PairAddressResponse(BaseModel):
    token0: TokenMeta
    token1: TokenMeta
    pairAddress: str
    exchange: str
    exchangeAddress: Optional[str] = None
    exchangeLogo: Optional[str] = None


class PriceChanges(BaseModel):
    field_5min: float = Field(0, alias="5min")
    field_1h: float = Field(0, alias="1h")
    field_4h: float = Field(0, alias="4h")
    field_24h: float = Field(0, alias="24h")

    class Config:
        populate_by_name = True


class PairStatsResponse(BaseModel):
    pairAddress: Optional[str] = None
    pairLabel: Optional[str] = None
    exchange: Optional[str] = None
    exchangeAddress: Optional[str] = None
    currentUsdPrice: Optional[str] = None
    currentNativePrice: Optional[str] = None
    totalLiquidityUsd: Optional[str] = None
    pricePercentChange: Optional[PriceChanges] = None
    liquidityPercentChange: Optional[PriceChanges] = None
    buys: Optional[PriceChanges] = None
    sells: Optional[PriceChanges] = None
    totalVolume: Optional[PriceChanges] = None
    buyVolume: Optional[PriceChanges] = None
    sellVolume: Optional[PriceChanges] = None
    buyers: Optional[PriceChanges] = None
    sellers: Optional[PriceChanges] = None


class PairSnapshot(BaseModel):
    pair_id: str                       
    pair_address: str
    token0: str
    token1: str
    exchange: str
    timestamp: datetime

    price_usd: float = 0.0
    liquidity_usd: float = 0.0
    volume_1h: float = 0.0
    volume_24h: float = 0.0
    buys_1h: int = 0
    sells_1h: int = 0
    buy_volume_1h: float = 0.0
    sell_volume_1h: float = 0.0
    price_change_1h: float = 0.0
    price_change_24h: float = 0.0

    score: float = 0.0


class NodeOut(BaseModel):
    id: str
    address: str
    decimals: int
    logo_url: str


class EdgeOut(BaseModel):
    source: str
    target: str
    pair_id: str
    pair_address: str
    exchange: str
    price_usd: float
    liquidity_usd: float
    volume_1h: float
    volume_24h: float
    buys_1h: int
    sells_1h: int
    buy_volume_1h: float
    sell_volume_1h: float
    price_change_1h: float
    price_change_24h: float
    score: float
    last_updated: Optional[datetime]


class GraphOut(BaseModel):
    nodes: list[NodeOut]
    edges: list[EdgeOut]
    polled_at: Optional[datetime]


class HopDetail(BaseModel):
    source: str
    target: str
    pair_address: str
    exchange: str
    liquidity_usd: float
    score: float


class RouteOut(BaseModel):
    rank: int
    hops: list[str]
    hop_details: list[HopDetail]
    total_score: float
    total_liquidity_usd: float
    reason: str


class RoutesOut(BaseModel):
    from_token: str
    to_token: str
    optimize: str
    routes: list[RouteOut]
    computed_at: datetime


class SnapshotOut(BaseModel):
    timestamp: datetime
    price_usd: float
    liquidity_usd: float
    volume_1h: float
    buys_1h: int
    sells_1h: int
    score: float


class HistoryOut(BaseModel):
    pair_id: str
    pair_address: str
    snapshots: list[SnapshotOut]


class StatusOut(BaseModel):
    healthy: bool
    last_poll_at: Optional[datetime]
    next_poll_in_seconds: Optional[float]
    pairs_resolved: int
    total_pairs: int
    snapshots_last_hour: int
    api_calls_last_hour: int