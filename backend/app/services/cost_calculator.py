import logging
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class RouteEstimate:
    route_type: str
    provider: str
    source_amount: float
    cost: Dict[str, float]  # breakdown of costs
    destination_amount: float
    estimated_time_minutes: int
    reliability_score: float  # 0-100


class CostCalculator:
    def __init__(self):
        pass

    def calculate_ach_cost(
        self,
        amount: float,
        is_rush: bool = False
    ) -> Dict[str, float]:
        provider_fee = 25.00 if is_rush else 0.00 
        
        return {
            "provider_fee": provider_fee,
            "fx_spread": 0.00,  
            "network_fee": 0.00,
            "off_ramp_cost": 0.00,
            "total_cost": provider_fee
        }

    def calculate_stablecoin_cost(
        self,
        source_amount: float,
        source_currency: str,
        destination_currency: str,
        network: str,  # ethereum, solana, polygon
        fx_rate: float
    ) -> Dict[str, float]:
        fx_cost = 1.0 if source_currency != destination_currency else 0.0
        
        network_costs = {
            "ethereum": 2.50, 
            "solana": 0.001,    
            "polygon": 0.10     
        }
        
        network_fee = network_costs.get(network.lower(), 1.00)
        
        # Bridge/wrapping fees
        bridge_fee = 1.00 if network != "ethereum" else 0.00
        
        # Off-ramp cost (converting stablecoin back to fiat)
        # Typically 0.5-1.5% depending on liquidity
        fx_spread = source_amount * fx_rate * 0.01  # ~1% spread
        off_ramp_fee = source_amount * fx_rate * 0.005  # ~0.5% off-ramp
        
        total_cost = network_fee + bridge_fee + fx_spread + off_ramp_fee
        
        return {
            "provider_fee": bridge_fee,
            "fx_spread": fx_spread,
            "network_fee": network_fee,
            "off_ramp_cost": off_ramp_fee,
            "total_cost": total_cost
        }

    def calculate_international_wire_cost(
        self,
        source_amount: float,
        destination_country: str
    ) -> Dict[str, float]:
        base_wire_fee = 35.00
        
        fx_markup_rate = 0.02  # 2% average
        fx_spread = source_amount * fx_markup_rate
        
        return {
            "provider_fee": base_wire_fee,
            "fx_spread": fx_spread,
            "network_fee": 0.00,
            "off_ramp_cost": 0.00,
            "total_cost": base_wire_fee + fx_spread
        }

    def calculate_wise_cost(
        self,
        source_amount: float,
        source_currency: str,
        destination_currency: str,
        wise_commission: Optional[float] = None
    ) -> Dict[str, float]:
        commission_rate = wise_commission or 0.008  # ~0.8% default
        provider_fee = source_amount * commission_rate
        
        fx_spread = source_amount * 0.005
        
        return {
            "provider_fee": provider_fee,
            "fx_spread": fx_spread,
            "network_fee": 0.00,
            "off_ramp_cost": 0.00,
            "total_cost": provider_fee + fx_spread
        }

    def calculate_effective_rate(
        self,
        source_amount: float,
        destination_amount: float,
        fx_rate: float
    ) -> float:
        if source_amount <= 0:
            return fx_rate
        return destination_amount / source_amount

    def rank_routes(
        self,
        routes: List[RouteEstimate],
        criteria: str  # 'cost', 'speed', 'reliability', 'overall'
    ) -> List[int]:
        if criteria == 'cost':
            return sorted(
                range(len(routes)),
                key=lambda i: routes[i].cost['total_cost']
            )
        elif criteria == 'speed':
            return sorted(
                range(len(routes)),
                key=lambda i: routes[i].estimated_time_minutes
            )
        elif criteria == 'reliability':
            return sorted(
                range(len(routes)),
                key=lambda i: routes[i].reliability_score,
                reverse=True
            )
        else:  # overall
            scores = []
            max_cost = max(r.cost['total_cost'] for r in routes) if routes else 1
            max_time = max(r.estimated_time_minutes for r in routes) if routes else 1
            
            for r in routes:
                cost_score = 1 - (r.cost['total_cost'] / max_cost)
                speed_score = 1 - (r.estimated_time_minutes / max_time)
                reliability_score = r.reliability_score / 100
                
                overall = (cost_score * 0.4) + (speed_score * 0.3) + (reliability_score * 0.3)
                scores.append(overall)
            
            return sorted(range(len(routes)), key=lambda i: scores[i], reverse=True)


from typing import Optional
