import aiohttp
import logging
from typing import Dict, Optional
from datetime import datetime, timedelta
from functools import lru_cache

logger = logging.getLogger(__name__)


class FXRateFetcher:
    
    def __init__(
        self,
        api_key: str,
        cache_ttl: int = 3600,  # seconds
    ):
        self.api_key = api_key
        self.cache_ttl = cache_ttl
        self.base_url = "https://openexchangerates.org/api/latest.json"
        self._cache: Dict = {}
        self._cache_time: Optional[datetime] = None
    
    async def get_rates(self, base_currency: str = "USD") -> Dict[str, float]:
        # Check cache
        if self._is_cache_valid():
            return self._cache.get("rates", {})
        
        try:
            params = {
                "app_id": self.api_key,
                "base": base_currency,
                "symbols": "EUR,GBP,BRL,INR,MXN,ZAR,NGN,JPY,SGD,HKD,AUD,CAD,CHF",
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self._cache = {
                            "rates": data.get("rates", {}),
                            "base": data.get("base", base_currency),
                            "timestamp": data.get("timestamp", int(datetime.now().timestamp())),
                        }
                        self._cache_time = datetime.now()
                        logger.info(f"FX rates updated for {base_currency}")
                        return self._cache["rates"]
                    else:
                        logger.error(f"Failed to fetch FX rates: {resp.status}")
                        return {}
        except Exception as e:
            logger.error(f"Error fetching FX rates: {e}")
            return self._cache.get("rates", {})
    
    async def get_rate(self, from_currency: str, to_currency: str) -> Optional[float]:
        if from_currency == to_currency:
            return 1.0
        
        # Get rates relative to base
        rates = await self.get_rates(from_currency)
        
        if to_currency in rates:
            return rates[to_currency]
        
        # Try reverse lookup
        rates_to = await self.get_rates(to_currency)
        if from_currency in rates_to:
            return 1.0 / rates_to[from_currency]
        
        return None
    
    def _is_cache_valid(self) -> bool:
        if self._cache_time is None:
            return False
        return (datetime.now() - self._cache_time).seconds < self.cache_ttl


class StablecoinPriceFetcher:
    
    def __init__(self, cache_ttl: int = 600):
        self.cache_ttl = cache_ttl
        self.coingecko_url = "https://api.coingecko.com/api/v3/simple/price"
        self._cache: Dict = {}
        self._cache_time: Optional[datetime] = None
    
    async def get_stablecoin_prices(self) -> Dict[str, float]:
        # Check cache
        if self._is_cache_valid():
            return self._cache.get("prices", {})
        
        try:
            params = {
                "ids": "usdcoin,tether,true-usd,binance-usd",
                "vs_currencies": "usd",
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.coingecko_url, params=params, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        prices = {}
                        for stablecoin_id, rates in data.items():
                            prices[stablecoin_id] = rates.get("usd", 1.0)
                        
                        self._cache = {"prices": prices}
                        self._cache_time = datetime.now()
                        logger.info("Stablecoin prices updated")
                        return prices
                    else:
                        logger.error(f"Failed to fetch stablecoin prices: {resp.status}")
                        return {}
        except Exception as e:
            logger.error(f"Error fetching stablecoin prices: {e}")
            return self._cache.get("prices", {})
    
    def _is_cache_valid(self) -> bool:
        """Check if cache is still valid."""
        if self._cache_time is None:
            return False
        return (datetime.now() - self._cache_time).seconds < self.cache_ttl
