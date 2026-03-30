from enum import Enum
from typing import List, Tuple
from dataclasses import dataclass

from .graph import Rail


class ScoringPreference(str, Enum):
    CHEAPEST = "cheapest"
    FASTEST = "fastest"
    BALANCED = "balanced"
    MOST_RELIABLE = "most_reliable"


@dataclass
class RouteScore:
    total_score: float  # 0.0 to 1.0 (lower is better)
    cost_score: float
    time_score: float
    reliability_score: float
    preference: ScoringPreference


class RouteScorer:    
    MAX_TIME_MINUTES = 4320  # 3 days
    MAX_COST_PERCENTAGE = 10.0  # 10% of amount
    
    @classmethod
    def score_route(
        cls,
        rails: List[Rail],
        amount: float,
        preference: ScoringPreference,
    ) -> RouteScore:
        total_cost_usd = sum(rail.calculate_total_cost(amount) for rail in rails)
        total_time_minutes = sum(rail.settlement_minutes for rail in rails)
        avg_reliability = (
            sum(r.reliability_score for r in rails) / len(rails)
            if rails
            else 0.5
        )
        
        return cls._calculate_score(
            total_cost_usd=total_cost_usd,
            amount=amount,
            total_time_minutes=total_time_minutes,
            avg_reliability=avg_reliability,
            preference=preference,
        )
    
    @classmethod
    def score_single_rail(
        cls,
        rail: Rail,
        amount: float,
        preference: ScoringPreference,
    ) -> RouteScore:
        return cls.score_route([rail], amount, preference)
    
    @classmethod
    def _calculate_score(
        cls,
        total_cost_usd: float,
        amount: float,
        total_time_minutes: int,
        avg_reliability: float,
        preference: ScoringPreference,
    ) -> RouteScore:
        cost_percentage = min(
            (total_cost_usd / amount) * 100 if amount > 0 else 100,
            cls.MAX_COST_PERCENTAGE,
        )
        cost_score = cost_percentage / cls.MAX_COST_PERCENTAGE
        
        # Normalize time (0-1, where 1 = MAX_TIME_MINUTES)
        time_score = min(total_time_minutes, cls.MAX_TIME_MINUTES) / cls.MAX_TIME_MINUTES
        
        # Reliability is already 0-1, invert it (1 = good, 0 = bad)
        # For scoring, we want high reliability to lower the score
        reliability_penalty = (1.0 - avg_reliability) * 0.1  # Max 10% penalty
        
        # Calculate weighted score based on preference
        if preference == ScoringPreference.CHEAPEST:
            weighted_score = (0.75 * cost_score) + (0.15 * time_score) + (0.1 * reliability_penalty)
        elif preference == ScoringPreference.FASTEST:
            weighted_score = (0.15 * cost_score) + (0.75 * time_score) + (0.1 * reliability_penalty)
        elif preference == ScoringPreference.MOST_RELIABLE:
            weighted_score = (0.25 * cost_score) + (0.25 * time_score) + (0.5 * reliability_penalty)
        else:  # BALANCED
            weighted_score = (0.4 * cost_score) + (0.4 * time_score) + (0.2 * reliability_penalty)
        
        return RouteScore(
            total_score=weighted_score,
            cost_score=cost_score,
            time_score=time_score,
            reliability_score=avg_reliability,
            preference=preference,
        )
    
    @classmethod
    def rank_routes(
        cls,
        routes: List[List[Rail]],
        amount: float,
        preference: ScoringPreference,
    ) -> List[Tuple[List[Rail], RouteScore]]:
        scored = [
            (route, cls.score_route(route, amount, preference))
            for route in routes
        ]
        # Sort by total_score ascending (lower is better)
        return sorted(scored, key=lambda x: x[1].total_score)
