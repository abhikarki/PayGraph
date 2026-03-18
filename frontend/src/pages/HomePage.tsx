import React, { useState, useEffect } from 'react';
import { InputSidebar } from '../components/InputSidebar';
import { RouteTable } from '../components/RouteTable';
import { NetworkHealth } from '../components/NetworkHealth';
import { TextBasedPathView } from '../components/TextBasedPathView';
import { paymentAPI } from '../services/api';
import { PaymentIntentResponse, PaymentConstraint, CurrencyCode, OptimizationMode } from '../types/payment';
import { motion } from 'framer-motion';

export const HomePage: React.FC = () => {
  const [result, setResult] = useState<PaymentIntentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Check API connection on mount
  useEffect(() => {
    const checkAPI = async () => {
      try {
        await paymentAPI.getHealth();
        setApiConnected(true);
      } catch {
        setApiConnected(false);
      }
    };
    checkAPI();
  }, []);

  const handleAnalyzeRoutes = async (data: {
    source_currency: CurrencyCode;
    destination_currency: CurrencyCode;
    amount: number;
    destination_country: string;
    constraints?: PaymentConstraint;
    optimization_mode: OptimizationMode;
  }) => {
    setLoading(true);
    setError(null);
    setSelectedRouteId(null);

    try {
      const response = await paymentAPI.analyzeRoutes({
        ...data,
        use_testnet: false,
      });
      setResult(response);

      // Auto-select best overall route
      if (response.best_overall_route) {
        setSelectedRouteId(response.best_overall_route);
      } else if (response.routes.length > 0) {
        setSelectedRouteId(response.routes[0].route_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-14 flex-shrink-0 relative z-20 shadow-sm">
        <div className="h-full px-4 sm:px-6 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">PG</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">PayGraph</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Payment Routing Engine</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${apiConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-xs sm:text-sm text-gray-600">
              {apiConnected ? 'Connected' : 'Disconnected'}
            </span>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Top Section: Input + Path View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Input Sidebar */}
          <InputSidebar onSubmit={handleAnalyzeRoutes} isLoading={loading} />

          {/* Path View Area */}
          <div className="flex-1 overflow-auto relative bg-white">
            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute left-0 right-0 top-3 z-20 mx-auto max-w-2xl px-4"
              >
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 font-medium text-sm">
                  {error}
                </div>
              </motion.div>
            )}

            {/* Text-Based Path View */}
            {result ? (
              <div className="h-full p-4">
                <TextBasedPathView routeData={result} selectedRouteId={selectedRouteId} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <p className="text-sm">Submit a payment analysis to view route details</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Route Table + Network Health */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 border-t border-gray-200 bg-white overflow-y-auto max-h-48"
          >
            <div className="p-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Route Table */}
                <div>
                  <RouteTable
                    routeData={result}
                    selectedRouteId={selectedRouteId}
                    onRouteSelect={setSelectedRouteId}
                  />
                </div>

                {/* Network Health */}
                <div>
                  <NetworkHealth routeData={result} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
