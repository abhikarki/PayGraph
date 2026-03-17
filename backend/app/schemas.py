from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, validator
from datetime import datetime


class CurrencyEnum(str, Enum):
    """Supported currencies"""
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    BRL = "BRL"
    INR = "INR"
    MXN = "MXN"
    ZAR = "ZAR"
    NGN = "NGN"
    JPY = "JPY"
    SGD = "SGD"
    HKD = "HKD"


class RouteTypeEnum(str, Enum):
    ACH = "ach"
    USDC_SOLANA = "usdc_solana"
    USDC_POLYGON = "usdc_polygon"
    USDC_ETHEREUM = "usdc_ethereum"
    USDT_SOLANA = "usdt_solana"
    INTERNATIONAL_WIRE = "international_wire"
    WISE = "wise"
    LOCAL_PAYOUT = "local_payout"


class PaymentConstraint(BaseModel):
    max_cost_percentage: Optional[float] = Field(None, ge=0, le=100, description="Max acceptable cost as % of amount")
    max_time_minutes: Optional[int] = Field(None, ge=1, description="Max acceptable time in minutes")
    min_reliability_score: Optional[float] = Field(None, ge=0, le=100, description="Min reliability score (0-100)")


class PaymentIntentRequest(BaseModel):
    source_currency: CurrencyEnum = Field(..., description="Source currency code")
    destination_currency: CurrencyEnum = Field(..., description="Destination currency code")
    amount: float = Field(..., gt=0, description="Amount to send in source currency")
    destination_country: str = Field(..., description="ISO 3166-1 alpha-2 country code")
    constraints: Optional[PaymentConstraint] = Field(None, description="Optional routing constraints")
    use_testnet: bool = Field(default=False, description="Use sandbox/testnet APIs")

    @validator("amount")
    def validate_amount(cls, v):
        if v > 1_000_000:
            raise ValueError("Amount cannot exceed 1,000,000")
        return round(v, 2)


class RouteCost(BaseModel):
    provider_fee: float = Field(..., description="Fee charged by provider")
    fx_spread: float = Field(..., description="FX spread cost")
    network_fee: Optional[float] = Field(default=0, description="Network/blockchain fee")
    off_ramp_cost: Optional[float] = Field(default=0, description="Cost to convert to fiat")
    total_cost: float = Field(..., description="Total cost in source currency")
    effective_rate: float = Field(..., description="Effective exchange rate after all costs")

    class Config:
        json_schema_extra = {
            "example": {
                "provider_fee": 5.00,
                "fx_spread": 2.50,
                "network_fee": 0.00,
                "off_ramp_cost": 1.50,
                "total_cost": 9.00,
                "effective_rate": 5.025
            }
        }


class RouteOption(BaseModel):
    route_id: str = Field(..., description="Unique route identifier")
    route_type: RouteTypeEnum = Field(..., description="Type of routing path")
    provider: str = Field(..., description="Payment provider name")
    
    # Economics
    cost: RouteCost = Field(..., description="Cost breakdown")
    cost_rank: int = Field(..., ge=1, description="Ranking by cost (1=cheapest)")
    
    # Timing
    estimated_time_minutes: int = Field(..., ge=1, description="Estimated delivery time")
    time_rank: int = Field(..., ge=1, description="Ranking by speed (1=fastest)")
    
    # Reliability
    reliability_score: float = Field(..., ge=0, le=100, description="Success rate (0-100)")
    success_rank: int = Field(..., ge=1, description="Ranking by reliability")
    
    # Overall
    overall_rank: int = Field(..., ge=1, description="Overall ranking (1=best)")
    
    # Steps
    steps: List[str] = Field(default_factory=list, description="Step-by-step breakdown")
    
    # Warnings
    warnings: List[str] = Field(default_factory=list, description="Any caveats or warnings")


class PaymentIntentResponse(BaseModel):
    intent_id: str = Field(..., description="Unique payment intent ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    source_amount: float
    source_currency: CurrencyEnum
    destination_currency: CurrencyEnum
    destination_country: str
    
    routes: List[RouteOption] = Field(..., description="Ranked routing options")
    
    # Summary
    cheapest_route: Optional[str] = Field(None, description="Route ID of cheapest option")
    fastest_route: Optional[str] = Field(None, description="Route ID of fastest option")
    best_overall_route: Optional[str] = Field(None, description="Route ID of best overall option")
    
    estimated_received: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Estimated amount received by each route"
    )


class HealthCheckResponse(BaseModel):
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = Field(..., description="API version")
    services: Dict[str, str] = Field(default_factory=dict, description="Status of each service")


class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = Field(None, description="Request ID for tracking")
