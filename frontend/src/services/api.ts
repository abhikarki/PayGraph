import { PaymentIntentResponse } from '../types/payment';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const paymentAPI = {
  async analyzeRoutes(payload: {
    source_currency: string;
    destination_currency: string;
    amount: number;
    destination_country: string;
    constraints?: {
      max_cost_percentage?: number;
      max_time_minutes?: number;
      min_reliability_score?: number;
    };
    use_testnet?: boolean;
  }): Promise<PaymentIntentResponse> {
    const response = await fetch(`${API_BASE_URL}/routes/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to analyze routes');
    }

    return response.json();
  },

  /**
   * Get health check
   */
  async getHealth() {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('Backend is not responding');
    }
    return response.json();
  },

  async getCorridors() {
    const response = await fetch(`${API_BASE_URL}/routes/corridors`);
    if (!response.ok) {
      throw new Error('Failed to fetch corridors');
    }
    return response.json();
  },
};
