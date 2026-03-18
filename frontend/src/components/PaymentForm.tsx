import React, { useState } from 'react';
import { CurrencyCode, PaymentConstraint } from '../types/payment';

interface PaymentFormProps {
  onSubmit: (data: {
    source_currency: CurrencyCode;
    destination_currency: CurrencyCode;
    amount: number;
    destination_country: string;
    constraints?: PaymentConstraint;
  }) => Promise<void>;
  isLoading: boolean;
}

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'BRL', 'INR', 'MXN', 'ZAR', 'JPY'];
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

export const PaymentForm: React.FC<PaymentFormProps> = ({ onSubmit, isLoading }) => {
  const [sourceCurrency, setSourceCurrency] = useState<CurrencyCode>('USD');
  const [destCurrency, setDestCurrency] = useState<CurrencyCode>('BRL');
  const [amount, setAmount] = useState<string>('500');
  const [destCountry, setDestCountry] = useState<string>('BR');
  const [maxCost, setMaxCost] = useState<string>('');
  const [maxTime, setMaxTime] = useState<string>('');
  const [minReliability, setMinReliability] = useState<string>('');

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
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Send Money Internationally</h2>

      {/* Amount Section */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
              min="1"
              step="0.01"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select
            value={sourceCurrency}
            onChange={(e) => setSourceCurrency(e.target.value as CurrencyCode)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer font-semibold"
          >
            {CURRENCIES.map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Destination Section */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Send To Currency</label>
          <select
            value={destCurrency}
            onChange={(e) => setDestCurrency(e.target.value as CurrencyCode)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer"
          >
            {CURRENCIES.map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Destination Country</label>
          <select
            value={destCountry}
            onChange={(e) => setDestCountry(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Optional Constraints */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Optional Preferences</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Max Cost %</label>
            <input
              type="number"
              value={maxCost}
              onChange={(e) => setMaxCost(e.target.value)}
              placeholder="e.g., 2.5"
              step="0.1"
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Max Time (minutes)</label>
            <input
              type="number"
              value={maxTime}
              onChange={(e) => setMaxTime(e.target.value)}
              placeholder="e.g., 60"
              step="5"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Min Reliability %</label>
            <input
              type="number"
              value={minReliability}
              onChange={(e) => setMinReliability(e.target.value)}
              placeholder="e.g., 95"
              step="1"
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        {isLoading ? 'Analyzing Routes...' : 'Compare Routes'}
      </button>
    </form>
  );
};
