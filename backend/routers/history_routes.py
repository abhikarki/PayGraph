from fastapi import APIRouter, HTTPException, Query
from storage.history import get_history, count_snapshots_last_hour
from models import HistoryOut
from config import PAIRS, pair_id

router = APIRouter(prefix="/history", tags=["history"])


def _pair_map() -> dict[str, tuple[str, str]]:
    return {
        pair_id(p): p.pair_address
        for p in PAIRS
        if p.pair_address
    }


@router.get("/{pid}", response_model=HistoryOut)
async def pair_history(
    pid: str,
    hours: int = Query(72, ge=1, le=72, description="Lookback window in hours (max 72)"),
) -> HistoryOut:
    pm = _pair_map()
    if pid not in pm:
        raise HTTPException(
            404,
            f"Unknown pair '{pid}'. Available: {sorted(pm.keys())}",
        )

    snapshots = await get_history(pid, hours)
    return HistoryOut(
        pair_id=pid,
        pair_address=pm[pid] or "",
        snapshots=snapshots,
    )


@router.get("", response_model=list[str])
async def list_pairs() -> list[str]:
    return sorted(_pair_map().keys())