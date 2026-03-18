import React from 'react';
import { motion } from 'framer-motion';
import { PaymentIntentResponse } from '../types/payment';

interface TextBasedPathViewProps {
  routeData: PaymentIntentResponse | null;
  selectedRouteId: string | null;
}

export const TextBasedPathView: React.FC<TextBasedPathViewProps> = ({
  routeData,
  selectedRouteId,
}) => {
  if (!routeData || !selectedRouteId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">Select a route to view details</p>
      </div>
    );
  }

  const selectedRoute = routeData.routes.find((r) => r.route_id === selectedRouteId);
  if (!selectedRoute) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">Route not found</p>
      </div>
    );
  }

  // Build path nodes
  const pathNodes = [
    {
      name: routeData.source_currency,
      type: 'source',
      details: `Amount: ${routeData.source_amount}`,
    },
    ...(selectedRoute.steps || []).map((step, idx) => ({
      name: step,
      type: 'intermediate',
      details: `Step ${idx + 1}`,
    })),
    {
      name: routeData.destination_currency,
      type: 'destination',
      details: `Destination`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col"
    >
      {/* Route Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Route Details: {selectedRoute.provider}</h3>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-gray-600 text-sm">Cost</p>
            <p className="text-2xl font-bold text-green-600">${selectedRoute.cost.total_cost.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">ETA</p>
            <p className="text-2xl font-bold text-blue-600">{selectedRoute.estimated_time_minutes}min</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Reliability</p>
            <p className="text-2xl font-bold text-cyan-600">{selectedRoute.reliability_score.toFixed(1)}%</p>
          </div>
        </div>

        {/* Path Flow */}
        <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
          <div className="flex items-center gap-3 min-w-max pb-2">
            {pathNodes.map((node, idx) => (
              <React.Fragment key={idx}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`
                    px-3 py-2 rounded-lg text-center whitespace-nowrap
                    ${
                      node.type === 'source'
                        ? 'bg-blue-100 border border-blue-300'
                        : node.type === 'destination'
                          ? 'bg-green-100 border border-green-300'
                          : 'bg-gray-100 border border-gray-300'
                    }
                  `}
                >
                  <p className="font-semibold text-gray-900 text-sm">{node.name}</p>
                  <p className="text-xs text-gray-600">{node.details}</p>
                </motion.div>

                {idx < pathNodes.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.1 + 0.05 }}
                    className="text-gray-400 text-lg font-bold"
                  >
                    →
                  </motion.div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Route Steps */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {selectedRoute.steps?.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 px-3 py-1 bg-blue-100 rounded-full text-xs font-semibold text-blue-700">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 font-semibold">{step}</p>
                  <p className="text-gray-600 text-sm mt-1">Intermediate node in payment path</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          Route ID: <span className="text-gray-700 font-mono">{selectedRoute.route_id}</span>
        </p>
      </div>
    </motion.div>
  );
};
