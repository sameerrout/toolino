'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/common/Container';
import {
  Users,
  Wrench,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Clock,
  ExternalLink,
  Search,
  Trash2,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';

interface ToolUsageItem {
  slug: string;
  name: string;
  category: string;
  count: number;
}

interface UserItem {
  id: string;
  email: string;
  name: string;
  role?: string;
  isManager?: boolean;
  createdAt: string;
  lastLoginAt: string;
}

interface ActivityEvent {
  timestamp: string;
  type: 'signup' | 'login' | 'tool_use' | 'member_delete';
  email?: string;
  toolSlug?: string;
}

interface ManagerStatsData {
  totalUsers: number;
  users: UserItem[];
  totalToolUses: number;
  toolUsage: ToolUsageItem[];
  recentEvents: ActivityEvent[];
  authenticatedAs: string;
}

export function ManagerDashboard() {
  const [data, setData] = useState<ManagerStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toolSearch, setToolSearch] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/manager/delete-member/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberToDelete.id, email: memberToDelete.email }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Unable to delete member. Please try again.');
      }

      const deletedId = memberToDelete.id;
      const deletedEmail = memberToDelete.email;
      const now = new Date().toISOString();

      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          totalUsers: Math.max(0, prev.totalUsers - 1),
          users: prev.users.filter((u) => u.id !== deletedId),
          recentEvents: [
            {
              timestamp: now,
              type: 'member_delete' as const,
              email: deletedEmail,
            },
            ...prev.recentEvents,
          ].slice(0, 50),
        };
      });

      setFeedback({ type: 'success', message: 'Member deleted successfully.' });
      setMemberToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to delete member. Please try again.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setDeleting(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/manager/stats/');
      if (res.status === 401 || res.status === 403) {
        throw new Error('Unauthorized: Manager authorization required.');
      }
      if (!res.ok) {
        throw new Error('Failed to load manager statistics.');
      }
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Access denied.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Container className="py-16">
        <div className="flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Verifying manager credentials...</p>
        </div>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container className="py-16 max-w-xl">
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-5 shadow-xs">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
            <p className="mt-2 text-xs text-slate-500">
              This area is restricted to authorized Toolnova administrators. Please log in with an authorized account.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/signin/"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition"
            >
              Sign In as Manager
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
            >
              Return Home
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  const filteredTools = data.toolUsage.filter(
    (t) =>
      t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.slug.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(toolSearch.toLowerCase())
  );

  return (
    <Container className="py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Home
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-700">Management</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Toolnova Manager Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600 flex items-center gap-2">
            <span>Status:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Manager Session Active
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStats}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Stats
        </button>
      </div>

      {/* Feedback Toast / Alert Banner */}
      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2.5 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Members
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900">{data.totalUsers}</div>
            <p className="mt-1 text-xs text-slate-500">Registered authenticated members</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Tool Uses
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900">{data.totalToolUses}</div>
            <p className="mt-1 text-xs text-slate-500">Aggregated real tool interactions</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Tools
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <ExternalLink className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900">{data.toolUsage.length}</div>
            <p className="mt-1 text-xs text-slate-500">Live tools available in catalog</p>
          </div>
        </div>
      </div>

      {/* Tool Usage Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tool Usage</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live count of how many times each tool has been used (Real data).
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tools..."
              value={toolSearch}
              onChange={(e) => setToolSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Tool Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Identifier / Path</th>
                <th className="px-6 py-3 text-right">Usage Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTools.map((tool) => (
                <tr key={tool.slug} className="hover:bg-slate-50/70 transition">
                  <td className="px-6 py-3.5 font-semibold text-slate-900">
                    <Link
                      href={`/tools/${tool.slug}/`}
                      className="hover:text-blue-600 transition inline-flex items-center gap-1.5"
                    >
                      {tool.name}
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-block px-2 py-0.5 rounded-full text-2xs font-medium bg-slate-100 text-slate-600 capitalize">
                      {tool.category.replace('-tools', '')}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-slate-500">
                    /tools/{tool.slug}/
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                    {tool.count}
                  </td>
                </tr>
              ))}
              {filteredTools.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No matching tools found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Layout: Recent Activity & Registered Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members List */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
          <h2 className="text-base font-bold text-slate-900">Registered Members</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Actual users who have signed in with Google.
          </p>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {data.users.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No users registered yet.
              </p>
            ) : (
              data.users.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-xs text-slate-900 truncate">{member.name}</div>
                    <div className="text-2xs text-slate-500 truncate">{member.email}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-2xs text-slate-400">
                      <div>Joined {new Date(member.createdAt).toLocaleDateString()}</div>
                      <div>Last login: {new Date(member.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    {member.isManager ? (
                      <span className="px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                        Manager
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMemberToDelete(member)}
                        title={`Delete member ${member.name || member.email}`}
                        aria-label={`Delete member ${member.name || member.email}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
          <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Real event stream of user signups, logins, and tool usages.
          </p>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {data.recentEvents.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No recent activity recorded yet.
              </p>
            ) : (
              data.recentEvents.map((evt, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-xs"
                >
                  <div className={`mt-0.5 shrink-0 ${evt.type === 'member_delete' ? 'text-red-500' : 'text-slate-400'}`}>
                    {evt.type === 'member_delete' ? (
                      <Trash2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-semibold capitalize ${evt.type === 'member_delete' ? 'text-red-700 font-bold' : 'text-slate-800'}`}>
                        {evt.type === 'tool_use'
                          ? `Tool: ${evt.toolSlug}`
                          : evt.type === 'signup'
                          ? 'New Member Signup'
                          : evt.type === 'member_delete'
                          ? 'Member Deleted'
                          : 'Member Login'}
                      </span>
                      <span className="text-2xs text-slate-400 shrink-0">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {evt.email && (
                      <div className="text-2xs text-slate-500 mt-0.5 truncate">{evt.email}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {memberToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-base font-bold text-slate-900">
                  Delete Member
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to delete this member?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Name:</span>
                <span className="font-semibold text-slate-900">{memberToDelete.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="font-semibold text-slate-900 font-mono text-2xs sm:text-xs">
                  {memberToDelete.email}
                </span>
              </div>
            </div>

            <p className="text-2xs sm:text-xs text-slate-500">
              This action cannot be undone. The member&apos;s account will be permanently deleted from the database and they will no longer be able to log in.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteMember}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
