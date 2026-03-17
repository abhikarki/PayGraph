from typing import Optional
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field, validator


class Settings(BaseSettings):
    open_exchange_rates_api_key: str = Field(..., min_length=1)
    wise_api_token: Optional[str] = Field(None)
    etherscan_api_key: Optional[str] = Field(None)
    solana_rpc_url: str = Field(default="https://api.mainnet-beta.solana.com")
    polygon_rpc_url: str = Field(default="https://polygon-rpc.com/")

    database_url: str = Field(...)

    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000, ge=1, le=65535)
    api_env: str = Field(default="development")  

    cors_origins: str = Field(default="http://localhost:3000,http://localhost:5173")
    rate_limit_requests_per_minute: int = Field(default=60, ge=1)

    fx_rate_cache_ttl: int = Field(default=3600, ge=60)  # min 60 seconds
    gas_price_cache_ttl: int = Field(default=60, ge=10)  # min 10 seconds

    enable_stablecoin_routes: bool = Field(default=True)
    enable_ach_routes: bool = Field(default=True)
    enable_international_routes: bool = Field(default=True)

    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    @property
    def is_production(self) -> bool:
        return self.api_env == "production"

    @property
    def is_development(self) -> bool:
        return self.api_env == "development"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
