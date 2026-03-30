from typing import Optional, List
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)
    
    # REQUIRED API KEYS
    open_exchange_rates_api_key: str = Field(..., min_length=1, description="OpenExchangeRates API key")
    
    # OPTIONAL API KEYS (Stubs for future expansion) 
    wise_api_token: Optional[str] = Field(None, description="Wise API token")
    etherscan_api_key: Optional[str] = Field(None, description="Etherscan API key for Ethereum gas")
    alchemy_api_key: Optional[str] = Field(None, description="Alchemy API key (multiple chain support)")
    infura_api_key: Optional[str] = Field(None, description="Infura API key (RPC provider)")
    blocknative_api_key: Optional[str] = Field(None, description="Blocknative API key (Ethereum gas)")
    coingecko_api_key: Optional[str] = Field(None, description="CoinGecko API key (crypto prices)")
    
    # RPC ENDPOINTS 
    solana_rpc_url: str = Field(default="https://api.mainnet-beta.solana.com", description="Solana RPC endpoint")
    polygon_rpc_url: str = Field(default="https://polygon-rpc.com/", description="Polygon RPC endpoint")
    ethereum_rpc_url: Optional[str] = Field(None, description="Ethereum RPC endpoint")
    
    # DATABASE 
    database_url: str = Field(default="sqlite:///./paygraph.db", description="Database connection URL")

    # API SERVER 
    api_host: str = Field(default="0.0.0.0", description="API host")
    api_port: int = Field(default=8000, ge=1, le=65535, description="API port")
    api_env: str = Field(default="development", description="Environment (development/production/testing)")

    #  CORS & RATE LIMITING 
    cors_origins: str = Field(default="http://localhost:3000,http://localhost:5173", description="CORS origins")
    rate_limit_requests_per_minute: int = Field(default=60, ge=1, description="Rate limit per minute")

    #  CACHING 
    fx_rate_cache_ttl: int = Field(default=3600, ge=60, description="FX rate cache TTL in seconds")
    gas_price_cache_ttl: int = Field(default=60, ge=10, description="Gas price cache TTL in seconds")

    #  FEATURE FLAGS 
    enable_stablecoin_routes: bool = Field(default=True, description="Enable stablecoin payment routes")
    enable_ach_routes: bool = Field(default=True, description="Enable ACH payment routes")
    enable_international_routes: bool = Field(default=True, description="Enable international payment routes")
    enable_crypto_routes: bool = Field(default=True, description="Enable crypto payment routes")

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.cors_origins, list):
            return self.cors_origins
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.api_env == "production"

    @property
    def is_development(self) -> bool:
        return self.api_env == "development"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
