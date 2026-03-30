from typing import List, Dict
from app.engine.graph import Rail, RailType, PaymentGraph


class RailConfig:
    
    @staticmethod
    def get_default_rails() -> List[Rail]:
        return [
            # ============ DOMESTIC & REGIONAL ============
            
            # US Domestic
            Rail(
                from_currency="USD",
                to_currency="USD",
                name=RailType.ACH,
                flat_fee_usd=0.50,
                percentage_fee=0.001,  # 0.1%
                fx_spread=0.0,
                settlement_minutes=1440,  # 1 day
                availability="business_hours",
                reliability_score=0.99,
                min_amount=1.0,
                max_amount=1_000_000,
                supported_corridors=["US_to_US"],
            ),
            
            Rail(
                from_currency="USD",
                to_currency="USD",
                name=RailType.ACH,
                flat_fee_usd=2.50,
                percentage_fee=0.0,
                fx_spread=0.0,
                settlement_minutes=480,  # RTP - faster ACH
                availability="24/7",
                reliability_score=0.95,
                min_amount=1.0,
                max_amount=100_000,
                supported_corridors=["US_to_US"],
            ),
            
            # SEPA (Euro zone)
            Rail(
                from_currency="EUR",
                to_currency="EUR",
                name=RailType.SEPA,
                flat_fee_usd=0.30,
                percentage_fee=0.001,  # 0.1%
                fx_spread=0.0,
                settlement_minutes=1440,  # 1 day
                availability="business_hours",
                reliability_score=0.98,
                min_amount=0.1,
                max_amount=999_999,
                supported_corridors=["EU_to_EU"],
            ),
            
            # PIX (Brazil - instant)
            Rail(
                from_currency="BRL",
                to_currency="BRL",
                name=RailType.PIX,
                flat_fee_usd=0.0,
                percentage_fee=0.0,
                fx_spread=0.0,
                settlement_minutes=1,
                availability="24/7",
                reliability_score=0.99,
                min_amount=0.01,
                max_amount=4000,  # Per transaction limit
                supported_corridors=["BR_to_BR"],
            ),
            
            # ============ INTERNATIONAL WIRES ============
            
            # SWIFT wire (generic)
            Rail(
                from_currency="USD",
                to_currency="BRL",
                name=RailType.SWIFT,
                flat_fee_usd=35.0,
                percentage_fee=0.015,  # 1.5% FX spread
                fx_spread=0.01,  # Additional 1% hidden spread
                settlement_minutes=2880,  # 2 days
                availability="business_hours",
                reliability_score=0.97,
                min_amount=10.0,
                max_amount=500_000,
                supported_corridors=["US_to_BR", "US_to_MX", "US_to_IN"],
            ),
            
            Rail(
                from_currency="USD",
                to_currency="EUR",
                name=RailType.SWIFT,
                flat_fee_usd=25.0,
                percentage_fee=0.01,  # 1% FX spread
                fx_spread=0.005,
                settlement_minutes=1440,  # 1 day (transatlantic)
                availability="business_hours",
                reliability_score=0.98,
                min_amount=10.0,
                max_amount=500_000,
                supported_corridors=["US_to_EU"],
            ),
            
            # ============ REMITTANCE SERVICES ============
            
            # Wise/TransferWise
            Rail(
                from_currency="USD",
                to_currency="BRL",
                name=RailType.WISE,
                flat_fee_usd=4.5,
                percentage_fee=0.01,  # 1%
                fx_spread=0.002,  # Wise has tight spreads
                settlement_minutes=720,  # 12 hours
                availability="24/7",
                reliability_score=0.96,
                min_amount=1.0,
                max_amount=100_000,
                supported_corridors=["US_to_BR", "US_to_MX", "US_to_IN"],
            ),
            
            # Western Union (model as rail)
            Rail(
                from_currency="USD",
                to_currency="BRL",
                name=RailType.REMITTANCE,
                flat_fee_usd=0.0,
                percentage_fee=0.025,  # 2.5%
                fx_spread=0.02,  # Bad FX rate
                settlement_minutes=240,  # 4 hours
                availability="24/7",
                reliability_score=0.92,
                min_amount=1.0,
                max_amount=5000,
                supported_corridors=["US_to_BR"],
            ),
            
            # ============ STABLECOIN RAILS (Multi-chain) ============
            
            # On-ramp USD -> USDC
            Rail(
                from_currency="USD",
                to_currency="USDC",
                name=RailType.USDC_POLYGON,  # Reuse enum for on-ramp marker
                flat_fee_usd=1.0,
                percentage_fee=0.005,  # 0.5%
                fx_spread=0.0,
                settlement_minutes=60,  # 1 hour
                availability="24/7",
                reliability_score=0.94,
                min_amount=5.0,
                max_amount=100_000,
                supported_corridors=None,  # All corridors with USDC
            ),
            
            # Polygon bridge (USDC_Polygon)
            Rail(
                from_currency="USDC",
                to_currency="USDC_POLYGON",
                name=RailType.USDC_POLYGON,
                flat_fee_usd=0.01,
                percentage_fee=0.001,  # Small fee
                fx_spread=0.0,
                settlement_minutes=5,
                availability="24/7",
                reliability_score=0.97,
                min_amount=0.01,
                max_amount=500_000,
                supported_corridors=None,
            ),
            
            # Solana bridge (USDC_Solana) - cheapest for mid-range
            Rail(
                from_currency="USDC",
                to_currency="USDC_SOLANA",
                name=RailType.USDC_SOLANA,
                flat_fee_usd=0.001,
                percentage_fee=0.0,
                fx_spread=0.0,
                settlement_minutes=2,  # Very fast
                availability="24/7",
                reliability_score=0.96,
                min_amount=0.01,
                max_amount=500_000,
                supported_corridors=None,
            ),
            
            # Ethereum bridge (most expensive)
            Rail(
                from_currency="USDC",
                to_currency="USDC_ETHEREUM",
                name=RailType.USDC_ETHEREUM,
                flat_fee_usd=3.0,  # Gas-heavy
                percentage_fee=0.0,
                fx_spread=0.0,
                settlement_minutes=15,
                availability="24/7",
                reliability_score=0.98,
                min_amount=0.01,
                max_amount=500_000,
                supported_corridors=None,
            ),
            
            # ============ OFF-RAMPS (Stablecoin -> Fiat) ============
            
            # USDC_Polygon -> BRL (off-ramp in Brazil)
            Rail(
                from_currency="USDC_POLYGON",
                to_currency="BRL",
                name=RailType.REMITTANCE,
                flat_fee_usd=0.50,
                percentage_fee=0.005,  # 0.5% spread
                fx_spread=0.0,
                settlement_minutes=240,  # 4 hours
                availability="24/7",
                reliability_score=0.91,
                min_amount=1.0,
                max_amount=100_000,
                supported_corridors=None,
            ),
            
            # USDC_Solana -> BRL (off-ramp)
            Rail(
                from_currency="USDC_SOLANA",
                to_currency="BRL",
                name=RailType.REMITTANCE,
                flat_fee_usd=0.25,
                percentage_fee=0.005,
                fx_spread=0.0,
                settlement_minutes=240,
                availability="24/7",
                reliability_score=0.91,
                min_amount=1.0,
                max_amount=100_000,
                supported_corridors=None,
            ),
            
            # USDC_POLYGON -> EUR (off-ramp in EU)
            Rail(
                from_currency="USDC_POLYGON",
                to_currency="EUR",
                name=RailType.REMITTANCE,
                flat_fee_usd=0.50,
                percentage_fee=0.003,  # 0.3%
                fx_spread=0.0,
                settlement_minutes=480,
                availability="business_hours",
                reliability_score=0.93,
                min_amount=1.0,
                max_amount=100_000,
                supported_corridors=None,
            ),
        ]
    
    @staticmethod
    def build_payment_graph() -> PaymentGraph:
        graph = PaymentGraph()
        
        for rail in RailConfig.get_default_rails():
            graph.add_rail(rail)
        
        return graph


# Convenience: Pre-build the graph singleton
_payment_graph: PaymentGraph = None


def get_payment_graph() -> PaymentGraph:
    global _payment_graph
    if _payment_graph is None:
        _payment_graph = RailConfig.build_payment_graph()
    return _payment_graph
