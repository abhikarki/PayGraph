from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from config import PAIRS, TOKENS, POLL_INTERVAL_SECONDS, STAGGER_BETWEEN_CALLS_SECONDS, pair_id
from models import PairSnapshot
from services.moralis import get_pair_address, get_pair_stats
from graph import builder
from graph.scorer import compute_score
from storage.history import insert_snapshot, purge_old_rows
 
logger = logging.getLogger(__name__)
 
_last_poll_at: Optional[datetime] = None
_next_poll_at: Optional[datetime] = None
_pairs_resolved: int = 0
 
 
def status_info() -> dict:
    now = datetime.now(timezone.utc)
    nps = (_next_poll_at - now).total_seconds() if _next_poll_at else None
    return {
        "last_poll_at": _last_poll_at,
        "next_poll_in_seconds": max(nps, 0) if nps is not None else None,
        "pairs_resolved": _pairs_resolved,
        "total_pairs": len(PAIRS),
    }


async def resolve_pair_addresses() -> None:
    global _pairs_resolved
    logger.info("Resolving pair addresses from Moralis (%d pairs)…", len(PAIRS))
    resolved = 0
    for pair in PAIRS:
        t0 = TOKENS[pair.token0]
        t1 = TOKENS[pair.token1]
        result = await get_pair_address(t0.address, t1.address)
        if result:
            pair.pair_address = result.pairAddress
            pair.exchange = result.exchange
            resolved += 1
            logger.info(
                "Resolved %s/%s → %s (%s)",
                pair.token0, pair.token1, result.pairAddress, result.exchange,
            )
        else:
            logger.warning(
                "Could not resolve pair address for %s/%s – will skip in polling",
                pair.token0, pair.token1,
            )
        await asyncio.sleep(STAGGER_BETWEEN_CALLS_SECONDS)
 
    _pairs_resolved = resolved
    logger.info("Pair resolution complete: %d/%d resolved", resolved, len(PAIRS))
 
 
async def polling_loop() -> None:
    global _last_poll_at, _next_poll_at
 
    purge_counter = 0
 
    while True:
        logger.info("Starting poll cycle…")
        await _poll_all_pairs()
        _last_poll_at = datetime.now(timezone.utc)
 
        purge_counter += 1
        if purge_counter >= 1440:  # ~once a day at 1-min cycles
            await purge_old_rows()
            purge_counter = 0
 
        from datetime import timedelta
        _next_poll_at = datetime.now(timezone.utc) + timedelta(seconds=POLL_INTERVAL_SECONDS)
        logger.info("Poll cycle done. Next cycle in %ds", POLL_INTERVAL_SECONDS)
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
 
 
async def _poll_all_pairs() -> None:
    for pair in PAIRS:
        if not pair.pair_address:
            logger.debug("Skipping %s/%s – no pair address", pair.token0, pair.token1)
            continue
 
        stats = await get_pair_stats(pair.pair_address)
        if stats is None:
            logger.warning("No stats returned for %s", pair.pair_address)
            await asyncio.sleep(STAGGER_BETWEEN_CALLS_SECONDS)
            continue
 
        def f(val) -> float:
            try:
                return float(val) if val is not None else 0.0
            except (ValueError, TypeError):
                return 0.0
 
        def i(val) -> int:
            try:
                return int(val) if val is not None else 0
            except (ValueError, TypeError):
                return 0
 
        price = f(stats.currentUsdPrice)
        liquidity = f(stats.totalLiquidityUsd)
        vol_1h = f(stats.totalVolume.field_1h if stats.totalVolume else None)
        vol_24h = f(stats.totalVolume.field_24h if stats.totalVolume else None)
        buys_1h = i(stats.buys.field_1h if stats.buys else None)
        sells_1h = i(stats.sells.field_1h if stats.sells else None)
        buy_vol_1h = f(stats.buyVolume.field_1h if stats.buyVolume else None)
        sell_vol_1h = f(stats.sellVolume.field_1h if stats.sellVolume else None)
        pc_1h = f(stats.pricePercentChange.field_1h if stats.pricePercentChange else None)
        pc_24h = f(stats.pricePercentChange.field_24h if stats.pricePercentChange else None)
 
        score = compute_score(
            liquidity_usd=liquidity,
            volume_1h=vol_1h,
            buys_1h=buys_1h,
            sells_1h=sells_1h,
            buy_volume_1h=buy_vol_1h,
            sell_volume_1h=sell_vol_1h,
        )
 
        snap = PairSnapshot(
            pair_id=pair_id(pair),
            pair_address=pair.pair_address,
            token0=pair.token0,
            token1=pair.token1,
            exchange=pair.exchange,
            timestamp=datetime.now(timezone.utc),
            price_usd=price,
            liquidity_usd=liquidity,
            volume_1h=vol_1h,
            volume_24h=vol_24h,
            buys_1h=buys_1h,
            sells_1h=sells_1h,
            buy_volume_1h=buy_vol_1h,
            sell_volume_1h=sell_vol_1h,
            price_change_1h=pc_1h,
            price_change_24h=pc_24h,
            score=score,
        )
 
        builder.update_edge(snap)
 
        await insert_snapshot(snap)
 
        logger.debug(
            "Updated %s/%s  liq=$%.0f  score=%.4f",
            pair.token0, pair.token1, liquidity, score,
        )
 
        await asyncio.sleep(STAGGER_BETWEEN_CALLS_SECONDS)