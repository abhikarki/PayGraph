export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'BRL'
  | 'INR'
  | 'MXN'
  | 'ZAR'
  | 'NGN'
  | 'JPY'
  | 'SGD'
  | 'HKD';

export type RouteType =
  | 'ach'
  | 'usdc_solana'
  | 'usdc_polygon'
  | 'usdc_ethereum'
  | 'usdt_solana'
  | 'international_wire'
  | 'wise'
  | 'local_payout';

export type NodeType = 
  | 'source' 
  | 'destination'
  | 'bank'
  | 'blockchain'
  | 'fx_provider'
  | 'processor'
  | 'off_ramp'
  | 'settlement';

export interface RouteCost {
  provider_fee: number;
  fx_spread: number;
  network_fee: number;
  off_ramp_cost: number;
  total_cost: number;
  effective_rate: number;
}

export interface RouteOption {
  route_id: string;
  route_type: RouteType;
  provider: string;
  cost: RouteCost;
  cost_rank: number;
  estimated_time_minutes: number;
  time_rank: number;
  reliability_score: number;
  success_rank: number;
  overall_rank: number;
  steps: string[];
  warnings: string[];
}

export interface PaymentConstraint {
  max_cost_percentage?: number;
  max_time_minutes?: number;
  min_reliability_score?: number;
}

export interface PaymentIntentRequest {
  source_currency: CurrencyCode;
  destination_currency: CurrencyCode;
  amount: number;
  destination_country: string;
  constraints?: PaymentConstraint;
  use_testnet?: boolean;
}

export interface PaymentIntentResponse {
  intent_id: string;
  timestamp: string;
  source_amount: number;
  source_currency: CurrencyCode;
  destination_currency: CurrencyCode;
  destination_country: string;
  routes: RouteOption[];
  cheapest_route: string | null;
  fastest_route: string | null;
  best_overall_route: string | null;
  estimated_received: Array<{
    route_id: string;
    provider: string;
    you_receive: number;
    currency: CurrencyCode;
  }>;
}

export interface HealthResponse {
  status: string;
  version: string;
  services: Record<string, string>;
}

// Graph Visualization Types
export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  data: {
    provider?: string;
    health?: number;
    latency?: number;
    liquidity?: number;
    currency?: CurrencyCode;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  data: {
    routeId?: string;
    cost?: number;
    fee?: number;
    liquidity?: number;
    isOptimal?: boolean;
    eta?: number;
    successProbability?: number;
    riskScore?: number;
    lastUpdated?: string;
  };
}

export type OptimizationMode = 
  | 'cheapest'
  | 'fastest'
  | 'most_reliable'
  | 'best_overall'
  | 'liquidity_safe'
  | 'weekend_safe';
