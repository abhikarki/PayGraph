export interface TokenNode {
  id: string;
  address: string;
  decimals: number;
  logo_url: string;
}

export interface PairEdge {
  source: string;
  target: string;
  pair_id: string;
  pair_address: string;
  exchange: string;
  price_usd: number;
  liquidity_usd: number;
  volume_1h: number;
  volume_24h: number;
  buys_1h: number;
  sells_1h: number;
  buy_volume_1h: number;
  sell_volume_1h: number;
  price_change_1h: number;
  price_change_24h: number;
  score: number;
  last_updated: string | null;
}

export interface GraphData {
  nodes: TokenNode[];
  edges: PairEdge[];
  polled_at: string | null;
}

export interface HopDetail {
  source: string;
  target: string;
  pair_address: string;
  exchange: string;
  liquidity_usd: number;
  score: number;
}

export interface Route {
  rank: number;
  hops: string[];
  hop_details: HopDetail[];
  total_score: number;
  total_liquidity_usd: number;
  reason: string;
}

export interface RoutesData {
  from_token: string;
  to_token: string;
  optimize: string;
  routes: Route[];
  computed_at: string;
}

export interface Snapshot {
  timestamp: string;
  price_usd: number;
  liquidity_usd: number;
  volume_1h: number;
  buys_1h: number;
  sells_1h: number;
  score: number;
}

export interface HistoryData {
  pair_id: string;
  pair_address: string;
  snapshots: Snapshot[];
}

export interface StatusData {
  healthy: boolean;
  last_poll_at: string | null;
  next_poll_in_seconds: number | null;
  pairs_resolved: number;
  total_pairs: number;
  snapshots_last_hour: number;
  api_calls_last_hour: number;
}

export type OptimizeMode = "balanced" | "liquidity" | "fees";

export interface SelectedPair {
  from: string;
  to: string;
}
