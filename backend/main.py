from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import httpx
import os
from decimal import Decimal
import math
from datetime import datetime

app = FastAPI(title="PayGraph Routing Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MORALIS_API_KEY = os.getenv("MORALIS_API_KEY")
if not MORALIS_API_KEY:
    raise ValueError("MORALIS_API_KEY not found in environment variables")

MORALIS_BASE_URL = "https://api.moralis.com/api/v2"
MIN_LIQUIDITY_USD = 10000

TOKENS = {
    "USDC": {
        "address": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        "decimals": 6,
        "symbol": "USDC"
    },
    "XSGD": {
        "address": "0xDC3326e71D45186F113a2F448984CA0e8D201995",
        "decimals": 6,
        "symbol": "XSGD"
    },
    "WETH": {
        "address": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
        "decimals": 18,
        "symbol": "WETH"
    }
}


class PoolData(BaseModel):
    pool_address: str
    token_in_address: str
    token_out_address: str
    token_in_symbol: str
    token_out_symbol: str
    reserve_in: float
    reserve_out: float
    liquidity_usd: float
    fee_tier: float  # 0.3% for Uniswap V2
    dex: str
    volume_24h: Optional[float] = None

class TradeCalculation(BaseModel):
    input_amount: float
    output_amount: float
    slippage_percent: float
    price_impact_percent: float
    dex_fee_usd: float
    gas_cost_usd: float
    total_cost_usd: float
    effective_price: float

class RouteStep(BaseModel):
    step_number: int
    pool: PoolData
    trade: TradeCalculation

class Quote(BaseModel):
    token_in: str
    token_out: str
    amount_in: float
    paths: List[Dict]  
    best_path_index: int
    timestamp: str

class QuoteRequest(BaseModel):
    token_in: str
    token_out: str
    amount_in: float
    chain: str = "polygon"



async def get_token_pairs(token_address: str, chain: str = "polygon"):
    """Fetch all pairs for a given token from Moralis API"""
    url = f"{MORALIS_BASE_URL}/erc20/{token_address}/pairs"
    headers = {
        "X-API-Key": MORALIS_API_KEY,
        "Content-Type": "application/json"
    }
    
    params = {
        "chain": chain,
        "limit": 100,
        "exclude_spam": "true"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if not data or "result" not in data:
                raise ValueError(f"Invalid Moralis API response for token {token_address}")
            
            return data.get("result", [])
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Moralis API error: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch pairs from Moralis: {str(e)}"
            )


async def discover_and_rank_pools(token_in_address: str, token_out_address: str, chain: str = "polygon") -> List[PoolData]:    
    token_in_pairs = await get_token_pairs(token_in_address, chain)
    token_out_pairs = await get_token_pairs(token_out_address, chain)
    
    relevant_pools = []
    
    for pair in token_in_pairs:
        pair_address = pair.get("pair_address", "").lower()
        token0 = pair.get("token0", {}).get("address", "").lower()
        token1 = pair.get("token1", {}).get("address", "").lower()
        
        if (token0 == token_in_address.lower() or token1 == token_in_address.lower()) and \
           (token0 == token_out_address.lower() or token1 == token_out_address.lower()):
            
            liquidity_usd = float(pair.get("liquidity_usd", 0))
            
            if liquidity_usd >= MIN_LIQUIDITY_USD:
                if token0.lower() == token_in_address.lower():
                    reserve_in = float(pair.get("reserve0", 0))
                    reserve_out = float(pair.get("reserve1", 0))
                    token_in_sym = pair.get("token0", {}).get("symbol", "UNKNOWN")
                    token_out_sym = pair.get("token1", {}).get("symbol", "UNKNOWN")
                else:
                    reserve_in = float(pair.get("reserve1", 0))
                    reserve_out = float(pair.get("reserve0", 0))
                    token_in_sym = pair.get("token1", {}).get("symbol", "UNKNOWN")
                    token_out_sym = pair.get("token0", {}).get("symbol", "UNKNOWN")
                
                if reserve_in > 0 and reserve_out > 0:
                    pool = PoolData(
                        pool_address=pair_address,
                        token_in_address=token_in_address.lower(),
                        token_out_address=token_out_address.lower(),
                        token_in_symbol=token_in_sym,
                        token_out_symbol=token_out_sym,
                        reserve_in=reserve_in,
                        reserve_out=reserve_out,
                        liquidity_usd=liquidity_usd,
                        fee_tier=0.3,  # Uniswap V2 standard fee
                        dex=pair.get("dex_name", "Uniswap"),
                        volume_24h=pair.get("volume_24h", None)
                    )
                    relevant_pools.append(pool)
    
    # Sort by 24h volume
    relevant_pools.sort(key=lambda p: p.volume_24h or 0, reverse=True)
    
    return relevant_pools


def calculate_uniswap_v2_output(amount_in: float, reserve_in: float, reserve_out: float, fee: float = 0.3) -> float:
    if reserve_in <= 0 or reserve_out <= 0:
        return 0
    
    amount_in_with_fee = amount_in * (1 - fee / 100)
    denominator = reserve_in + amount_in_with_fee
    output = (amount_in_with_fee * reserve_out) / denominator
    
    return output

def calculate_slippage(amount_in: float, reserve_in: float, reserve_out: float, output: float, fee: float = 0.3) -> tuple:
    spot_price = reserve_out / reserve_in if reserve_in > 0 else 0
    expected_output_without_fee = amount_in * spot_price
    
    if expected_output_without_fee > 0:
        slippage = ((expected_output_without_fee - output) / expected_output_without_fee) * 100
    else:
        slippage = 0
    
    execution_price = output / amount_in if amount_in > 0 else 0
    if spot_price > 0:
        price_impact = ((spot_price - execution_price) / spot_price) * 100
    else:
        price_impact = 0
    
    return slippage, price_impact

def calculate_trade(pool: PoolData, amount_in: float, output_token_usd_price: float, gas_cost_usd: float = 0.5) -> TradeCalculation:
    output_amount = calculate_uniswap_v2_output(amount_in, pool.reserve_in, pool.reserve_out, pool.fee_tier)
    
    if output_amount <= 0:
        raise ValueError(f"Invalid trade calculation: output is {output_amount}")
    
    slippage, price_impact = calculate_slippage(amount_in, pool.reserve_in, pool.reserve_out, output_amount, pool.fee_tier)
    
    dex_fee_usd = (amount_in * pool.fee_tier / 100) * (pool.liquidity_usd / (pool.reserve_in if pool.reserve_in > 0 else 1))
    total_cost_usd = dex_fee_usd + gas_cost_usd
    
    effective_price = output_amount / amount_in if amount_in > 0 else 0
    
    return TradeCalculation(
        input_amount=amount_in,
        output_amount=output_amount,
        slippage_percent=max(0, slippage),
        price_impact_percent=max(0, price_impact),
        dex_fee_usd=dex_fee_usd,
        gas_cost_usd=gas_cost_usd,
        total_cost_usd=total_cost_usd,
        effective_price=effective_price
    )

async def find_intermediate_pools(token_in_address: str, token_intermediate_address: str, chain: str = "polygon") -> List[PoolData]:
    return await discover_and_rank_pools(token_in_address, token_intermediate_address, chain)


@app.post("/quote")
async def get_quote(request: QuoteRequest) -> Quote:    
    if request.token_in not in TOKENS:
        raise HTTPException(status_code=400, detail=f"Unsupported token_in: {request.token_in}")
    if request.token_out not in TOKENS:
        raise HTTPException(status_code=400, detail=f"Unsupported token_out: {request.token_out}")
    if request.amount_in <= 0:
        raise HTTPException(status_code=400, detail="amount_in must be greater than 0")
    
    token_in_address = TOKENS[request.token_in]["address"]
    token_out_address = TOKENS[request.token_out]["address"]
    
    paths = []
    
    try:
        direct_pools = await discover_and_rank_pools(token_in_address, token_out_address, request.chain)
        
        if direct_pools:
            best_direct_pool = direct_pools[0]  # Use highest volume pool
            
            try:
                trade_calc = calculate_trade(best_direct_pool, request.amount_in, 1.0, gas_cost_usd=0.5)
                
                paths.append({
                    "path_type": "DIRECT",
                    "route": [
                        {
                            "step": 1,
                            "token_in": request.token_in,
                            "token_out": request.token_out,
                            "pool_address": best_direct_pool.pool_address,
                            "dex": best_direct_pool.dex,
                            "liquidity_usd": best_direct_pool.liquidity_usd,
                            "input_amount": trade_calc.input_amount,
                            "output_amount": trade_calc.output_amount,
                            "slippage_percent": trade_calc.slippage_percent,
                            "price_impact_percent": trade_calc.price_impact_percent,
                            "dex_fee_usd": trade_calc.dex_fee_usd,
                            "gas_cost_usd": trade_calc.gas_cost_usd,
                        }
                    ],
                    "total_input": request.amount_in,
                    "total_output": trade_calc.output_amount,
                    "total_slippage_percent": trade_calc.slippage_percent,
                    "total_fee_usd": trade_calc.dex_fee_usd,
                    "total_gas_usd": trade_calc.gas_cost_usd,
                    "total_cost_usd": trade_calc.total_cost_usd,
                })
            except Exception as e:
                # Direct path failed, continue to multi-hop
                pass
        
        if "WETH" in TOKENS and request.token_in != "WETH" and request.token_out != "WETH":
            weth_address = TOKENS["WETH"]["address"]
            
            step1_pools = await discover_and_rank_pools(token_in_address, weth_address, request.chain)
            
            if step1_pools:
                step1_pool = step1_pools[0]
                
                try:
                    step1_trade = calculate_trade(step1_pool, request.amount_in, 1.0, gas_cost_usd=0.3)
                    intermediate_amount = step1_trade.output_amount
                    
                    step2_pools = await discover_and_rank_pools(weth_address, token_out_address, request.chain)
                    
                    if step2_pools:
                        step2_pool = step2_pools[0]
                        step2_trade = calculate_trade(step2_pool, intermediate_amount, 1.0, gas_cost_usd=0.2)
                        
                        total_slippage = step1_trade.slippage_percent + step2_trade.slippage_percent
                        total_fee = step1_trade.dex_fee_usd + step2_trade.dex_fee_usd
                        total_gas = step1_trade.gas_cost_usd + step2_trade.gas_cost_usd
                        
                        paths.append({
                            "path_type": "MULTI_HOP",
                            "route": [
                                {
                                    "step": 1,
                                    "token_in": request.token_in,
                                    "token_out": "WETH",
                                    "pool_address": step1_pool.pool_address,
                                    "dex": step1_pool.dex,
                                    "liquidity_usd": step1_pool.liquidity_usd,
                                    "input_amount": step1_trade.input_amount,
                                    "output_amount": step1_trade.output_amount,
                                    "slippage_percent": step1_trade.slippage_percent,
                                    "price_impact_percent": step1_trade.price_impact_percent,
                                    "dex_fee_usd": step1_trade.dex_fee_usd,
                                    "gas_cost_usd": step1_trade.gas_cost_usd,
                                },
                                {
                                    "step": 2,
                                    "token_in": "WETH",
                                    "token_out": request.token_out,
                                    "pool_address": step2_pool.pool_address,
                                    "dex": step2_pool.dex,
                                    "liquidity_usd": step2_pool.liquidity_usd,
                                    "input_amount": step2_trade.input_amount,
                                    "output_amount": step2_trade.output_amount,
                                    "slippage_percent": step2_trade.slippage_percent,
                                    "price_impact_percent": step2_trade.price_impact_percent,
                                    "dex_fee_usd": step2_trade.dex_fee_usd,
                                    "gas_cost_usd": step2_trade.gas_cost_usd,
                                }
                            ],
                            "total_input": request.amount_in,
                            "total_output": step2_trade.output_amount,
                            "total_slippage_percent": total_slippage,
                            "total_fee_usd": total_fee,
                            "total_gas_usd": total_gas,
                            "total_cost_usd": total_fee + total_gas,
                        })
                except Exception as e:
                    pass
        
        if not paths:
            raise HTTPException(
                status_code=404,
                detail=f"No valid routing paths found for {request.token_in} -> {request.token_out}"
            )
        
        best_path_index = 0
        best_output = paths[0]["total_output"]
        
        for i, path in enumerate(paths):
            if path["total_output"] > best_output:
                best_output = path["total_output"]
                best_path_index = i
        
        return Quote(
            token_in=request.token_in,
            token_out=request.token_out,
            amount_in=request.amount_in,
            paths=paths,
            best_path_index=best_path_index,
            timestamp=datetime.utcnow().isoformat()
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate quote: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "moralis_connected": bool(MORALIS_API_KEY)
    }

@app.on_event("startup")
async def startup():
    if not MORALIS_API_KEY:
        print("WARNING: MORALIS_API_KEY environment variable not set")
    print("PayGraph Routing Engine started successfully")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)