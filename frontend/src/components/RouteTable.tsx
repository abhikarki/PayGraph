import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PaymentIntentResponse } from '../types/payment';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface RouteTableProps {
  routeData: PaymentIntentResponse | null;
  selectedRouteId: string | null;
  onRouteSelect: (routeId: string) => void;
}

type SortKey = 'cost' | 'time' | 'reliability' | 'overall';
type SortOrder = 'asc' | 'desc';

export const RouteTable: React.FC<RouteTableProps> = ({
  routeData,
  selectedRouteId,
  onRouteSelect,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('overall');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  if (!routeData || !routeData.routes) {
    return null;
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedRoutes = [...routeData.routes].sort((a, b) => {
    let aValue: number;
    let bValue: number;

    switch (sortKey) {
      case 'cost':
        aValue = a.cost.total_cost;
        bValue = b.cost.total_cost;
        break;
      case 'time':
        aValue = a.estimated_time_minutes;
        bValue = b.estimated_time_minutes;
        break;
      case 'reliability':
        aValue = a.reliability_score;
        bValue = b.reliability_score;
        break;
      case 'overall':
        aValue = a.overall_rank;
        bValue = b.overall_rank;
        break;
      default:
        aValue = 0;
        bValue = 0;
    }

    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) {
      return <span className="opacity-40 text-gray-400">⇅</span>;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp size={14} className="text-blue-600" />
    ) : (
      <ChevronDown size={14} className="text-blue-600" />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">
          Route Ranking
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th
                className="px-3 py-2 text-left font-semibold text-gray-700 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('cost')}
              >
                <div className="flex items-center gap-1">
                  Cost <SortIcon field="cost" />
                </div>
              </th>
              <th
                className="px-3 py-2 text-left font-semibold text-gray-700 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('time')}
              >
                <div className="flex items-center gap-1">
                  ETA <SortIcon field="time" />
                </div>
              </th>
              <th
                className="px-3 py-2 text-left font-semibold text-gray-700 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('reliability')}
              >
                <div className="flex items-center gap-1">
                  Reliability <SortIcon field="reliability" />
                </div>
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Provider</th>
              <th
                className="px-3 py-2 text-left font-semibold text-gray-700 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => handleSort('overall')}
              >
                <div className="flex items-center gap-1">
                  Score <SortIcon field="overall" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRoutes.map((route) => (
              <motion.tr
                key={route.route_id}
                onClick={() => onRouteSelect(route.route_id)}
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                className={`
                  border-b border-gray-100 cursor-pointer transition-all
                  ${
                    selectedRouteId === route.route_id
                      ? 'bg-blue-50 border-b-blue-300'
                      : 'hover:bg-gray-50'
                  }
                `}
              >
                <td className="px-3 py-2">
                  <span className="font-mono font-semibold text-green-600">
                    ${route.cost.total_cost.toFixed(2)}
                  </span>
                  <div className="text-xs text-gray-500">
                    {route.cost_rank}/{sortedRoutes.length}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="font-semibold text-gray-900">
                    {route.estimated_time_minutes}m
                  </span>
                  <div className="text-xs text-gray-500">
                    {route.time_rank}/{sortedRoutes.length}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${route.reliability_score}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full bg-gradient-to-r from-green-500 to-blue-400"
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-10">
                      {route.reliability_score.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="font-semibold text-gray-900 text-xs">{route.provider}</span>
                </td>
                <td className="px-3 py-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`
                      inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs
                      ${
                        route.overall_rank === 1
                          ? 'bg-yellow-100 text-yellow-700'
                          : route.overall_rank <= 3
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-gray-100 text-gray-600'
                      }
                    `}
                  >
                    {route.overall_rank}
                  </motion.div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
