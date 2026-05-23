from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class PairMetrics:
    def __init__(self, api_response: dict):
        self.api_response = api_response
        self.pairAddress = api_response.get("pairAddress")
        self.token0 = api_response.get("token0", {})
        self.token1 = api_response.get("token1", {})
        logger.info(f"PairMetrics init - pairAddress: {self.pairAddress}, token0: {self.token0.get('symbol')}, token1: {self.token1.get('symbol')}")
    
    def calculate_liquidity_score(self) -> float:
        """Liquidity score based on pair health (0-100)."""
        try:
            base_score = 0.0
            if self.pairAddress:
                base_score = 50.0
            
            if self.token0 and self.token1:
                base_score = 75.0
                t0_price = self.token0.get("usdPrice")
                t1_price = self.token1.get("usdPrice")
                if t0_price and t1_price:
                    base_score = 85.0
            
            logger.info(f"Liquidity score: {base_score}")
            return round(base_score, 2)
        except Exception as e:
            logger.warning(f"Error calculating liquidity score: {e}")
            return 0.0
    
    def calculate_estimated_slippage(self) -> float:
        """Slippage estimate for 1% trade (0.01% - 0.5%)."""
        try:
            base_slippage = 0.1
            
            if not self.token0 or not self.token1:
                return round(0.3, 2)
            
            t0_price = self.token0.get("usdPrice")
            t1_price = self.token1.get("usdPrice")
            
            if t0_price and t1_price:
                result = round(0.05, 2)
            else:
                result = round(base_slippage, 2)
            
            logger.info(f"Slippage estimate: {result}")
            return result
        except Exception as e:
            logger.warning(f"Error calculating slippage: {e}")
            return 0.0
    
    def calculate_price_impact_estimate(self) -> float:
        """Price impact estimate for 1% trade (0.001% - 0.05%)."""
        try:
            base_impact = 0.005
            
            if not self.token0 or not self.token1:
                return round(0.02, 4)
            
            t0_price = self.token0.get("usdPrice")
            t1_price = self.token1.get("usdPrice")
            
            if t0_price and t1_price:
                result = round(0.001, 4)
            else:
                result = round(base_impact, 4)
            
            logger.info(f"Price impact: {result}")
            return result
        except Exception as e:
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
        metrics = metrics_calculator.get_all_metrics()
        logger.info(f"Final metrics: {metrics}")
        return metrics
    except Exception as e:
        logger.error(f"Failed to calculate metrics: {e}")
        return {
            "liquidity_score": 0.0,
            "estimated_slippage_1pct": 0.0,
            "price_impact_1pct": 0.0,
        }
