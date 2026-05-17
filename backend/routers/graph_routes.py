from fastapi import APIRouter
from graph.builder import get_graph_out
from models import GraphOut

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("", response_model=GraphOut)
async def graph_state() -> GraphOut:
    return get_graph_out()