from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import networkx as nx

from config import TOKENS, PAIRS, PairConfig
from models import PairSnapshot, NodeOut, EdgeOut, GraphOut
from graph.scorer import compute_score

logger = logging.getLogger(__name__)

# shared graph instance
G: nx.DiGraph = nx.DiGraph()
_last_updated: Optional[datetime] = None

def init_graph() -> None:
    # adding all token nodes. once on startup
    for symbol, token in TOKENS.items():
        G.add_node(
            symbol,
            address=token.address,
            decimals=token.decimals,
            logo_url=token.logo_url,
        )
    logger.info("Graph initialised with %d token nodes", G.number_of_nodes())


def update_edge(snap: PairSnapshot) -> None:
    # update edges with fresh data. 
    global _last_updated
    attrs = {
         "pair_id": snap.pair_id,
        "pair_address": snap.pair_address,
        "exchange": snap.exchange,
        "price_usd": snap.price_usd,
        "liquidity_usd": snap.liquidity_usd,
        "volume_1h": snap.volume_1h,
        "volume_24h": snap.volume_24h,
        "buys_1h": snap.buys_1h,
        "sells_1h": snap.sells_1h,
        "buy_volume_1h": snap.buy_volume_1h,
        "sell_volume_1h": snap.sell_volume_1h,
        "price_change_1h": snap.price_change_1h,
        "price_change_24h": snap.price_change_24h,
        "score": snap.score,
        "last_updated": snap.timestamp,
    }
    #forward edge
    G.add_edge(snap.token0, snap.token1, **attrs)
    #reverse edge with same metrics
    G.add_edge(snap.token1, snap.token0, **attrs)
    _last_updated = datetime.now(timezone.utc)

#Serialization
def get_graph_out() -> GraphOut:
    nodes = [
        NodeOut(
            id=sym,
            address=data.get("address", ""),
            decimals=data.get("decimals", 18),
            logo_url=data.get("logo_url", ""),
        )
        for sym, data in G.nodes(data=True)
    ]
 
    seen_pairs: set[str] = set()
    edges: list[EdgeOut] = []
    for u, v, data in G.edges(data=True):
        pid = data.get("pair_id", f"{u}-{v}")
        # Only emit one EdgeOut per physical pair (graph has both directions)
        if pid in seen_pairs:
            continue
        seen_pairs.add(pid)
        edges.append(
            EdgeOut(
                source=u,
                target=v,
                pair_id=pid,
                pair_address=data.get("pair_address", ""),
                exchange=data.get("exchange", ""),
                price_usd=data.get("price_usd", 0.0),
                liquidity_usd=data.get("liquidity_usd", 0.0),
                volume_1h=data.get("volume_1h", 0.0),
                volume_24h=data.get("volume_24h", 0.0),
                buys_1h=data.get("buys_1h", 0),
                sells_1h=data.get("sells_1h", 0),
                buy_volume_1h=data.get("buy_volume_1h", 0.0),
                sell_volume_1h=data.get("sell_volume_1h", 0.0),
                price_change_1h=data.get("price_change_1h", 0.0),
                price_change_24h=data.get("price_change_24h", 0.0),
                score=data.get("score", 0.0),
                last_updated=data.get("last_updated"),
            )
        )
 
    return GraphOut(nodes=nodes, edges=edges, polled_at=_last_updated)

def last_updated() -> Optional[datetime]:
    return _last_updated