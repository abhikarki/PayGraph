import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { CurrencyCode, PaymentConstraint, OptimizationMode } from '../types/payment';

interface InputSidebarProps {
  onSubmit: (data: {
    source_currency: CurrencyCode;
    destination_currency: CurrencyCode;
    amount: number;
    destination_country: string;
    constraints?: PaymentConstraint;
    optimization_mode: OptimizationMode;
  }) => Promise<void>;
  isLoading: boolean;
}

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'BRL', 'INR', 'MXN', 'ZAR', 'NGN', 'JPY'];
const COUNTRIES: { code: string; name: string }[] = [
  { code: 'US', name: 'United States' },
  { code: 'BR', name: 'Brazil' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IN', name: 'India' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'JP', name: 'Japan' },
];

const OPTIMIZATION_MODES: { value: OptimizationMode; label: string }[] = [
  { value: 'best_overall', label: 'Best Overall' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'fastest', label: 'Fastest' },
  { value: 'most_reliable', label: 'Reliable' },
  { value: 'liquidity_safe', label: 'Liquidity Safe' },
  { value: 'weekend_safe', label: 'Weekend Safe' },
];

export const InputSidebar: React.FC<InputSidebarProps> = ({ onSubmit, isLoading }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sourceCurrency, setSourceCurrency] = useState<CurrencyCode>('USD');
  const [destCurrency, setDestCurrency] = useState<CurrencyCode>('BRL');
  const [amount, setAmount] = useState<string>('500');
  const [destCountry, setDestCountry] = useState<string>('BR');
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('best_overall');
  const [maxCost, setMaxCost] = useState<string>('');
  const [maxTime, setMaxTime] = useState<string>('');
  const [minReliability, setMinReliability] = useState<string>('');
  const [showConstraints, setShowConstraints] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const constraints: PaymentConstraint = {};
    if (maxCost) constraints.max_cost_percentage = parseFloat(maxCost);
    if (maxTime) constraints.max_time_minutes = parseInt(maxTime);
    if (minReliability) constraints.min_reliability_score = parseFloat(minReliability);

    await onSubmit({
      source_currency: sourceCurrency,
      destination_currency: destCurrency,
      amount: parseFloat(amount),
      destination_country: destCountry,
      constraints: Object.keys(constraints).length > 0 ? constraints : undefined,
      optimization_mode: optimizationMode,
    });
    
    setMobileOpen(false);
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Amount</label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
              min="1"
              step="0.01"
              required
              className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
            />
          </div>
          <select
            value={sourceCurrency}
            onChange={(e) => setSourceCurrency(e.target.value as CurrencyCode)}
            className="px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-medium text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            {CURRENCIES.map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Destination */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Send To</label>
        <div className="flex gap-2">
          <select
            value={destCurrency}
            onChange={(e) => setDestCurrency(e.target.value as CurrencyCode)}
            className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            {CURRENCIES.map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </select>
          <select
            value={destCountry}
            onChange={(e) => setDestCountry(e.target.value)}
            className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Optimization Mode */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Priority</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPTIMIZATION_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setOptimizationMode(mode.value)}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                optimizationMode === mode.value
                  ? 'bg-blue-600 text-white border border-blue-600'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-gray-400'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Constraints Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowConstraints(!showConstraints)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        >
          {showConstraints ? '▼' : '▶'} Constraints
        </button>

        <AnimatePresence>
          {showConstraints && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 mt-2 overflow-hidden"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Max Cost %</label>
                <input
                  type="number"
                  value={maxCost}
                  onChange={(e) => setMaxCost(e.target.value)}
                  placeholder="e.g., 2.5"
                  step="0.1"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-xs placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Max Time (min)</label>
                <input
                  type="number"
                  value={maxTime}
                  onChange={(e) => setMaxTime(e.target.value)}
                  placeholder="e.g., 120"
                  step="1"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-xs placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Min Reliability</label>
                <input
                  type="number"
                  value={minReliability}
                  onChange={(e) => setMinReliability(e.target.value)}
                  placeholder="e.g., 0.9"
                  step="0.05"
                  min="0"
                  max="1"
                  className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-xs placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-1.5 px-4 rounded-lg font-semibold text-white transition-all text-sm ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed opacity-50'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isLoading ? 'Analyzing...' : 'Analyze Routes'}
      </button>
    </form>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="hidden md:hidden fixed top-16 left-4 z-50 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 bg-black/20 z-40"
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Fixed Left Panel */}
      <div className="hidden md:block w-72 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto p-4">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Payment Details</h2>
        {formContent}
      </div>

      {/* Mobile Sidebar - Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed left-0 top-0 h-screen w-72 bg-white border-r border-gray-200 z-40 overflow-y-auto p-4"
          >
            <h2 className="text-sm font-bold text-gray-900 mb-3">Payment Details</h2>
            {formContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
