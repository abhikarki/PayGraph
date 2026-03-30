from dataclasses import dataclass
from typing import Dict, List, Set, Optional
from enum import Enum


class RailType(str, Enum):
    SWIFT = "swift"
    ACH = "ach"
    SEPA = "sepa"
    PIX = "pix"
    UPI = "upi"
    USDC_POLYGON = "usdc_polygon"
    USDC_SOLANA = "usdc_solana"
    USDC_ETHEREUM = "usdc_ethereum"
    USDT_SOLANA = "usdt_solana"
    REMITTANCE = "remittance"
    WISE = "wise"


@dataclass
class Rail:
    from_currency: str
    to_currency: str
    name: RailType
    flat_fee_usd: float  # Fixed fee in USD
    percentage_fee: float  # Percentage fee (0.005 = 0.5%)
    fx_spread: float  # FX spread as percentage (0.01 = 1% hidden cost)
    settlement_minutes: int  # Time to settle (1 = instant, 4320 = 3 days)
    availability: str  # "24/7" or "business_hours" or "24/7_weekdays"
    reliability_score: float  # 0.0 to 1.0
    min_amount: float = 0.0  # Minimum transfer amount in source currency
    max_amount: float = float("inf")  # Maximum transfer amount
    supported_corridors: Optional[List[str]] = None  # e.g., ["US_to_BR", "US_to_MX"]
    
    def calculate_total_cost(self, amount: float) -> float:
        return self.flat_fee_usd + (amount * self.percentage_fee) + (amount * self.fx_spread)
    
    def is_available_for_corridor(self, corridor: str) -> bool:
        if self.supported_corridors is None:
            return True
        return corridor in self.supported_corridors


class PaymentGraph:
    def __init__(self):
        self.nodes: Set[str] = set()
        self.edges: Dict[str, List[Rail]] = {}  # from_currency -> [Rails]
    
    def add_node(self, currency: str) -> None:
        self.nodes.add(currency)
        if currency not in self.edges:
            self.edges[currency] = []
    
    def add_rail(self, rail: Rail) -> None:
        self.add_node(rail.from_currency)
        self.add_node(rail.to_currency)
        self.edges[rail.from_currency].append(rail)
    
    def get_rails(self, from_currency: str, to_currency: Optional[str] = None) -> List[Rail]:
        if from_currency not in self.edges:
            return []
        
        rails = self.edges[from_currency]
        if to_currency:
            rails = [r for r in rails if r.to_currency == to_currency]
        return rails
    
    def has_path(self, from_currency: str, to_currency: str) -> bool:
        if from_currency not in self.nodes or to_currency not in self.nodes:
            return False
        
        visited: Set[str] = set()
        queue = [from_currency]
        
        while queue:
            current = queue.pop(0)
            if current == to_currency:
                return True
            
            if current in visited:
                continue
            visited.add(current)
            
            for rail in self.get_rails(current):
                if rail.to_currency not in visited:
                    queue.append(rail.to_currency)
        
        return False
    
    def get_direct_rails(self, from_currency: str, to_currency: str) -> List[Rail]:
        return self.get_rails(from_currency, to_currency)
