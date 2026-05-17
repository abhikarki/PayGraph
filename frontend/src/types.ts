export interface Token {
  symbol: string
  address: string
  decimals: number
  logo_url?: string
}

export interface TokensResponse {
  tokens: Token[]
}

export interface PairResponse {
  pair_address_count: number
  api_response: Record<string, any>
}


