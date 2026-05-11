from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Tuple
import httpx
import asyncio
from datetime import datetime
import heapq
from decimal import Decimal

app = FastAPI(title = "PayGraph Routing Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)

class Token(BaseModel):
    address: str
    symbol: str
    decimals: int
    price_usd: float

class LiquidityPool(BaseModel):
    address: str
    token_in: Token
    token_out: Token
    reserve_in: float
    reserve_out: float
    fee: float
    dex: str
    chain: str

class RouteEdge(BaseModel):
    pool: LiquidityPool
    input_amount: float
    output_amount: float
    slippage_percent: float
    fee_cost_usd: float
    gas_cost_usd: float
    total_cost_usd: float
    impact_percent: float

class Route(BaseModel):
    edges: List[RouteEdge]
    total_input: float
    expected_output: float
    total_slippage_percent: float
    total_fees_usd: float
    total_gas_usd: float
    total_cost_percent: float
    estimated_time_seconds: int
    reliability_score: float

class RoutingRequest(BaseModel):
    token_in: str
    token_out: str
    amount_in: float
    chain: str = "arbitrum"
    max_hops: int = 3

class DataCollector:
    def __init__(self):
        self.pools: List[LiquidityPool] = []
        self.token_prices: Dict[str, float] = {}

        # Arbitrum tokens
        self.USDC_ARB = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5F86"
        self.BRZA_ARB = "0xbda0b8F0F15d5C2a3d3efCDA24e9f8c6cE9A06A7"  # BRZA on Arbitrum
        self.ETH_ARB = "0x0000000000000000000000000000000000000000"
        self.USDT_ARB = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"

        