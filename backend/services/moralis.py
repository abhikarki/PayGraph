from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional

import httpx

from config import MORALIS_API_KEY, MORALIS_BASE_URL, CHAIN
from models import PairAddressResponse, PairStatsResponse

logger = logging.getLogger(__name__)

_api_call_timestamps: list[float] = []

def _record_call() -> None:
    now = time.time()
    _api_call_timestamps.append(now)

    cutoff = now - 3600
    while _api_call_timestamps and _api_call_timestamps[0] < cutoff:
        _api_call_timestamps.pop(0)
    

def api_calls_last_hour() -> int:
    cutoff = time.time() - 3600
    return sum(1 for t in _api_call_timestamps if t >= cutoff)

async def get_pair_address(
        token0_address: str,
        token1_address: str,
        chain: str = CHAIN,
        retries: int = 3,
) -> Optional[PairAddressResponse]:      
       url = f"{MORALIS_BASE_URL}/{token0_address}/{token1_address}/pairAddress"
       params = {"chain": chain}
       return await _get(url, params, PairAddressResponse, retries)

    
async def get_pair_stats(
    pair_address: str,
    chain: str = CHAIN,
    retries: int = 3,
) -> Optional[PairStatsResponse]:
    url = f"{MORALIS_BASE_URL}/pairs/{pair_address}/stats"
    params = {"chain": chain}
    return await _get(url, params, PairStatsResponse, retries)

async def _get(
    url: str,
    params: dict,
    model_cls,
    retries: int,
):
    headers = {"X-API-Key": MORALIS_API_KEY, "Accept": "application/json"}
    delay = 1.0
    for attempt in range(retries):
        try:
            _record_call()
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                return model_cls.model_validate(resp.json())
            if resp.status_code == 429:
                # Rate limited — back off
                wait = delay * (2 ** attempt)
                logger.warning("Rate limited by Moralis, waiting %.1fs", wait)
                await asyncio.sleep(wait)
                continue
            logger.error(
                "Moralis %s returned HTTP %s: %s",
                url,
                resp.status_code,
                resp.text[:200],
            )
            return None
        except httpx.RequestError as exc:
            logger.error("Network error calling %s: %s", url, exc)
            await asyncio.sleep(delay)
    logger.error("All %d retries exhausted for %s", retries, url)
    return None
 