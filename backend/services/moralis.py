from __future__ import annotations

import logging
import httpx

from config import MORALIS_API_KEY, MORALIS_BASE_URL, CHAIN

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
            # Count how many pair addresses are in response
            count = 1 if data.get("pairAddress") else 0
            return {
                "pair_address_count": count,
                "api_response": data,
            }
        else:
            raise Exception(f"API error {resp.status_code}: {resp.text[:200]}")
            
    except Exception as exc:
        raise Exception(f"Failed to fetch pair data: {str(exc)}")
