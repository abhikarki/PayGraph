import React from 'react';
import { motion } from 'framer-motion';
import { PaymentIntentResponse } from '../types/payment';

interface ExecutionTimelineProps {
  routeData: PaymentIntentResponse | null;
  selectedRouteId: string | null;
}

const TIMELINE_STEPS = [
  { id: 'funding', label: 'Funding', icon: '💳', description: 'Source account debited' },
  { id: 'conversion', label: 'Conversion', icon: '💱', description: 'FX conversion' },
  { id: 'transfer', label: 'Transfer', icon: '🔄', description: 'Inter-bank transfer' },
  { id: 'settlement', label: 'Settlement', icon: '✓', description: 'Liquidity settlement' },
  { id: 'payout', label: 'Payout', icon: '📥', description: 'Destination received' },
];

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  routeData,
  selectedRouteId,
}) => {
  if (!routeData || !selectedRouteId) {
    return null;
  }

  const selectedRoute = routeData.routes.find((r) => r.route_id === selectedRouteId);
  if (!selectedRoute) {
    return null;
  }

  const stepDuration = selectedRoute.estimated_time_minutes / TIMELINE_STEPS.length;
  const failureRatePerStep = (1 - selectedRoute.reliability_score) / TIMELINE_STEPS.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-blue-500/20 rounded-lg p-6"
    >
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span>⏱️</span>
        Execution Timeline
      </h3>

      {/* Timeline Steps */}
      <div className="space-y-4">
        {TIMELINE_STEPS.map((step, index) => {
          const failureProbability = Math.max(0, Math.min(1, failureRatePerStep * (index + 1)));
          const delayOffset = index * 0.1;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delayOffset }}
              className="flex gap-4 items-start"
            >
              {/* Step Marker */}
              <motion.div
                whileHover={{ scale: 1.15 }}
                className="flex-shrink-0 mt-1"
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold
                  ${index === 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : 'bg-slate-700 text-gray-300'}
                `}>
                  {step.icon}
                </div>
              </motion.div>

              {/* Step Details */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-white">{step.label}</h4>
                    <p className="text-xs text-gray-400">{step.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-cyan-400">
                      {stepDuration.toFixed(1)} min
                    </p>
                    <p className="text-xs text-gray-500">
                      Failure: {(failureProbability * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-2 items-center">
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.8, delay: delayOffset + 0.2 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                    />
                  </div>
                  {index < TIMELINE_STEPS.length - 1 && (
                    <div className="text-green-400 text-sm">→</div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Total Time Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex justify-between items-center"
      >
        <div>
          <p className="text-sm text-gray-400">Total Estimated Time</p>
          <p className="text-2xl font-bold text-white">
            {selectedRoute.estimated_time_minutes} minutes
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Success Probability</p>
          <p className="text-2xl font-bold text-green-400">
            {(selectedRoute.reliability_score * 100).toFixed(0)}%
          </p>
        </div>
      </motion.div>

      {/* Provider Info */}
      {selectedRoute.warnings && selectedRoute.warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
        >
          <p className="text-sm font-semibold text-yellow-300 mb-2"> Warnings</p>
          <ul className="text-xs text-yellow-200 space-y-1">
            {selectedRoute.warnings.map((warning, idx) => (
              <li key={idx}>• {warning}</li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
};
