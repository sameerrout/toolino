'use client';

import React from 'react';
import {
  Radio,
  UserCheck,
  UserX,
  Shield,
  Activity,
} from 'lucide-react';
import { VisitorSessionItem } from './types';

interface LiveVisitorsSectionProps {
  liveVisitors: {
    totalActive: number;
    anonymousActive: number;
    authenticatedActive: number;
    sessions: VisitorSessionItem[];
  };
  onOpenUserModal?: (userId: string) => void;
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (isNaN(diffMs)) return '—';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

export function LiveVisitorsSection({ liveVisitors, onOpenUserModal }: LiveVisitorsSectionProps) {
  return (
    <div className="space-y-6">
      {/* 1. Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Active */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/80 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Total Active Visitors
            </span>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-black text-slate-900">
              {liveVisitors.totalActive}
            </span>
            <span className="text-xs font-medium text-slate-500">within 2 min threshold</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Real-time active visitor sessions on ToolForForever.com
          </p>
        </div>

        {/* Anonymous Visitors */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">
              Anonymous Visitors
            </span>
            <UserX className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-black text-slate-900">
              {liveVisitors.anonymousActive}
            </span>
            <span className="text-xs font-medium text-slate-500">unauthenticated</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Browsing tools with first-party pseudonymous session cookies
          </p>
        </div>

        {/* Authenticated Visitors */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">
              Authenticated Visitors
            </span>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-black text-slate-900">
              {liveVisitors.authenticatedActive}
            </span>
            <span className="text-xs font-medium text-slate-500">signed-in members</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Logged in via Google Identity or Email accounts
          </p>
        </div>
      </div>

      {/* 2. Privacy & Operational Disclosure */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-600">
        <Shield className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Privacy-First Visitor Tracking:</span>{' '}
          Active visitors are estimated from activity heartbeats within a 2-minute inactivity threshold.
          Sessions use pseudonymous first-party tokens and keyed HMAC-SHA256 masked IP addresses (e.g. 192.168.***.***).
          Tracking operates 24/7 on Vercel and Google Cloud independently of any personal computer.
        </div>
      </div>

      {/* 3. Live Sessions Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Active Visitor Sessions ({liveVisitors.sessions.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Auto-refreshes every 12s
          </span>
        </div>

        {liveVisitors.sessions.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-30 text-blue-500" />
            <p className="text-sm font-semibold text-slate-700">No visitors active in the last 2 minutes</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Sessions will appear here automatically when visitors browse toolforforever.com.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Session ID</th>
                  <th className="px-4 py-3">Identity</th>
                  <th className="px-4 py-3">Current / Last Page</th>
                  <th className="px-4 py-3">Masked IP</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3">Device / Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liveVisitors.sessions.map((s) => (
                  <tr key={s.sessionId} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-mono text-[11px] text-slate-700 font-medium truncate max-w-[130px]">
                          {s.sessionId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.isAuthenticated ? (
                        <div
                          onClick={() => s.userId && onOpenUserModal && onOpenUserModal(s.userId)}
                          className={`flex items-center gap-1.5 font-semibold text-blue-700 ${
                            s.userId ? 'cursor-pointer hover:underline' : ''
                          }`}
                        >
                          <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="truncate max-w-[150px]" title={s.userEmail || s.userId}>
                            {s.userEmail || s.userId}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                          <UserX className="h-3 w-3" /> Anonymous
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-800 truncate max-w-[180px]">
                        {s.currentPath}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {s.maskedIp}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(s.startTime).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-emerald-700">
                      {formatRelativeTime(s.lastActivityTime)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px] truncate max-w-[160px]" title={s.userAgent}>
                      {s.userAgent || 'Standard Browser'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
