import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PaymentIntentResponse } from '../types/payment';

interface NetworkHealthProps {
  routeData: PaymentIntentResponse | null;
}

interface HealthMetric {
  name: string;
  value: number;
  max: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

export const NetworkHealth: React.FC<NetworkHealthProps> = ({ routeData }) => {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);

  useEffect(() => {
    if (routeData) {
      const avgReliability =
        routeData.routes.reduce((sum, r) => sum + r.reliability_score, 0) /
        routeData.routes.length;

      setMetrics([
        {
          name: 'Avg Corridor Latency',
          value: 45 + Math.random() * 30,
          max: 200,
          unit: 'ms',
          trend: Math.random() > 0.5 ? 'down' : 'stable',
          color: 'from-cyan-400 to-blue-500',
        },
        {
          name: 'Network Congestion',
          value: 35 + Math.random() * 25,
          max: 100,
          unit: '%',
          trend: Math.random() > 0.5 ? 'up' : 'stable',
          color: 'from-yellow-400 to-yellow-600',
        },
        {
          name: 'Avg Route Reliability',
          value: avgReliability,
          max: 100,
          unit: '%',
          trend: 'stable',
          color: 'from-green-400 to-emerald-500',
        },
        {
          name: 'Liquidity Pressure',
          value: 42 + Math.random() * 30,
          max: 100,
          unit: '%',
          trend: Math.random() > 0.5 ? 'down' : 'stable',
          color: 'from-purple-400 to-blue-500',
        },
        {
          name: 'System Uptime',
          value: 99.85 + Math.random() * 0.14,
          max: 100,
          unit: '%',
          trend: 'stable',
          color: 'from-green-400 to-green-600',
        },
        {
          name: 'Retry Rate',
          value: 2.1 + Math.random() * 1.5,
          max: 10,
          unit: '%',
          trend: Math.random() > 0.5 ? 'down' : 'up',
          color: 'from-red-400 to-orange-500',
        },
      ]);
    }
  }, [routeData]);

  if (!routeData || metrics.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white border border-gray-200 rounded-lg p-4"
    >
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Network Health
      </h3>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => {
          const percentage = (metric.value / metric.max) * 100;

          return (
            <motion.div
              key={metric.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-all hover:shadow-sm"
              whileHover={{ scale: 1.02 }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-600">{metric.name}</p>
                </div>
                <motion.span
                  animate={{ scale: metric.trend === 'up' ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`
                    text-xs font-bold px-2 py-1 rounded
                    ${
                      metric.trend === 'up'
                        ? 'bg-orange-100 text-orange-700'
                        : metric.trend === 'down'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                    }
                  `}
                >
                  {metric.trend === 'up' ? 'up' : metric.trend === 'down' ? 'down' : 'stable'}
                </motion.span>
              </div>

              {/* Value */}
              <div className="mb-3">
                <p className={`text-2xl font-bold bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}>
                  {metric.value.toFixed(metric.unit === '%' || metric.unit === 'ms' ? 1 : 2)}
                  <span className="text-sm ml-1">{metric.unit}</span>
                </p>
              </div>

              {/* Progress Bar */}
              <div className="relative h-1.5 bg-gray-300 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(percentage, 100)}%` }}
                  transition={{ duration: 1, delay: index * 0.05 + 0.2 }}
                  className={`h-full bg-gradient-to-r ${metric.color}`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Status Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-600">
            All systems operational
          </span>
        </div>
        <p className="text-gray-500">
          Last updated: <span className="text-gray-600 font-mono">{new Date().toLocaleTimeString()}</span>
        </p>
      </motion.div>
    </motion.div>
  );
};
