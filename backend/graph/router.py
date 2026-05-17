from __future__ import annotations

import logging
from datetime import datetime, timezone

import networkx as nx

from graph import builder
from graph.scorer import score_reason
from models import RouteOut, RoutesOut, HopDetail

logger = logging.getLogger(__name__)

MAX_HOPS = 3

def find_routes(
        from_token: str,
        to_token: str,
        optimize: str = "balanced",
        top_k: int = 3,
) -> RoutesOut:
    G = builder.G

    if from_token not in G:
        raise ValueError(f"Token '{from_token}' not in graph")
    if to_token not in G:
        raise ValueError(f"Token '{to_token}' not in graph")
 
    # all_simple_paths cutoff = number of EDGES, i.e. hops
    raw_paths = list(
        nx.all_simple_paths(G, source=from_token, target=to_token, cutoff=MAX_HOPS)
    )
 
    if not raw_paths:
        return RoutesOut(
            from_token=from_token,
            to_token=to_token,
            optimize=optimize,
            routes=[],
            computed_at=datetime.now(timezone.utc),
        )
 
    scored: list[tuple[float, list[str]]] = []
    for path in raw_paths:
        total_score = 0.0
        valid = True
        for i in range(len(path) - 1):
            edge_data = G.get_edge_data(path[i], path[i + 1])
            if edge_data is None:
                valid = False
                break
            total_score += edge_data.get("score", 999.0)
        if valid:
            scored.append((total_score, path))
 
    # sort ascending by score (lower is better)
    scored.sort(key=lambda x: x[0])
    top = scored[:top_k]
 
    routes: list[RouteOut] = []
    for rank, (total_score, path) in enumerate(top, start=1):
        hop_details: list[HopDetail] = []
        min_liquidity = float("inf")
        total_buys = 0
        total_sells = 0
 
        for i in range(len(path) - 1):
            edge_data = G.get_edge_data(path[i], path[i + 1]) or {}
            liq = edge_data.get("liquidity_usd", 0.0)
            min_liquidity = min(min_liquidity, liq)
            total_buys += edge_data.get("buys_1h", 0)
            total_sells += edge_data.get("sells_1h", 0)
            hop_details.append(
                HopDetail(
                    source=path[i],
                    target=path[i + 1],
                    pair_address=edge_data.get("pair_address", ""),
                    exchange=edge_data.get("exchange", ""),
                    liquidity_usd=liq,
                    score=edge_data.get("score", 0.0),
                )
            )
 
        if min_liquidity == float("inf"):
            min_liquidity = 0.0
 
        reason = score_reason(optimize, min_liquidity, total_buys, total_sells)
 
        routes.append(
            RouteOut(
                rank=rank,
                hops=path,
                hop_details=hop_details,
                total_score=round(total_score, 6),
                total_liquidity_usd=min_liquidity,
                reason=reason,
            )
        )
 
    return RoutesOut(
        from_token=from_token,
        to_token=to_token,
        optimize=optimize,
        routes=routes,
        computed_at=datetime.now(timezone.utc),
    )
 
