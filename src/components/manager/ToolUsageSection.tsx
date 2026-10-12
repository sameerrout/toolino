'use client';

import React, { useState } from 'react';
import {
  Wrench,
  Search,
  TrendingUp,
  Sparkles,
  Users,
  UserX,
  CheckCircle2,
  XCircle,
  Activity,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { ToolUsageItem, ToolExecutionItem } from './types';

interface ToolUsageSectionProps {
  toolUsage: {
    summary: {
      totalExecutions: number;
      completedExecutions: number;
      failedExecutions: number;
      distinctToolsUsed: number;
      mostPopularTool?: { toolSlug: string; toolName: string; count: number };
      uniqueUsersCount: number;
      uniqueAnonymousCount: number;
    };
    tools: ToolUsageItem[];
    recentExecutions: ToolExecutionItem[];
  };
  onOpenUserModal?: (userId: string) => void;
}

export function ToolUsageSection({ toolUsage, onOpenUserModal }: ToolUsageSectionProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ranking' | 'executions'>('ranking');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const { summary, tools, recentExecutions } = toolUsage;

  const filteredTools = tools.filter((t) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return t.toolName.toLowerCase().includes(q) || t.toolSlug.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filteredTools.length / pageSize) || 1;
  const paginatedTools = filteredTools.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const topRankedTools = tools.filter((t) => t.totalExecutions > 0).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Executions */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/80 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-blue-900">
            <span className="text-xs font-bold uppercase tracking-wider">Total Operations</span>
            <Wrench className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {summary.totalExecutions}
            </span>
            <span className="text-xs font-medium text-slate-500">runs</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {summary.completedExecutions} completed · {summary.failedExecutions} failed
          </p>
        </div>

        {/* Distinct Tools Used */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">Distinct Tools Used</span>
            <Sparkles className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {summary.distinctToolsUsed}
            </span>
            <span className="text-xs font-medium text-slate-500">/ 26 available</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Tools executed at least once in period
          </p>
        </div>

        {/* Most Popular Tool */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">Most Popular Tool</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <p className="text-lg font-bold text-slate-900 truncate" title={summary.mostPopularTool?.toolName}>
              {summary.mostPopularTool ? summary.mostPopularTool.toolName : 'None Yet'}
            </p>
            <span className="text-xs font-semibold text-emerald-600">
              {summary.mostPopularTool ? `${summary.mostPopularTool.count} executions` : '0 executions'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 font-mono truncate">
            {summary.mostPopularTool?.toolSlug || '—'}
          </p>
        </div>

        {/* Registered Users Using Tools */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">Registered Users</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {summary.uniqueUsersCount}
            </span>
            <span className="text-xs font-medium text-slate-500">members</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Distinct signed-in accounts using tools
          </p>
        </div>

        {/* Anonymous Sessions Using Tools */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">Anonymous Visitors</span>
            <UserX className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {summary.uniqueAnonymousCount}
            </span>
            <span className="text-xs font-medium text-slate-500">sessions</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Unique pseudonymous visitor sessions
          </p>
        </div>
      </div>

      {/* 2. Visual Popularity Ranking Card */}
      {topRankedTools.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Top Ranked Tools by Volume</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {topRankedTools.map((t, idx) => (
              <div
                key={t.toolSlug}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 flex flex-col justify-between hover:bg-slate-50 transition"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-blue-700">#{idx + 1}</span>
                    <span className="font-bold text-slate-900">{t.totalExecutions} runs</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate" title={t.toolName}>
                    {t.toolName}
                  </p>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${Math.min(100, t.percentage)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block text-right font-medium">
                    {t.percentage}% share
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Sub-tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('ranking')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'ranking'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tool Usage Table ({tools.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('executions')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'executions'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Recent Execution Logs ({recentExecutions.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search tools by name or slug..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition"
          />
        </div>
      </div>

      {/* 4. Tool Usage Table */}
      {activeTab === 'ranking' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3 text-center">Rank</th>
                  <th className="px-4 py-3">Tool Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3 text-right">Total Executions</th>
                  <th className="px-4 py-3 text-right">Completed</th>
                  <th className="px-4 py-3 text-right">Failed</th>
                  <th className="px-4 py-3 text-right">Unique Members</th>
                  <th className="px-4 py-3 text-right">Unique Anon</th>
                  <th className="px-4 py-3">Last Used</th>
                  <th className="px-4 py-3 text-right">Share (%)</th>
                  <th className="px-4 py-3 text-center">Open Tool</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTools.map((t, idx) => {
                  const globalRank = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={t.toolSlug} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ${
                            globalRank <= 3 && t.totalExecutions > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          #{globalRank}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {t.toolName}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {t.toolSlug}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-blue-600">
                        {t.totalExecutions}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">
                        {t.completedCount}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-400">
                        {t.failedCount > 0 ? (
                          <span className="text-red-600 font-bold">{t.failedCount}</span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {t.uniqueUsers}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {t.uniqueAnonymous}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {t.lastUsedAt
                          ? new Date(t.lastUsedAt).toLocaleDateString('en-GB', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">
                        {t.percentage}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/tools/${t.toolSlug}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-slate-400 hover:text-blue-600 transition"
                          title="Open public tool page"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
      )}

      {/* 5. Recent Execution Logs */}
      {activeTab === 'executions' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {recentExecutions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Activity className="h-10 w-10 mx-auto mb-2 opacity-30 text-blue-500" />
              <p className="text-sm font-medium text-slate-700">No tool executions recorded in this period</p>
              <p className="text-xs text-slate-400 mt-1">Executions appear automatically when visitors run operations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Tool Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Session / User</th>
                    <th className="px-4 py-3 text-right">Duration</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentExecutions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {new Date(exec.timestamp).toLocaleString('en-GB')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {exec.toolName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            exec.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : exec.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {exec.status === 'completed' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : exec.status === 'failed' ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <Activity className="h-3 w-3" />
                          )}
                          {exec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 truncate max-w-[150px]">
                        {exec.userId ? (
                          <span
                            onClick={() => onOpenUserModal && onOpenUserModal(exec.userId!)}
                            className="text-blue-600 font-semibold cursor-pointer hover:underline"
                          >
                            {exec.userId}
                          </span>
                        ) : (
                          exec.visitorSessionId?.slice(0, 14) || 'anon'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-500">
                        {exec.durationMs ? `${exec.durationMs}ms` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-[11px] truncate max-w-[200px]">
                        {exec.errorMessage || 'Successful operation'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
