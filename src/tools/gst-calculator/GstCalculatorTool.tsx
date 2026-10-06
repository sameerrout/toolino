'use client';

import { useMemo, useState } from 'react';
import { PlusCircle, MinusCircle, Copy, Check } from 'lucide-react';
import { useAdFreeZone } from '@/components/ads/AdSlot';
import {
  calculateGst,
  formatGstCurrency,
  CONFIGURABLE_GST_RATES,
  type GstCalculationMode,
  type GstTransactionType,
} from './engine';

export function GstCalculatorTool() {
  const [amount, setAmount] = useState('10000');
  const [rate, setRate] = useState('18');
  const [customRate, setCustomRate] = useState('');
  const [mode, setMode] = useState<GstCalculationMode>('addGst');
  const [transactionType, setTransactionType] = useState<GstTransactionType>('intraState');
  const [copied, setCopied] = useState(false);

  useAdFreeZone(true);

  const effectiveRate = parseFloat(customRate || rate) || 0;

  const result = useMemo(() => {
    return calculateGst({
      amount: parseFloat(amount) || 0,
      rate: effectiveRate,
      mode,
      transactionType,
    });
  }, [amount, effectiveRate, mode, transactionType]);

  const handleCopy = () => {
    const text = `Base: ${formatGstCurrency(result.baseAmount)}, GST (${result.gstRate}%): ${formatGstCurrency(result.totalGstAmount)}, Total: ${formatGstCurrency(result.totalAmount)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode('addGst')}
          className={`flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-semibold transition ${
            mode === 'addGst'
              ? 'border-brand-500 bg-brand-50 text-brand-900 ring-2 ring-brand-500/20'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <PlusCircle className="h-5 w-5 text-brand-600" />
          <span>Add GST (Exclusive)</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('removeGst')}
          className={`flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-semibold transition ${
            mode === 'removeGst'
              ? 'border-brand-500 bg-brand-50 text-brand-900 ring-2 ring-brand-500/20'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <MinusCircle className="h-5 w-5 text-brand-600" />
          <span>Remove GST (Inclusive)</span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Inputs */}
        <div className="card space-y-5 lg:col-span-6">
          <h2 className="text-base font-semibold text-slate-900">
            {mode === 'addGst' ? 'Base Amount & GST Rate' : 'Total Amount & GST Rate'}
          </h2>

          <div>
            <label className="field-label">
              {mode === 'addGst' ? 'Initial Net Amount (Excluding GST)' : 'Gross Invoice Total (Including GST)'}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="field-input"
              placeholder="e.g. 10000"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="field-label mb-1">Common GST Rate Options</label>
              <span className="text-[11px] text-slate-500">Subject to HSN/SAC classification</span>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              The applicable GST rate depends on the product or service classification and current GST rules. Verify the applicable HSN/SAC rate before invoicing or filing.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CONFIGURABLE_GST_RATES.map((preset) => {
                const isSelected = customRate === '' && rate === String(preset.rate);
                return (
                  <button
                    key={preset.rate}
                    type="button"
                    onClick={() => {
                      setRate(String(preset.rate));
                      setCustomRate('');
                    }}
                    className={`rounded-xl border p-2 text-center text-sm font-medium transition ${
                      isSelected
                        ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>{preset.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="field-label">Custom GST Rate (%) [Optional]</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value)}
              className="field-input"
              placeholder="Or type custom rate, e.g. 7.5"
            />
          </div>

          <div>
            <label className="field-label">Transaction Jurisdiction</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransactionType('intraState')}
                className={`rounded-xl border p-3 text-left text-xs transition ${
                  transactionType === 'intraState'
                    ? 'border-brand-500 bg-brand-50 font-semibold text-brand-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold">Intra-State</div>
                <div className="text-slate-500">CGST + SGST (50/50)</div>
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('interState')}
                className={`rounded-xl border p-3 text-left text-xs transition ${
                  transactionType === 'interState'
                    ? 'border-brand-500 bg-brand-50 font-semibold text-brand-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold">Inter-State</div>
                <div className="text-slate-500">IGST (100%)</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Results */}
        <div className="card space-y-5 lg:col-span-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Tax Invoice Summary</h2>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Breakdown'}
            </button>
          </div>

          <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-5 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">
              {mode === 'addGst' ? 'Total Invoice Amount' : 'Net Base Price (Excluding Tax)'}
            </span>
            <div className="mt-1 text-3xl font-extrabold text-brand-950 sm:text-4xl">
              {formatGstCurrency(mode === 'addGst' ? result.totalAmount : result.baseAmount)}
            </div>
            <div className="mt-2 text-sm text-brand-800">
              GST Tax ({result.gstRate}%): <span className="font-bold">{formatGstCurrency(result.totalGstAmount)}</span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2 text-slate-600">
              <span>Net Base Price</span>
              <span className="font-semibold text-slate-900">{formatGstCurrency(result.baseAmount)}</span>
            </div>
            {result.transactionType === 'intraState' ? (
              <>
                <div className="flex justify-between py-2 text-slate-600">
                  <span>CGST ({result.cgstRate}%)</span>
                  <span className="font-semibold text-slate-900">{formatGstCurrency(result.cgstAmount)}</span>
                </div>
                <div className="flex justify-between py-2 text-slate-600">
                  <span>SGST ({result.sgstRate}%)</span>
                  <span className="font-semibold text-slate-900">{formatGstCurrency(result.sgstAmount)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-2 text-slate-600">
                <span>IGST ({result.igstRate}%)</span>
                <span className="font-semibold text-slate-900">{formatGstCurrency(result.igstAmount)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 text-slate-600">
              <span>Total GST Amount ({result.gstRate}%)</span>
              <span className="font-semibold text-emerald-600">+{formatGstCurrency(result.totalGstAmount)}</span>
            </div>
            <div className="flex justify-between py-2.5 font-bold text-slate-900">
              <span>Gross Total Amount</span>
              <span className="text-base text-brand-700">{formatGstCurrency(result.totalAmount)}</span>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400">
            For estimation and invoicing assistance only. Does not replace professional tax or legal advice. Verify current rate schedules with official tax authorities.
          </p>
        </div>
      </div>
    </div>
  );
}
