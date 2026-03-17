import logging
from typing import List, Dict, Optional
from enum import Enum
import time

logger = logging.getLogger(__name__)


class RoutingStrategy(str, Enum):
    """Available routing strategies"""
    CHEAPEST = "cheapest"
    FASTEST = "fastest"
    MOST_RELIABLE = "most_reliable"
    BALANCED = "balanced"


class RoutingEngine:
    def __init__(self):
        self.supported_corridors = self._initialize_corridors()
        self.corridor_cache = {}

    def _initialize_corridors(self) -> Dict[str, Dict]:
        return {
            # US Domestic
            "US_to_US": {
                "methods": ["ACH", "Wire"],
                "currencies": ["USD"],
                "supported": True
            },
            # US to Brazil
            "US_to_BR": {
                "methods": ["Wire", "Wise", "USDC_Solana", "USDC_Polygon"],
                "currencies": [("USD", "BRL")],
                "supported": True,
                "liquidity_premium": 1.01  # +1% for less liquid corridor
            },
            # US to Europe
            "US_to_EUR": {
                "methods": ["Wire", "SWIFT", "Wise", "USDC_Ethereum"],
                "currencies": [("USD", "EUR")],
                "supported": True,
                "liquidity_premium": 1.0
            },
            # US to India
            "US_to_IN": {
                "methods": ["Wire", "Wise", "USDC_Solana"],
                "currencies": [("USD", "INR")],
                "supported": True,
                "liquidity_premium": 1.02
            },
        }

    def analyze_routes(
        self,
        source_currency: str,
        destination_currency: str,
        destination_country: str,
        amount: float,
        available_methods: Dict[str, Dict],  # Cost data from cost_calculator
        constraints: Optional[Dict] = None
    ) -> List[Dict]:
        logger.info(f"Analyzing routes: {source_currency} to {destination_currency} ({destination_country})")
        
        # Get applicable corridor
        corridor_key = f"{source_currency}_to_{destination_country}"
        corridor = self.supported_corridors.get(corridor_key)
        
        if not corridor or not corridor.get("supported"):
            logger.warning(f"Corridor {corridor_key} not supported")
            return []

        # Build route candidates
        routes = []
        
        for method, cost_data in available_methods.items():
            if method not in corridor.get("methods", []):
                continue
            
            route = self._build_route(
                method=method,
                source_currency=source_currency,
                destination_currency=destination_currency,
                amount=amount,
                cost_data=cost_data,
                corridor_data=corridor
            )
            
            # Apply constraints filter
            if constraints and not self._passes_constraints(route, constraints):
                logger.debug(f"Route {method} filtered out by constraints")
                continue
            
            routes.append(route)

        # Rank routes by multiple criteria
        routes = self._rank_routes(routes)
        
        logger.info(f"Generated {len(routes)} valid routes")
        return routes

    def _build_route(
        self,
        method: str,
        source_currency: str,
        destination_currency: str,
        amount: float,
        cost_data: Dict[str, float],
        corridor_data: Dict
    ) -> Dict:
        total_cost = cost_data.get("total_cost", 0)
        destination_amount = amount - total_cost
        
        # Realistic timing based on method
        timing_map = {
            "ACH": 1440,  # 1 day
            "Wire": 240,  # 4 hours
            "SWIFT": 1440,  # 1 day
            "Wise": 30,  # ~30 minutes
            "USDC_Solana": 5,  # ~5 minutes
            "USDC_Ethereum": 15,  # ~15 minutes
            "USDC_Polygon": 5,  # ~5 minutes
        }
        
        # Reliability scores (0-100)
        reliability_map = {
            "ACH": 98.0,  # Very reliable
            "Wire": 99.0,  # Very reliable
            "SWIFT": 97.0,  # Reliable but slower
            "Wise": 99.5,  # Highly reliable
            "USDC_Solana": 95.0,  # Good but newer
            "USDC_Ethereum": 98.0,  # Good, established
            "USDC_Polygon": 96.0,  # Good
        }
        
        return {
            "method": method,
            "provider": self._get_provider_name(method),
            "source_amount": amount,
            "source_currency": source_currency,
            "destination_amount": destination_amount,
            "destination_currency": destination_currency,
            "cost": cost_data,
            "cost_percentage": (total_cost / amount * 100) if amount > 0 else 0,
            "estimated_time_minutes": timing_map.get(method, 60),
            "reliability_score": reliability_map.get(method, 85.0),
            "steps": self._get_route_steps(method),
            "warnings": self._get_route_warnings(method)
        }

    def _get_provider_name(self, method: str) -> str:
        """Get friendly provider name for method"""
        provider_map = {
            "ACH": "US Banking (ACH)",
            "Wire": "Bank Wire",
            "SWIFT": "International Wire (SWIFT)",
            "Wise": "Wise (Multi-currency Account)",
            "USDC_Solana": "Solana Network (USDC)",
            "USDC_Ethereum": "Ethereum Network (USDC)",
            "USDC_Polygon": "Polygon Network (USDC)",
        }
        return provider_map.get(method, method)

    def _get_route_steps(self, method: str) -> List[str]:
        """Get step-by-step breakdowns for each route"""
        steps_map = {
            "ACH": [
                "Initiate ACH transfer from bank",
                "Funds route through Federal Reserve",
                "Destination bank receives (1-2 business days)"
            ],
            "Wire": [
                "Initiate bank wire transfer",
                "Wire routes through banking network",
                "Destination bank receives (same day - when initiated before cutoff)",
                "Recipient's account credited"
            ],
            "Wise": [
                "Convert source currency to destination at mid-market rate",
                "Wise holds funds in local account",
                "Recipient receives funds in local currency",
                "Settlement within 1-5 minutes for major corridors"
            ],
            "USDC_Solana": [
                "Purchase USDC on Solana network",
                "Send USDC to recipient's Solana wallet",
                "Recipient converts USDC to local currency",
                "Funds received (settlement in seconds on-chain)"
            ],
        }
        return steps_map.get(method, ["Transfer initiated and processed"])

    def _get_route_warnings(self, method: str) -> List[str]:
        """Get any warnings or caveats for routes"""
        warnings_map = {
            "USDC_Solana": [
                "Recipient must have Solana wallet",
                "Subject to off-ramp liquidity availability",
                "Network risk: Solana network outages are rare but possible"
            ],
            "USDC_Ethereum": [
                "Recipient must have Ethereum wallet",
                "Gas fees subject to network congestion",
                "Higher gas fees during peak hours"
            ],
            "Wire": [
                "High minimum amounts may apply",
                "Recipient details must be exact",
                "Some countries may have wire restrictions"
            ],
        }
        return warnings_map.get(method, [])

    def _passes_constraints(self, route: Dict, constraints: Dict) -> bool:
        if "max_cost_percentage" in constraints:
            if route["cost_percentage"] > constraints["max_cost_percentage"]:
                return False
        
        if "max_time_minutes" in constraints:
            if route["estimated_time_minutes"] > constraints["max_time_minutes"]:
                return False
        
        if "min_reliability_score" in constraints:
            if route["reliability_score"] < constraints["min_reliability_score"]:
                return False
        
        return True

    def _rank_routes(self, routes: List[Dict]) -> List[Dict]:
        if not routes:
            return routes

        # Add individual rankings
        for i, route in enumerate(routes):
            route["ranking_index"] = i

        # Cost ranking
        sorted_cost = sorted(enumerate(routes), key=lambda x: x[1]["cost"]["total_cost"])
        cost_ranks = {idx: rank + 1 for rank, (idx, _) in enumerate(sorted_cost)}
        
        # Speed ranking
        sorted_speed = sorted(enumerate(routes), key=lambda x: x[1]["estimated_time_minutes"])
        speed_ranks = {idx: rank + 1 for rank, (idx, _) in enumerate(sorted_speed)}
        
        # Reliability ranking
        sorted_reliability = sorted(
            enumerate(routes),
            key=lambda x: x[1]["reliability_score"],
            reverse=True
        )
        reliability_ranks = {idx: rank + 1 for rank, (idx, _) in enumerate(sorted_reliability)}
        
        # Overall ranking (weighted: 40% cost, 30% speed, 30% reliability)
        overall_scores = []
        for idx, route in enumerate(routes):
            cost_score = 1 - (cost_ranks[idx] - 1) / len(routes)
            speed_score = 1 - (speed_ranks[idx] - 1) / len(routes)
            reliability_score = 1 - (reliability_ranks[idx] - 1) / len(routes)
            
            overall = (cost_score * 0.4) + (speed_score * 0.3) + (reliability_score * 0.3)
            overall_scores.append((idx, overall))
        
        sorted_overall = sorted(overall_scores, key=lambda x: x[1], reverse=True)
        overall_ranks = {idx: rank + 1 for rank, (idx, _) in enumerate(sorted_overall)}
        
        # Add ranks to routes
        for idx, route in enumerate(routes):
            route["cost_rank"] = cost_ranks[idx]
            route["speed_rank"] = speed_ranks[idx]
            route["reliability_rank"] = reliability_ranks[idx]
            route["overall_rank"] = overall_ranks[idx]

        # Sort by overall rank
        routes.sort(key=lambda r: r["overall_rank"])
        
        return routes
