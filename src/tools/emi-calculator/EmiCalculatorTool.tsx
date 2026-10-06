'use client';

import { useMemo, useState } from 'react';
import { Home, Car, User, GraduationCap, Coins, Check, Copy, Info } from 'lucide-react';
import { useAdFreeZone } from '@/components/ads/AdSlot';
import {
  calculateEmi,
  formatEmiCurrency,
  type TenureUnit,
} from './engine';

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
  locale: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', label: '₹ INR', locale: 'en-IN' },
  { code: 'USD', symbol: '$', label: '$ USD', locale: 'en-US' },
  { code: 'EUR', symbol: '€', label: '€ EUR', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', label: '£ GBP', locale: 'en-GB' },
];

interface PresetConfig {
  id: string;
  label: string;
  amountINR: string;
  amountGlobal: string;
  rateINR: string;
  rateGlobal: string;
  tenure: string;
  unit: TenureUnit;
  icon: typeof Home;
}

const LOAN_PRESETS: PresetConfig[] = [
  { id: 'home', label: 'Home Loan', amountINR: '2500000', amountGlobal: '250000', rateINR: '8.5', rateGlobal: '6.5', tenure: '20', unit: 'years', icon: Home },
  { id: 'car', label: 'Car Loan', amountINR: '800000', amountGlobal: '35000', rateINR: '9.0', rateGlobal: '7.5', tenure: '5', unit: 'years', icon: Car },
  { id: 'personal', label: 'Personal Loan', amountINR: '300000', amountGlobal: '15000', rateINR: '12.0', rateGlobal: '11.0', tenure: '3', unit: 'years', icon: User },
  { id: 'education', label: 'Education Loan', amountINR: '1000000', amountGlobal: '40000', rateINR: '9.5', rateGlobal: '8.5', tenure: '7', unit: 'years', icon: GraduationCap },
  { id: 'custom', label: 'Custom Loan', amountINR: '500000', amountGlobal: '100000', rateINR: '8.5', rateGlobal: '8.0', tenure: '5', unit: 'years', icon: Coins },
];

