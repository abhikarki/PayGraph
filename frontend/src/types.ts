export interface Token {
  symbol: string
  address: string
  decimals: number
  logo_url?: string
}

export interface TokensResponse {
  tokens: Token[]
}

export interface Metrics {
  liquidity_score: number
  estimated_slippage_1pct: number
  price_impact_1pct: number
}

export interface PairResponse {
  pair_address_count: number
  api_response: Record<string, any>
  metrics: Metrics
}

export interface PairData {
  pair_id: string
  token0: string
  token1: string
  pair_address_count: number
  api_response: Record<string, any>
  metrics: Metrics
}

export interface AllPairsResponse {
  timestamp: string
  pairs: PairData[]
}


