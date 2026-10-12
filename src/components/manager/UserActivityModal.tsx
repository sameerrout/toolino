'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Wrench,
  KeyRound,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  Activity,
} from 'lucide-react';
import { RegisteredUserItem, ToolExecutionItem, LoginEventItem } from './types';

interface UserDetailResponse {
  user: RegisteredUserItem;
  toolUsageSummary: { toolSlug: string; toolName: string; count: number; lastUsedAt: string }[];
  recentToolExecutions: ToolExecutionItem[];
  recentLoginEvents: LoginEventItem[];
}

interface UserActivityModalProps {
  userId: string | null;
  onClose: () => void;
}

export function UserActivityModal({ userId, onClose }: UserActivityModalProps) {
  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tools' | 'executions' | 'logins'>('tools');

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/manager/users/${encodeURIComponent(userId)}/`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load user activity details.');
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading details.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">User Activity Details</h2>
              <p className="text-xs text-slate-500">ID: {userId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
              <p className="text-sm font-medium">Loading user activity and history...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
              <p className="text-sm font-medium">{error}</p>
              <button
                onClick={() => onClose()}
                className="mt-3 text-xs font-semibold underline hover:no-underline"
              >
                Close
              </button>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div>
                  <span className="text-xs text-slate-500">Email</span>
                  <p className="text-sm font-semibold text-slate-900 truncate" title={data.user.email}>
                    {data.user.email}
                  </p>
                  {data.user.isManager && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      <Shield className="h-3 w-3" /> Manager
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-xs text-slate-500">Provider</span>
                  <p className="text-sm font-semibold text-slate-900 capitalize">
                    {data.user.authProvider}
                  </p>
                  <span className="text-[11px] text-emerald-600 font-medium">Verified</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Registration Date</span>
                  <p className="text-xs font-medium text-slate-800">
                    {new Date(data.user.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Last Login</span>
                  <p className="text-xs font-medium text-slate-800">
                    {data.user.lastLoginAt
                      ? new Date(data.user.lastLoginAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </p>
                  <span className="text-[11px] text-slate-500">Logins: {data.user.loginCount || 1}</span>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('tools')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition ${
                    activeTab === 'tools'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Tool Usage Breakdown ({data.toolUsageSummary.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('executions')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition ${
                    activeTab === 'executions'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  Execution Events ({data.recentToolExecutions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('logins')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition ${
                    activeTab === 'logins'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Login History ({data.recentLoginEvents.length})
                </button>
              </div>

              {/* Tab 1: Tool Usage Summary */}
              {activeTab === 'tools' && (
                <div>
                  {data.toolUsageSummary.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No tool executions recorded for this user yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold">
                          <tr>
                            <th className="px-4 py-2.5">Tool Name</th>
                            <th className="px-4 py-2.5">Slug</th>
                            <th className="px-4 py-2.5 text-right">Executions</th>
                            <th className="px-4 py-2.5">Last Used</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.toolUsageSummary.map((item) => (
                            <tr key={item.toolSlug} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 font-semibold text-slate-900">
                                {item.toolName}
                              </td>
                              <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                                {item.toolSlug}
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-blue-600">
                                {item.count}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600">
                                {new Date(item.lastUsedAt).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Recent Execution Events */}
              {activeTab === 'executions' && (
                <div>
                  {data.recentToolExecutions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No recent execution events found.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold">
                          <tr>
                            <th className="px-4 py-2.5">Timestamp</th>
                            <th className="px-4 py-2.5">Tool</th>
                            <th className="px-4 py-2.5">Status</th>
                            <th className="px-4 py-2.5 text-right">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.recentToolExecutions.map((exec) => (
                            <tr key={exec.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 text-slate-500">
                                {new Date(exec.timestamp).toLocaleString('en-GB')}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-slate-900">
                                {exec.toolName}
                              </td>
                              <td className="px-4 py-2.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    exec.status === 'completed'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : exec.status === 'failed'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {exec.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right text-slate-500 font-mono text-[11px]">
                                {exec.durationMs ? `${exec.durationMs}ms` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Login Events */}
              {activeTab === 'logins' && (
                <div>
                  {data.recentLoginEvents.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No login events recorded for this user yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold">
                          <tr>
                            <th className="px-4 py-2.5">Timestamp</th>
                            <th className="px-4 py-2.5">Method</th>
                            <th className="px-4 py-2.5">Event Type</th>
                            <th className="px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.recentLoginEvents.map((ev) => (
                            <tr key={ev.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2.5 text-slate-500">
                                {new Date(ev.timestamp).toLocaleString('en-GB')}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-slate-800 capitalize">
                                {ev.method}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-slate-800 capitalize">
                                {ev.eventType}
                              </td>
                              <td className="px-4 py-2.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    ev.status === 'success'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {ev.status === 'success' ? (
                                    <CheckCircle2 className="h-3 w-3" />
                                  ) : (
                                    <XCircle className="h-3 w-3" />
                                  )}
                                  {ev.status}
                                </span>
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
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
