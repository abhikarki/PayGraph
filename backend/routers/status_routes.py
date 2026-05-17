from fastapi import APIRouter
from models import StatusOut
from services import poller
from services.moralis import api_calls_last_hour
from storage.history import count_snapshots_last_hour

router = APIRouter(prefix="/status", tags=["status"])


@router.get("", response_model=StatusOut)
async def status() -> StatusOut:
    info = poller.status_info()
    snaps = await count_snapshots_last_hour()
    return StatusOut(
        healthy=True,
        last_poll_at=info["last_poll_at"],
        next_poll_in_seconds=info["next_poll_in_seconds"],
        pairs_resolved=info["pairs_resolved"],
        total_pairs=info["total_pairs"],
        snapshots_last_hour=snaps,
        api_calls_last_hour=api_calls_last_hour(),
    )