import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { RouteOption } from '../types/payment';

interface CostComparisonChartProps {
  routes: RouteOption[];
}

export const CostComparisonChart: React.FC<CostComparisonChartProps> = ({ routes }) => {
  const data = routes.map((route) => ({
    provider: route.provider.split(' ')[0],
    totalCost: route.cost.total_cost,
    providerFee: route.cost.provider_fee,
    fxSpread: route.cost.fx_spread,
    networkFee: route.cost.network_fee,
  }));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Cost Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="provider" />
          <YAxis />
          <Tooltip formatter={(value) => `$${typeof value === 'number' ? value.toFixed(2) : value}`} />
          <Legend />
          <Bar dataKey="providerFee" stackId="a" fill="#3b82f6" name="Provider Fee" />
          <Bar dataKey="fxSpread" stackId="a" fill="#8b5cf6" name="FX Spread" />
          <Bar dataKey="networkFee" stackId="a" fill="#ec4899" name="Network Fee" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface SpeedComparisonChartProps {
  routes: RouteOption[];
}

export const SpeedComparisonChart: React.FC<SpeedComparisonChartProps> = ({ routes }) => {
  const data = routes.map((route) => ({
    provider: route.provider.split(' ')[0],
    minutes: route.estimated_time_minutes,
  }));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Delivery Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="provider" type="category" width={100} />
          <Tooltip formatter={(value) => `${value} minutes`} />
          <Bar dataKey="minutes" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface ReliabilityComparisonProps {
  routes: RouteOption[];
}

export const ReliabilityComparison: React.FC<ReliabilityComparisonProps> = ({ routes }) => {
  const data = routes.map((route) => ({
    provider: route.provider.split(' ')[0],
    reliability: route.reliability_score,
  }));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Success Rate</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="provider" />
          <YAxis domain={[90, 100]} />
          <Tooltip formatter={(value) => `${typeof value === 'number' ? value.toFixed(1) : value}%`} />
          <Line type="monotone" dataKey="reliability" stroke="#06b6d4" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
