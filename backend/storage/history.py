from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import aiosqlite

from config import HISTORY_RETENTION_HOURS
from models import PairSnapshot, SnapshotOut

logger = logging.getLogger(__name__)
DB_PATH = "history.db"


CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS pair_snapshots (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    pair_id          TEXT NOT NULL,
    pair_address     TEXT NOT NULL,
    token0           TEXT NOT NULL,
    token1           TEXT NOT NULL,
    exchange         TEXT NOT NULL,
    timestamp        TEXT NOT NULL,
    price_usd        REAL DEFAULT 0,
    liquidity_usd    REAL DEFAULT 0,
    volume_1h        REAL DEFAULT 0,
    volume_24h       REAL DEFAULT 0,
    buys_1h          INTEGER DEFAULT 0,
    sells_1h         INTEGER DEFAULT 0,
    buy_volume_1h    REAL DEFAULT 0,
    sell_volume_1h   REAL DEFAULT 0,
    price_change_1h  REAL DEFAULT 0,
    price_change_24h REAL DEFAULT 0,
    score            REAL DEFAULT 0
);
"""

CREATE_INDEX = """
CREATE INDEX IF NOT EXISTS idx_pair_ts
ON pair_snapshots (pair_id, timestamp);
"""


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_TABLE)
        await db.execute(CREATE_INDEX)
        await db.commit()
    await purge_old_rows()
    logger.info("SQLite history DB initialised at %s", DB_PATH)


async def insert_snapshot(snap: PairSnapshot) -> None:
    sql = """
    INSERT INTO pair_snapshots
        (pair_id, pair_address, token0, token1, exchange, timestamp,
         price_usd, liquidity_usd, volume_1h, volume_24h,
         buys_1h, sells_1h, buy_volume_1h, sell_volume_1h,
         price_change_1h, price_change_24h, score)
    VALUES
        (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            sql,
            (
                snap.pair_id,
                snap.pair_address,
                snap.token0,
                snap.token1,
                snap.exchange,
                snap.timestamp.isoformat(),
                snap.price_usd,
                snap.liquidity_usd,
                snap.volume_1h,
                snap.volume_24h,
                snap.buys_1h,
                snap.sells_1h,
                snap.buy_volume_1h,
                snap.sell_volume_1h,
                snap.price_change_1h,
                snap.price_change_24h,
                snap.score,
            ),
        )
        await db.commit()


async def get_history(
    pair_id: str,
    hours: int = 72,
) -> list[SnapshotOut]:
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    sql = """
    SELECT timestamp, price_usd, liquidity_usd, volume_1h,
           buys_1h, sells_1h, score
    FROM pair_snapshots
    WHERE pair_id = ? AND timestamp >= ?
    ORDER BY timestamp ASC
    """
    rows = []
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(sql, (pair_id, cutoff)) as cursor:
            async for row in cursor:
                rows.append(
                    SnapshotOut(
                        timestamp=datetime.fromisoformat(row[0]),
                        price_usd=row[1],
                        liquidity_usd=row[2],
                        volume_1h=row[3],
                        buys_1h=row[4],
                        sells_1h=row[5],
                        score=row[6],
                    )
                )
    return rows


async def count_snapshots_last_hour() -> int:
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT COUNT(*) FROM pair_snapshots WHERE timestamp >= ?", (cutoff,)
        ) as cursor:
            row = await cursor.fetchone()
            return row[0] if row else 0



async def purge_old_rows() -> None:
    cutoff = (
        datetime.now(timezone.utc) - timedelta(hours=HISTORY_RETENTION_HOURS)
    ).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        result = await db.execute(
            "DELETE FROM pair_snapshots WHERE timestamp < ?", (cutoff,)
        )
        await db.commit()
        logger.info("Purged %d old snapshot rows", result.rowcount)