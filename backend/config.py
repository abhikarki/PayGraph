import os
from dataclasses import dataclass, field
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

MORALIS_API_KEY = os.getenv("MORALIS_API_KEY")
MORALIS_BASE_URL = "https://deep-index.moralis.io/api/v2.2"

POLL_INTERVAL_SECONDS = 60
STAGGER_BETWEEN_CALLS_SECONDS = 3
HISTORY_RETENTION_HOURS = 72
CHAIN = "eth"

@dataclass
class Token:
    symbol: str
    address: str
    decimals: int
    logo_url: str = ""

TOKENS: dict[str, Token] = {
    "WETH": Token(
        symbol="WETH",
        address="0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        decimals=18,
        logo_url="https://cdn.moralis.io/eth/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png",
    ),
    "USDC": Token(
        symbol="USDC",
        address="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        decimals=6,
        logo_url="https://cdn.moralis.io/eth/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
    ),
    "USDT": Token(
        symbol="USDT",
        address="0xdAC17F958D2ee523a2206206994597C13D831ec7",
        decimals=6,
        logo_url="https://cdn.moralis.io/eth/0xdac17f958d2ee523a2206206994597c13d831ec7.png",
    ),
    "DAI": Token(
        symbol="DAI",
        address="0x6B175474E89094C44Da98b954EedeAC495271d0F",
        decimals=18,
        logo_url="https://cdn.moralis.io/eth/0x6b175474e89094c44da98b954eedeac495271d0f.png",
    ),
    "WBTC": Token(
        symbol="WBTC",
        address="0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        decimals=8,
        logo_url="https://cdn.moralis.io/eth/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png",
    ),
    "UNI": Token(
        symbol="UNI",
        address="0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        decimals=18,
        logo_url="https://cdn.moralis.io/eth/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984.png",
    ),
    "LINK": Token(
        symbol="LINK",
        address="0x514910771AF9Ca656af840dff83E8264EcF986CA",
        decimals=18,
        logo_url="https://cdn.moralis.io/eth/0x514910771af9ca656af840dff83e8264ecf986ca.png",
    ),
}

@dataclass
class PairConfig:
    token0: str
    token1: str
    pair_address: Optional[str] = None
    exchange: str = ""
    chain: str = CHAIN

PAIRS: list[PairConfig] = [
     # WETH <-> stablecoins
    PairConfig("WETH", "USDC"),
    PairConfig("WETH", "USDT"),
    PairConfig("WETH", "DAI"),
    # WBTC <-> WETH and stables
    PairConfig("WETH", "WBTC"),
    PairConfig("WBTC", "USDC"),
    # Stablecoin <-> stablecoin
    PairConfig("USDC", "USDT"),
    PairConfig("USDC", "DAI"),
    # WETH <-> governance/utility
    PairConfig("WETH", "UNI"),
    PairConfig("WETH", "LINK"),
    # Governance/utility <-> stables
    PairConfig("UNI", "USDC"),
    PairConfig("LINK", "USDC"),
]

def pair_id(p: PairConfig) -> str:
    return f"{p.token0}-{p.token1}"