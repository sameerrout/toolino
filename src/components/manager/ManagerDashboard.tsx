'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Radio,
  Users,
  KeyRound,
  Wrench,
  Eye,
  Mail,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Menu,
  X,
  Shield,
} from 'lucide-react';

import {
  DashboardTab,
  DateFilterOption,
  FullDashboardData,
} from './types';

import { OverviewSection } from './OverviewSection';
import { LiveVisitorsSection } from './LiveVisitorsSection';
import { RegisteredUsersSection } from './RegisteredUsersSection';
import { LoginHistorySection } from './LoginHistorySection';
import { ToolUsageSection } from './ToolUsageSection';
import { PageViewsSection } from './PageViewsSection';
import { ContactMessagesSection } from './ContactMessagesSection';
import { SystemStatusSection } from './SystemStatusSection';
import { UserActivityModal } from './UserActivityModal';

export function ManagerDashboard() {
  const [data, setData] = useState<FullDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isMountedRef = useRef(true);

  // Fetch full dashboard statistics
  const fetchDashboardData = useCallback(
    async (isManual = false) => {
      if (isManual) {
        setRefreshing(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('range', dateFilter);
        if (dateFilter === 'custom' && customStart && customEnd) {
          params.set('customStart', customStart);
          params.set('customEnd', customEnd);
        }

        const res = await fetch(`/api/manager/stats/?${params.toString()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (res.status === 401 || res.status === 403) {
          if (isMountedRef.current) {
            setAuthError(true);
            setLoading(false);
            setRefreshing(false);
          }
          return;
        }

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.error || `Server returned HTTP ${res.status}`);
        }

        const json: FullDashboardData = await res.json();
        if (isMountedRef.current) {
          setData(json);
          setLastRefreshedAt(
            new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
          setLoading(false);
          setRefreshing(false);
        }
      } catch (err: unknown) {
        if (isMountedRef.current) {
          console.error('Failed to fetch manager data:', err);
          setError(err instanceof Error ? err.message : 'Failed to connect to manager database');
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [dateFilter, customStart, customEnd]
  );

  // Initial load & when date filter changes
  useEffect(() => {
    isMountedRef.current = true;
    fetchDashboardData(false);
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchDashboardData]);

  // Periodic automatic polling (every 15 seconds)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Avoid polling when user has tab minimized or backgrounded
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      fetchDashboardData(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboardData]);

  // Navigation tabs definition
  const navTabs: {
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeVariant?: 'blue' | 'emerald' | 'amber';
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'visitors',
      label: 'Live Visitors',
      icon: Radio,
      badge: data?.liveVisitors?.totalActive ?? 0,
      badgeVariant: 'emerald',
    },
    {
      id: 'users',
      label: 'Registered Users',
      icon: Users,
      badge: data?.registeredUsers?.totalCount ?? 0,
      badgeVariant: 'blue',
    },
    {
      id: 'logins',
      label: 'Login History',
      icon: KeyRound,
    },
    {
      id: 'tools',
      label: 'Tool Usage Analytics',
      icon: Wrench,
      badge: data?.toolUsage?.summary?.totalExecutions ?? 0,
      badgeVariant: 'blue',
    },
    {
      id: 'pageviews',
      label: 'Page View Analytics',
      icon: Eye,
    },
    {
      id: 'messages',
      label: 'Contact Messages',
      icon: Mail,
      badge: data?.contactMessages?.unread ? data.contactMessages.unread : undefined,
      badgeVariant: 'amber',
    },
    {
      id: 'system',
      label: 'Security & System',
      icon: ShieldCheck,
    },
  ];

  // Auth Error Screen
  if (authError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl text-center space-y-5 border border-slate-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Access Restricted</h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              This Manager Dashboard is strictly reserved for verified authorized administrator accounts:
            </p>
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 text-left space-y-1">
              <div>• sameerrout2004@gmail.com</div>
              <div>• sonysampangi9@gmail.com</div>
            </div>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href="/signin/?redirect=/manager/"
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Sign In as Manager
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Mobile Menu Trigger + Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-slate-900 leading-none">
                  ToolForForever
                </span>
                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
                  Manager Dashboard
                </span>
              </div>
            </Link>
          </div>

          {/* Center/Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Date Filter selector (relevant for overview, tools, pageviews, logins) */}
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => {
                  const val = e.target.value as DateFilterOption;
                  setDateFilter(val);
                  if (val === 'custom') {
                    setShowCustomDateModal(true);
                  }
                }}
                className="text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today (IST)</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="this_month">This Month</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range...</option>
              </select>
            </div>

            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Auto-refresh active (15s)' : 'Auto-refresh paused'}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span>{autoRefresh ? '15s Live' : 'Paused'}</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              title="Refresh dashboard data immediately"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-medium transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Back to public site */}
            <Link
              href="/"
              className="hidden md:inline-flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              <span>Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. MAIN LAYOUT: SIDEBAR + CONTENT */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-4">
          {/* Manager Account Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                M
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {data?.authenticatedAs || 'Authorized Manager'}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified Session
                </div>
              </div>
            </div>
            {lastRefreshedAt && (
              <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1 border-t border-slate-100">
                <Clock className="w-3 h-3 text-slate-400" />
                Updated at {lastRefreshedAt}
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm space-y-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tab.badgeVariant === 'emerald'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tab.badgeVariant === 'amber'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* MOBILE DRAWER NAVIGATION */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm flex">
            <div className="w-4/5 max-w-xs bg-white h-full p-4 space-y-4 shadow-xl flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-sm text-slate-900">Manager Menu</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-600 font-mono truncate">
                {data?.authenticatedAs || 'Authorized Manager'}
              </div>

              <nav className="space-y-1 flex-1 overflow-y-auto">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge !== undefined && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="pt-2 border-t border-slate-200">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-blue-600 py-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Public Website</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT AREA */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5 text-red-800 text-sm">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Unable to refresh statistics</div>
                  <div className="text-xs text-red-700 mt-0.5 leading-relaxed">{error}</div>
                </div>
              </div>
              <button
                onClick={() => fetchDashboardData(true)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium shrink-0 transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Skeleton state during first load */}
          {loading && !data ? (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-28 rounded-2xl bg-slate-200/70" />
                ))}
              </div>
              <div className="h-72 rounded-2xl bg-slate-200/70" />
              <div className="h-96 rounded-2xl bg-slate-200/70" />
            </div>
          ) : data ? (
            <div>
              {activeTab === 'overview' && (
                <OverviewSection
                  overview={data.overview}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onOpenUserModal={(uid) => setSelectedUserId(uid)}
                />
              )}

              {activeTab === 'visitors' && (
                <LiveVisitorsSection
                  liveVisitors={data.liveVisitors}
                  onOpenUserModal={(uid) => setSelectedUserId(uid)}
                />
              )}

              {activeTab === 'users' && (
                <RegisteredUsersSection
                  users={data.registeredUsers.users}
                  totalCount={data.registeredUsers.totalCount}
                  onOpenUserModal={(uid) => setSelectedUserId(uid)}
                />
              )}

              {activeTab === 'logins' && (
                <LoginHistorySection
                  loginHistory={data.loginHistory}
                  onOpenUserModal={(uid) => setSelectedUserId(uid)}
                />
              )}

              {activeTab === 'tools' && (
                <ToolUsageSection
                  toolUsage={data.toolUsage}
                  onOpenUserModal={(uid) => setSelectedUserId(uid)}
                />
              )}

              {activeTab === 'pageviews' && (
                <PageViewsSection pageViews={data.pageViews} />
              )}

              {activeTab === 'messages' && (
                <ContactMessagesSection
                  messages={data.contactMessages.messages}
                  onRefresh={() => fetchDashboardData(true)}
                />
              )}

              {activeTab === 'system' && (
                <SystemStatusSection systemStatus={data.systemStatus} />
              )}
            </div>
          ) : null}
        </main>
      </div>

      {/* 3. USER ACTIVITY MODAL */}
      {selectedUserId && (
        <UserActivityModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      {/* 4. CUSTOM DATE RANGE MODAL */}
      {showCustomDateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Select Custom Date Range
              </h3>
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCustomDateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCustomDateModal(false);
                  fetchDashboardData(true);
                }}
                disabled={!customStart || !customEnd}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
