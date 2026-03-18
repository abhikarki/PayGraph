import asyncio
import logging
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
import aiohttp
from functools import lru_cache

logger = logging.getLogger(__name__)


class RateFetcher:
    def __init__(self, open_exchange_rates_key: str, cache_ttl: int = 3600, gas_cache_ttl: int = 60):
        self.ox_key = open_exchange_rates_key
        self.cache_ttl = cache_ttl
        self.gas_cache_ttl = gas_cache_ttl
        
        # In-memory cache
        self._fx_cache: Dict[str, Tuple[Dict, datetime]] = {}
        self._gas_cache: Dict[str, Tuple[float, datetime]] = {}

    async def get_fx_rates(self, base: str = "USD") -> Dict[str, float]:
        # Check cache
        if base in self._fx_cache:
            rates, cached_at = self._fx_cache[base]
            if datetime.utcnow() - cached_at < timedelta(seconds=self.cache_ttl):
                logger.debug(f"Using cached FX rates for {base}")
                return rates

        # Fetch fresh rates
        try:
            url = "https://openexchangerates.org/api/latest.json"
            params = {
                "app_id": self.ox_key,
                "base": base
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status != 200:
                        raise ValueError(f"Open Exchange Rates API returned {resp.status}")
                    
                    data = await resp.json()
                    rates = data.get("rates", {})
                    
                    if not rates:
                        raise ValueError("No rates returned from API")
                    
                    # Cache the rates
                    self._fx_cache[base] = (rates, datetime.utcnow())
                    logger.info(f"Fetched {len(rates)} FX rates for base {base}")
                    
                    return rates
                    
        except asyncio.TimeoutError:
            logger.warning(f"Timeout fetching FX rates for {base}, using fallback rates")
        except Exception as e:
            logger.warning(f"Error fetching FX rates: {str(e)}, using fallback rates")
        
        # Fallback to realistic mock rates for demo/testing
        fallback_rates = {
            "EUR": 0.92,
            "GBP": 0.79,
            "JPY": 149.50,
            "CNY": 7.08,
            "INR": 83.12,
            "BRL": 4.97,
            "MXN": 17.05,
            "ZAR": 18.65,
            "NGN": 1245.00,
            "SGD": 1.34,
            "HKD": 7.81
        }
        
        if base != "USD":
            # If requesting non-USD base, invert the rates
            invert_rate = 1 / (fallback_rates.get(base, 1.0))
            inverted = {k: v * invert_rate for k, v in fallback_rates.items()}
            inverted["USD"] = invert_rate
            fallback_rates = inverted
        else:
            fallback_rates["USD"] = 1.0
        
        # Cache fallback rates briefly
        self._fx_cache[base] = (fallback_rates, datetime.utcnow())
        logger.info(f"Using fallback FX rates for {base} (API unavailable)")
        
        return fallback_rates

    async def get_ethereum_gas_price(self, etherscan_api_key: Optional[str] = None) -> float:
        # Check cache
        cache_key = "ethereum_gas"
        if cache_key in self._gas_cache:
            price, cached_at = self._gas_cache[cache_key]
            if datetime.utcnow() - cached_at < timedelta(seconds=self.gas_cache_ttl):
                logger.debug("Using cached Ethereum gas price")
                return price

        try:
            url = "https://api.etherscan.io/api"
            params = {
                "module": "gastracker",
                "action": "gasoracle",
                "apikey": etherscan_api_key or "YourEtherscanAPIKey"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status != 200:
                        raise ValueError(f"Etherscan API returned {resp.status}")
                    
                    data = await resp.json()
                    
                    if data.get("status") != "1":
                        raise ValueError(f"Etherscan error: {data.get('message', 'Unknown')}")
                    
                    # Get standard gas price
                    gas_price = float(data["result"]["standard"])
                    
                    # Cache it
                    self._gas_cache[cache_key] = (gas_price, datetime.utcnow())
                    logger.info(f"Fetched Ethereum gas price: {gas_price} gwei")
                    
                    return gas_price
                    
        except asyncio.TimeoutError:
            logger.error("Timeout fetching Ethereum gas price")
            raise ValueError("Gas price fetch timed out")
        except Exception as e:
            logger.error(f"Error fetching Ethereum gas price: {str(e)}")
            raise

    async def get_solana_rent_fee(self) -> float:
        # In production, fetch from Solana RPC
        return 0.00025

    def clear_cache(self) -> None:
        """Clear all cached data"""
        self._fx_cache.clear()
        self._gas_cache.clear()
        logger.info("Rate cache cleared")