export function EmiCalculatorTool() {
  const [currency, setCurrency] = useState<CurrencyOption>(CURRENCIES[0]);
  const [activePreset, setActivePreset] = useState('home');
  const [principal, setPrincipal] = useState('2500000');
  const [rate, setRate] = useState('8.5');
  const [tenure, setTenure] = useState('20');
  const [tenureUnit, setTenureUnit] = useState<TenureUnit>('years');
  const [showSchedule, setShowSchedule] = useState(false);
  const [copied, setCopied] = useState(false);

  useAdFreeZone(true);

  const applyCurrency = (selected: CurrencyOption) => {
    setCurrency(selected);
    const p = LOAN_PRESETS.find((item) => item.id === activePreset);
    if (p) {
      const isINR = selected.code === 'INR';
      setPrincipal(isINR ? p.amountINR : p.amountGlobal);
      setRate(isINR ? p.rateINR : p.rateGlobal);
    }
  };

  const applyPreset = (presetId: string) => {
    const p = LOAN_PRESETS.find((item) => item.id === presetId);
    if (!p) return;
    setActivePreset(p.id);
    const isINR = currency.code === 'INR';
    setPrincipal(isINR ? p.amountINR : p.amountGlobal);
    setRate(isINR ? p.rateINR : p.rateGlobal);
    setTenure(p.tenure);
    setTenureUnit(p.unit);
  };

  const result = useMemo(() => {
    return calculateEmi({
      principal: parseFloat(principal) || 0,
      annualRate: parseFloat(rate) || 0,
      tenure: parseFloat(tenure) || 0,
      tenureUnit,
    });
  }, [principal, rate, tenure, tenureUnit]);

  const formatCurrency = (amount: number) => {
    return formatEmiCurrency(amount, currency.symbol, currency.locale);
  };

  const handleCopy = () => {
    const text = `Estimated Monthly EMI: ${formatCurrency(result.monthlyEmi)}, Total Interest: ${formatCurrency(result.totalInterest)}, Total Payment: ${formatCurrency(result.totalPayment)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Currency Selector + Presets */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        {/* Preset selector */}
        <div className="flex flex-wrap gap-2">
          {LOAN_PRESETS.map((p) => {
            const Icon = p.icon;
            const active = activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-medium transition ${
                  active
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Currency selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => applyCurrency(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                currency.code === c.code
                  ? 'bg-white text-brand-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Inputs */}
        <div className="card space-y-4 lg:col-span-6">
          <h2 className="text-base font-semibold text-slate-900">Loan Details</h2>

          <div>
            <div className="flex justify-between">
              <label className="field-label">Loan Amount ({currency.symbol})</label>
              <span className="text-xs font-semibold text-brand-600">{formatCurrency(parseFloat(principal) || 0)}</span>
            </div>
            <input
              type="number"
              min="0"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className="field-input"
              placeholder={currency.code === 'INR' ? 'e.g. 2500000' : 'e.g. 250000'}
            />
          </div>

          <div>
            <div className="flex justify-between">
              <label className="field-label">Interest Rate (% p.a.)</label>
              <span className="text-xs font-semibold text-brand-600">{rate}%</span>
            </div>
            <input
              type="number"
              min="0"
              step="0.05"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="field-input"
              placeholder="e.g. 8.5"
            />
          </div>

          <div>
            <div className="flex justify-between">
              <label className="field-label">Loan Tenure</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTenureUnit('years')}
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    tenureUnit === 'years' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Years
                </button>
                <button
                  type="button"
                  onClick={() => setTenureUnit('months')}
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    tenureUnit === 'months' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Months
                </button>
              </div>
            </div>
            <input
              type="number"
              min="1"
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
              className="field-input"
              placeholder={tenureUnit === 'years' ? '20' : '240'}
            />
          </div>
        </div>

        {/* Right Results */}
        <div className="card space-y-5 lg:col-span-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Estimated EMI Summary</h2>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Result'}
            </button>
          </div>

          <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-5 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">Estimated Monthly EMI</span>
            <div className="mt-1 text-3xl font-extrabold text-brand-950 sm:text-4xl">
              {formatCurrency(result.monthlyEmi)}
            </div>
            <div className="mt-2 text-xs sm:text-sm text-brand-800">
              Estimated monthly EMI based on the information you enter (over <span className="font-bold">{result.totalMonths} months</span>)
            </div>
          </div>

          {/* Visual Bar Breakdown */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-600">
              <span>Principal: {result.principalPercentage.toFixed(1)}%</span>
              <span>Interest: {result.interestPercentage.toFixed(1)}%</span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                style={{ width: `${result.principalPercentage}%` }}
                className="bg-brand-600 transition-all duration-300"
              />
              <div
                style={{ width: `${result.interestPercentage}%` }}
                className="bg-amber-500 transition-all duration-300"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2 text-slate-600">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
                Principal Loan Amount
              </span>
              <span className="font-semibold text-slate-900">{formatCurrency(result.principalAmount)}</span>
            </div>
            <div className="flex justify-between py-2 text-slate-600">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Total Interest Payable
              </span>
              <span className="font-semibold text-amber-700">{formatCurrency(result.totalInterest)}</span>
            </div>
            <div className="flex justify-between py-2 text-slate-600">
              <span className="font-medium text-slate-900">Total Payment (Principal + Interest)</span>
              <span className="font-bold text-slate-900">{formatCurrency(result.totalPayment)}</span>
            </div>
          </div>

          {result.yearlySchedule.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSchedule(!showSchedule)}
              className="w-full rounded-xl border border-slate-200 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showSchedule ? 'Hide Amortization Schedule' : 'Show Yearly Amortization Schedule'}
            </button>
          )}
        </div>
      </div>

      {/* Financial Disclaimer Card */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
        <Info className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Financial Calculation Disclaimer</p>
          <p className="leading-relaxed text-amber-800">
            Estimated monthly EMI based on the information you enter. Actual lender calculations may differ due to loan processing fees, rounding conventions, insurance requirements, compounding frequency, and institution-specific amortisation policies. This calculator is provided for estimation purposes and does not constitute a formal loan offer or financial advice.
          </p>
        </div>
      </div>

      {/* Amortization Table */}
      {showSchedule && result.yearlySchedule.length > 0 && (
        <div className="card space-y-4">
          <h3 className="text-base font-semibold text-slate-900">Yearly Amortization Schedule</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Opening Balance</th>
                  <th className="px-4 py-3">Principal Paid</th>
                  <th className="px-4 py-3">Interest Paid</th>
                  <th className="px-4 py-3">Total Payment</th>
                  <th className="px-4 py-3">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {result.yearlySchedule.map((row) => (
                  <tr key={row.year} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-900">Year {row.year}</td>
                    <td className="px-4 py-3">{formatCurrency(row.openingBalance)}</td>
                    <td className="px-4 py-3 font-medium text-brand-700">{formatCurrency(row.principalPaid)}</td>
                    <td className="px-4 py-3 font-medium text-amber-700">{formatCurrency(row.interestPaid)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.totalPayment)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(row.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
