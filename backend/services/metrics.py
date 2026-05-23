from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class PairMetrics:
    def __init__(self, api_response: dict):
        self.api_response = api_response
        self.pairAddress = api_response.get("pairAddress")
        self.token0 = api_response.get("token0", {})
        self.token1 = api_response.get("token1", {})
    
    def calculate_liquidity_score(self) -> float:
        try:
            reserves = self.api_response.get("reserves", [])
            if not reserves or len(reserves) < 2:
                return 0.0
            
            reserve0 = float(reserves[0])
            reserve1 = float(reserves[1])
            
            # Combine reserves as a basic liquidity indicator
            total_reserves = reserve0 + reserve1
            if total_reserves == 0:
                return 0.0
            
            # Normalize to 0-100 scale (simple heuristic)
            # Adjust these thresholds based on typical values
            liquidity_score = min(100.0, (total_reserves / 1e18) * 10)
            return round(liquidity_score, 2)
            
        except (ValueError, TypeError, KeyError) as e:
            logger.warning(f"Error calculating liquidity score: {e}")
            return 0.0
    
    def calculate_estimated_slippage(self) -> float:
        try:
            reserves = self.api_response.get("reserves", [])
            if not reserves or len(reserves) < 2:
                return 0.0
            
            reserve0 = float(reserves[0])
            reserve1 = float(reserves[1])
            
            if reserve0 == 0 or reserve1 == 0:
                return 0.0
            
            # Estimate slippage for 1% trade using constant product formula
            # Slippage increases with imbalanced reserves
            reserve_ratio = max(reserve0, reserve1) / min(reserve0, reserve1)
            trade_size = 0.01  # 1% trade
            
            # Simple slippage estimate based on reserve imbalance
            # More imbalanced = higher slippage
            slippage = (trade_size / (1 + 1/reserve_ratio)) * 100
            return round(min(slippage, 100.0), 2)
            
        except (ValueError, TypeError, KeyError) as e:
            logger.warning(f"Error calculating slippage: {e}")
            return 0.0
    
    def calculate_price_impact_estimate(self) -> float:
        try:
            reserves = self.api_response.get("reserves", [])
            if not reserves or len(reserves) < 2:
                return 0.0
            
            reserve0 = float(reserves[0])
            reserve1 = float(reserves[1])
            
            if reserve0 == 0 or reserve1 == 0:
                return 0.0
            
            # Price impact for 1% trade
            # Impact increases with higher trade size relative to pool
            trade_size_percent = 0.01
            impact = (trade_size_percent ** 2) * 100
            
            return round(impact, 4)
            
        except (ValueError, TypeError, KeyError) as e:
            logger.warning(f"Error calculating price impact: {e}")
            return 0.0
    
    def get_all_metrics(self) -> dict:
        return {
            "liquidity_score": self.calculate_liquidity_score(),
            "estimated_slippage_1pct": self.calculate_estimated_slippage(),
            "price_impact_1pct": self.calculate_price_impact_estimate(),
        }


def calculate_pair_metrics(api_response: dict) -> dict:
    try:
        metrics_calculator = PairMetrics(api_response)
        return metrics_calculator.get_all_metrics()
    except Exception as e:
        logger.error(f"Failed to calculate metrics: {e}")
        # Return zero metrics on error
        return {
            "liquidity_score": 0.0,
            "estimated_slippage_1pct": 0.0,
            "price_impact_1pct": 0.0,
        }
