import React from 'react';
import { RouteOption } from '../types/payment';

interface RouteCardProps {
  route: RouteOption;
  isHighlighted: boolean;
  badge?: string;
}

export const RouteCard: React.FC<RouteCardProps> = ({ route, isHighlighted, badge }) => {
  return (
    <div
      className={`rounded-lg shadow-lg p-6 transition-all ${
        isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:shadow-xl'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">{route.provider}</h3>
          <p className="text-sm text-gray-500 mt-1">{route.route_type.toUpperCase()}</p>
        </div>
        {badge && (
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
            {badge}
          </span>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
        <div>
          <div className="text-2xl font-bold text-blue-600">${route.cost.total_cost.toFixed(2)}</div>
          <div className="text-xs text-gray-600 mt-1">Total Cost</div>
          <div className="text-xs text-gray-500">Rank: #{route.cost_rank}</div>
        </div>

        <div>
          <div className="text-2xl font-bold text-green-600">{route.estimated_time_minutes}m</div>
          <div className="text-xs text-gray-600 mt-1">Delivery Time</div>
          <div className="text-xs text-gray-500">Rank: #{route.time_rank}</div>
        </div>

        <div>
          <div className="text-2xl font-bold text-purple-600">{route.reliability_score.toFixed(1)}%</div>
          <div className="text-xs text-gray-600 mt-1">Success Rate</div>
          <div className="text-xs text-gray-500">Rank: #{route.success_rank}</div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">Cost Breakdown</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Provider Fee</span>
            <span className="font-semibold">${route.cost.provider_fee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">FX Spread</span>
            <span className="font-semibold">${route.cost.fx_spread.toFixed(2)}</span>
          </div>
          {route.cost.network_fee > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Network Fee</span>
              <span className="font-semibold">${route.cost.network_fee.toFixed(2)}</span>
            </div>
          )}
          {route.cost.off_ramp_cost > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Off-Ramp Cost</span>
              <span className="font-semibold">${route.cost.off_ramp_cost.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">How It Works</h4>
        <ol className="space-y-2 text-sm">
          {route.steps.map((step, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="font-bold text-blue-600 flex-shrink-0">{idx + 1}.</span>
              <span className="text-gray-700">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Warnings */}
      {route.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h4 className="font-semibold text-yellow-800 text-sm mb-2"> Important Notes</h4>
          <ul className="space-y-1 text-sm text-yellow-700">
            {route.warnings.map((warning, idx) => (
              <li key={idx}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Overall Rank */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-semibold">Overall Ranking</span>
          <span className="text-3xl font-bold text-blue-600">#{route.overall_rank}</span>
        </div>
      </div>
    </div>
  );
};

interface RouteListProps {
  routes: RouteOption[];
  cheapestRoute?: string | null;
  fastestRoute?: string | null;
  bestRoute?: string | null;
  destinationAmount: number;
  destCurrency: string;
}

export const RouteList: React.FC<RouteListProps> = ({
  routes,
  cheapestRoute,
  fastestRoute,
  bestRoute,
}) => {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-sm text-blue-800 font-semibold mb-1">💰 Cheapest Option</div>
          <div className="text-xl font-bold text-blue-900">
            {routes.find((r) => r.route_id === cheapestRoute)?.provider || 'N/A'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-800 font-semibold mb-1">⚡ Fastest Option</div>
          <div className="text-xl font-bold text-green-900">
            {routes.find((r) => r.route_id === fastestRoute)?.provider || 'N/A'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-sm text-purple-800 font-semibold mb-1">🏆 Best Overall</div>
          <div className="text-xl font-bold text-purple-900">
            {routes.find((r) => r.route_id === bestRoute)?.provider || 'N/A'}
          </div>
        </div>
      </div>

      {/* Routes */}
      <div className="space-y-4">
        {routes.map((route) => (
          <RouteCard
            key={route.route_id}
            route={route}
            isHighlighted={route.route_id === bestRoute}
            badge={
              route.route_id === bestRoute
                ? '🏆 Best'
                : route.route_id === cheapestRoute
                  ? '💰 Cheapest'
                  : route.route_id === fastestRoute
                    ? '⚡ Fastest'
                    : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};
