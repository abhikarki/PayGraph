"""Pathfinding engine using Dijkstra's algorithm for multi-criteria route optimization."""
import heapq
from typing import List, Dict, Optional, Tuple, Set
from collections import defaultdict

from .graph import PaymentGraph, Rail
from .scorer import RouteScorer, ScoringPreference, RouteScore


class PathFinder:
    
    def __init__(self, graph: PaymentGraph):
        self.graph = graph
    
    def find_best_paths(
        self,
        from_currency: str,
        to_currency: str,
        amount: float,
        preference: ScoringPreference = ScoringPreference.BALANCED,
        max_hops: int = 5,
        num_results: int = 5,
    ) -> List[Tuple[List[Rail], RouteScore]]:
        # Early exit if no path possible
        if not self.graph.has_path(from_currency, to_currency):
            return []
        
        # Find all paths using modified Dijkstra
        all_paths = self._find_all_paths_dijkstra(
            from_currency,
            to_currency,
            amount,
            preference,
            max_hops,
        )
        
        if not all_paths:
            return []
        
        # Score and rank paths
        scored_paths = [
            (path, RouteScorer.score_route(path, amount, preference))
            for path in all_paths
        ]
        
        # Sort by score and return top N
        scored_paths.sort(key=lambda x: x[1].total_score)
        return scored_paths[:num_results]
    
    def find_direct_routes(
        self,
        from_currency: str,
        to_currency: str,
        amount: float,
        preference: ScoringPreference = ScoringPreference.BALANCED,
    ) -> List[Tuple[Rail, RouteScore]]:
        direct_rails = self.graph.get_direct_rails(from_currency, to_currency)
        
        scored = [
            (rail, RouteScorer.score_single_rail(rail, amount, preference))
            for rail in direct_rails
        ]
        
        # Sort by score
        scored.sort(key=lambda x: x[1].total_score)
        return scored
    
    def _find_all_paths_dijkstra(
        self,
        start: str,
        end: str,
        amount: float,
        preference: ScoringPreference,
        max_hops: int,
    ) -> List[List[Rail]]:
        # Priority queue: (score, hop_count, current_currency, path)
        pq: List[Tuple[float, int, str, List[Rail]]] = [
            (0.0, 0, start, [])
        ]
        
        # Track visited states to avoid infinite loops: (currency, tuple(rail_names))
        visited: Set[Tuple[str, Tuple[str, ...]]] = set()
        
        found_paths: List[List[Rail]] = []
        
        while pq and len(found_paths) < 10:  # Find up to 10 paths
            score, hops, current, path = heapq.heappop(pq)
            
            # Check if we reached destination
            if current == end:
                found_paths.append(path)
                continue
            
            # Prevent infinite loops
            path_signature = tuple(r.name.value for r in path)
            state = (current, path_signature)
            if state in visited:
                continue
            visited.add(state)
            
            # Stop if max hops exceeded
            if hops >= max_hops:
                continue
            
            # Explore neighbors
            for rail in self.graph.get_rails(current):
                new_path = path + [rail]
                new_score = float(RouteScorer.score_route(
                    new_path,
                    amount,
                    preference,
                ).total_score)
                
                heapq.heappush(
                    pq,
                    (new_score, hops + 1, rail.to_currency, new_path)
                )
        
        return found_paths
    
    def estimate_route_metrics(
        self,
        path: List[Rail],
        amount: float,
    ) -> Dict:
        if not path:
            return {}
        
        total_cost = sum(rail.calculate_total_cost(amount) for rail in path)
        total_time = sum(rail.settlement_minutes for rail in path)
        avg_reliability = sum(r.reliability_score for r in path) / len(path)
        
        return {
            "total_cost_usd": total_cost,
            "cost_percentage": (total_cost / amount * 100) if amount > 0 else 0,
            "settlement_minutes": total_time,
            "average_reliability": avg_reliability,
            "num_hops": len(path),
            "rails": [rail.name.value for rail in path],
        }
