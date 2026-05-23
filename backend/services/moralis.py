from __future__ import annotations

import logging
import httpx
import asyncio
from time import time

from config import MORALIS_API_KEY, MORALIS_BASE_URL, CHAIN
from services.metrics import calculate_pair_metrics

logger = logging.getLogger(__name__)


async def get_pair_data(
    token0_address: str,
    token1_address: str,
    chain: str = CHAIN,
) -> dict:
    url = f"{MORALIS_BASE_URL}/{token0_address}/{token1_address}/pairAddress"
    params = {"chain": chain}
    headers = {"X-API-Key": MORALIS_API_KEY, "Accept": "application/json"}
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params, headers=headers)
        
        if resp.status_code == 200:
            data = resp.json()
            logger.info(f"Moralis API response keys: {data.keys()}")
            logger.info(f"Token0 keys: {data.get('token0', {}).keys() if data.get('token0') else 'None'}")
            logger.info(f"Token1 keys: {data.get('token1', {}).keys() if data.get('token1') else 'None'}")
            logger.info(f"Reserve0: {data.get('reserve0')}, Reserve1: {data.get('reserve1')}")
            # Count how many pair addresses are in response
            count = 1 if data.get("pairAddress") else 0
            
            # Calculate metrics from the API response
            metrics = calculate_pair_metrics(data)
            
            return {
                "pair_address_count": count,
                "api_response": data,
                "metrics": metrics,
            }
        else:
            raise Exception(f"API error {resp.status_code}: {resp.text[:200]}")
            
    except Exception as exc:
        raise Exception(f"Failed to fetch pair data: {str(exc)}")


async def get_all_pairs_data(pairs: list) -> list[dict]:
    # Fetch data for all pairs with rate limiting (max 7 calls per second).
    # Calls Moralis API sequentially for each pair, maintaining rate limit.    
    from config import TOKENS
    
    results = []
    max_calls_per_second = 7
    min_delay_between_calls = 1.0 / max_calls_per_second  # ~143ms
    
    last_call_time = 0
    
    for pair_config in pairs:
        try:
            # Rate limiting: ensure minimum delay between calls
            elapsed = time() - last_call_time
            if elapsed < min_delay_between_calls:
                await asyncio.sleep(min_delay_between_calls - elapsed)
            
            last_call_time = time()
            
            token0 = TOKENS.get(pair_config.token0)
            token1 = TOKENS.get(pair_config.token1)
            
            if not token0 or not token1:
                logger.warning(f"Token not found for pair {pair_config.token0}-{pair_config.token1}")
                continue
            
            result = await get_pair_data(token0.address, token1.address)
            
            results.append({
                "pair_id": f"{pair_config.token0}-{pair_config.token1}",
                "token0": pair_config.token0,
                "token1": pair_config.token1,
                "pair_address_count": result["pair_address_count"],
                "api_response": result["api_response"],
                "metrics": result["metrics"],
            })
            
            logger.info(f"Fetched data for {pair_config.token0}-{pair_config.token1}")
            
        except Exception as exc:
            logger.error(f"Failed to fetch pair {pair_config.token0}-{pair_config.token1}: {str(exc)}")
            # Continue with next pair instead of failing
            continue
    
    return results
