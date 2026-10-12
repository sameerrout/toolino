'use client';

import React, { useState } from 'react';
import {
  KeyRound,
  Search,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { LoginEventItem } from './types';

interface LoginHistorySectionProps {
  loginHistory: {
    totalCount: number;
    events: LoginEventItem[];
  };
  onOpenUserModal?: (userId: string) => void;
}

export function LoginHistorySection({
  loginHistory,
  onOpenUserModal,
}: LoginHistorySectionProps) {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'google' | 'email'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failure'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const events = loginHistory.events;

  const filtered = events.filter((ev) => {
    if (methodFilter !== 'all' && ev.method !== methodFilter) return false;
    if (statusFilter !== 'all' && ev.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchEmail = ev.email.toLowerCase().includes(q);
      const matchId = ev.userId?.toLowerCase().includes(q);
      if (!matchEmail && !matchId) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const successfulCount = events.filter((e) => e.status === 'success').length;
  const failedCount = events.filter((e) => e.status === 'failure').length;
  const successRate = events.length > 0 ? Math.round((successfulCount / events.length) * 100) : 100;

  return (
    <div className="space-y-5">
      {/* 1. Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Recorded Events</span>
          <p className="mt-2 text-2xl font-black text-slate-900">{loginHistory.totalCount}</p>
          <span className="text-[11px] text-slate-400">Auth lifecycle events</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-emerald-700">Successful Logins</span>
          <p className="mt-2 text-2xl font-black text-emerald-600">{successfulCount}</p>
          <span className="text-[11px] text-slate-400">Authenticated sessions</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-red-700">Failed Attempts</span>
          <p className="mt-2 text-2xl font-black text-red-600">{failedCount}</p>
          <span className="text-[11px] text-slate-400">Rejected attempts</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-blue-700">Success Rate</span>
          <p className="mt-2 text-2xl font-black text-blue-600">{successRate}%</p>
          <span className="text-[11px] text-slate-400">Authentication health</span>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search login events by email or User ID..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Method Filter */}
          <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="font-medium text-slate-500">Method:</span>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value as 'all' | 'google' | 'email');
                setCurrentPage(1);
              }}
              className="bg-transparent font-semibold text-slate-900 border-none outline-none cursor-pointer"
            >
              <option value="all">All Methods</option>
              <option value="google">Google OAuth</option>
              <option value="email">Email / Password</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="font-medium text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'success' | 'failure');
                setCurrentPage(1);
              }}
              className="bg-transparent font-semibold text-slate-900 border-none outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="success">Successful</option>
              <option value="failure">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Login Events Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Authentication Audit Logs ({filtered.length} events)
            </h3>
          </div>
        </div>

        {paginated.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <KeyRound className="h-10 w-10 mx-auto mb-2 opacity-30 text-blue-500" />
            <p className="text-sm font-medium text-slate-700">No login events match your filters</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User / Email</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Failure Reason</th>
                  <th className="px-4 py-3">Session Token</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {new Date(ev.timestamp).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        onClick={() => ev.userId && onOpenUserModal && onOpenUserModal(ev.userId)}
                        className={`font-semibold text-slate-900 truncate max-w-[200px] block ${
                          ev.userId ? 'cursor-pointer hover:text-blue-600' : ''
                        }`}
                        title={ev.email}
                      >
                        {ev.email}
                      </span>
                      {ev.userId && (
                        <span className="font-mono text-[10px] text-slate-400 block truncate max-w-[150px]">
                          {ev.userId}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${
                          ev.method === 'google'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ev.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium capitalize text-slate-800">
                      {ev.eventType}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          ev.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {ev.status === 'success' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {ev.status === 'success' ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {ev.failureReason ? (
                        <span className="text-red-600 font-medium">{ev.failureReason}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400 truncate max-w-[120px]" title={ev.sessionId}>
                      {ev.sessionId ? ev.sessionId.slice(0, 14) + '...' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
