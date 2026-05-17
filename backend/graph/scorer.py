from __future__ import annotations

MODES = ["liquidity", "fees", "balanced"]

def compute_score(
        liquidity_usd: float,
        volume_1h: float,
        buys_1h: int,
        sells_1h: int,
        buy_volume_1h: float,
        sell_volume_1h: float,
        mode: str = "balanced",
) -> float:
    if mode not in MODES:
        mode = "balanced"
    
    liq = max(liquidity_usd, 1.0)
    liq_score = 1_000_000 / liq

    total_trades = max(buys_1h + sells_1h, 1)
    sell_ratio = sells_1h / total_trades
    sell_score = sell_ratio

    vol = max(volume_1h, 1.0)
    vol_score = 10_000 / vol

    if mode == "liquidity":
        score = 0.7 * liq_score + 0.2 * sell_score + 0.1 * vol_score
    elif mode == "fees":
        score = 0.4 * liq_score + 0.4 * vol_score + 0.2 * sell_score
    else:
        score = 0.4 * liq_score + 0.35 * sell_score + 0.25 * vol_score
    return round(score, 6)

def score_reason(
        mode: str,
        liquidity_usd: float,
        buys_1h: int,
        sells_1h: int,
) -> str:
    liq_fmt = f"${liquidity_usd:,.0f}" if liquidity_usd >= 1 else "unknown"
    total = max(buys_1h + sells_1h, 1)
    buy_pct = round(100 * buys_1h / total)
 
    if mode == "liquidity":
        return f"Deepest liquidity path ({liq_fmt} TVL, {buy_pct}% buy pressure)"
    elif mode == "fees":
        return f"Fewest hops with healthiest volume ({liq_fmt} TVL)"
    else:
        return f"Best balance of liquidity ({liq_fmt} TVL) and {buy_pct}% buy pressure"
