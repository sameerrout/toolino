'use client';

import React from 'react';
import {
  Users,
  Activity,
  KeyRound,
  Eye,
  Wrench,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { OverviewStats, DashboardTab } from './types';

interface OverviewSectionProps {
  overview: OverviewStats;
  onNavigateTab: (tab: DashboardTab) => void;
  onOpenUserModal?: (userId: string) => void;
}

export function OverviewSection({ overview, onNavigateTab, onOpenUserModal }: OverviewSectionProps) {
  const maxTrend = Math.max(
    ...overview.dailyTrends.map((d) => Math.max(d.pageViews, d.toolExecutions)),
    10
  );

  return (
    <div className="space-y-6">
      {/* 1. Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Active Visitors */}
        <div
          onClick={() => onNavigateTab('visitors')}
          className="group relative cursor-pointer rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/80 to-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-900">Live Visitors</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {overview.activeVisitors.total}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">active now</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {overview.activeVisitors.authenticated} auth · {overview.activeVisitors.anonymous} anon
          </p>
        </div>

        {/* Registered Users */}
        <div
          onClick={() => onNavigateTab('users')}
          className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-700">Registered Users</span>
            <Users className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {overview.totalRegisteredUsers}
            </span>
            {overview.newRegistrationsToday > 0 && (
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                +{overview.newRegistrationsToday} today
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Total verified accounts
          </p>
        </div>

        {/* Logins Today */}
        <div
          onClick={() => onNavigateTab('logins')}
          className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-700">Logins Today</span>
            <KeyRound className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {overview.successfulLoginsToday}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">successful</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Authentications today
          </p>
        </div>

        {/* Page Views Today */}
        <div
          onClick={() => onNavigateTab('pageviews')}
          className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-700">Page Views Today</span>
            <Eye className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {overview.pageViewsToday}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">views</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Excludes manager traffic
          </p>
        </div>

        {/* Tool Executions Today */}
        <div
          onClick={() => onNavigateTab('tools')}
          className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-700">Tool Executions Today</span>
            <Wrench className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {overview.toolExecutionsToday}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">today</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {overview.totalToolExecutionsPeriod} in period
          </p>
        </div>

        {/* Distinct Tools Used */}
        <div
          onClick={() => onNavigateTab('tools')}
          className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold text-slate-700">Distinct Tools Used</span>
            <Sparkles className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {overview.distinctToolsUsed}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">/ 26 tools</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Tools actively executed
          </p>
        </div>
      </div>

      {/* 2. Most Popular Tools & 7-Day Activity Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Popular Tools */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Most Popular Tools</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('tools')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
            >
              View all tools <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {overview.mostPopularTools.length === 0 || overview.mostPopularTools.every((t) => t.totalExecutions === 0) ? (
            <div className="py-10 text-center text-slate-400">
              <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No tool execution events recorded in this period.</p>
              <p className="text-xs text-slate-400 mt-1">Tools will rank automatically as users execute operations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overview.mostPopularTools
                .filter((t) => t.totalExecutions > 0)
                .slice(0, 5)
                .map((tool, idx) => (
                  <div
                    key={tool.toolSlug}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-700">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {tool.toolName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {tool.toolSlug}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div className="w-20 hidden sm:block">
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(100, tool.percentage)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900">
                          {tool.totalExecutions}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {tool.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Daily Activity Trends (7 Days) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Daily Activity Trends (7 Days)</h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" /> Page views
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Tool runs
              </span>
            </div>
          </div>

          <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-slate-100">
            {overview.dailyTrends.map((day) => {
              const viewHeight = Math.max(4, (day.pageViews / maxTrend) * 100);
              const toolHeight = Math.max(4, (day.toolExecutions / maxTrend) * 100);
              const label = day.date.slice(5); // MM-DD

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-36">
                    {/* Page views bar */}
                    <div
                      className="w-2.5 sm:w-3.5 bg-blue-600 rounded-t transition-all group-hover:bg-blue-700 relative"
                      style={{ height: `${viewHeight}%` }}
                      title={`${day.date}: ${day.pageViews} page views`}
                    />
                    {/* Tool executions bar */}
                    <div
                      className="w-2.5 sm:w-3.5 bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-600 relative"
                      style={{ height: `${toolHeight}%` }}
                      title={`${day.date}: ${day.toolExecutions} tool executions`}
                    />
                  </div>
                  <span className="mt-2 text-[10px] font-medium text-slate-500">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Recent Activity Split: Successful Logins & Tool Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Successful Logins */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Recent Successful Logins</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('logins')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
            >
              View history <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {overview.recentSuccessfulLogins.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <KeyRound className="h-7 w-7 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No recent login events recorded.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {overview.recentSuccessfulLogins.slice(0, 6).map((ev) => (
                <div key={ev.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span
                      onClick={() => onOpenUserModal && ev.userId && onOpenUserModal(ev.userId)}
                      className="font-medium text-slate-800 truncate cursor-pointer hover:text-blue-600"
                      title={ev.email}
                    >
                      {ev.email}
                    </span>
                    <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                      {ev.method}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(ev.timestamp).toLocaleDateString('en-GB', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tool Activity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Wrench className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Recent Tool Activity</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('tools')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
            >
              View analytics <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {overview.recentToolActivity.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Wrench className="h-7 w-7 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No tool activity recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {overview.recentToolActivity.slice(0, 6).map((exec) => (
                <div key={exec.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        exec.status === 'completed'
                          ? 'bg-emerald-500'
                          : exec.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <span className="font-semibold text-slate-900 truncate">
                      {exec.toolName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      ({exec.status})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(exec.timestamp).toLocaleDateString('en-GB', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
