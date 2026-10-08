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
  Inbox,
  LayoutDashboard,
  Eye,
  Mail,
  MessageSquare,
  Check,
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

export type ContactMessageStatus = 'unread' | 'read' | 'replied' | 'resolved';

export interface ContactMessageItem {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  updatedAt: string;
}

interface ManagerStatsData {
  totalUsers: number;
  users: UserItem[];
  totalToolUses: number;
  toolUsage: ToolUsageItem[];
  recentEvents: ActivityEvent[];
  totalMessages?: number;
  unreadMessages?: number;
  authenticatedAs: string;
}

export function ManagerDashboard() {
  const [data, setData] = useState<ManagerStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'messages'>('overview');
  const [toolSearch, setToolSearch] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Messages state
  const [messages, setMessages] = useState<ContactMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessageItem | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<ContactMessageItem | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [updatingMessageStatus, setUpdatingMessageStatus] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [messageFilter, setMessageFilter] = useState<'all' | 'unread' | 'read' | 'replied' | 'resolved'>('all');

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

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const res = await fetch('/api/manager/messages/');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.messages)) {
          setMessages(json.messages);
        }
      }
    } catch (err) {
      console.error('Failed to load contact messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchStats(), fetchMessages()]);
  };

  useEffect(() => {
    fetchStats();
    fetchMessages();
  }, []);

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

  // Open Message and automatically mark unread -> read
  const handleViewMessage = async (msg: ContactMessageItem) => {
    setSelectedMessage(msg);

    if (msg.status === 'unread') {
      try {
        const res = await fetch('/api/manager/messages/', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: msg.id, status: 'read' }),
        });
        if (res.ok) {
          const json = await res.json();
          const updated = json.message as ContactMessageItem;
          setSelectedMessage(updated);
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? updated : m)));
        }
      } catch (err) {
        console.error('Failed to auto-update unread status:', err);
      }
    }
  };

  // Manual status update
  const handleUpdateStatus = async (id: string, newStatus: ContactMessageStatus) => {
    setUpdatingMessageStatus(true);
    try {
      const res = await fetch('/api/manager/messages/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update message status.');
      }
      const json = await res.json();
      const updated = json.message as ContactMessageItem;
      setSelectedMessage((prev) => (prev && prev.id === id ? updated : prev));
      setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
      setFeedback({ type: 'success', message: `Message status updated to "${newStatus}".` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setUpdatingMessageStatus(false);
    }
  };

  // Delete message
  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    setDeletingMessage(true);
    try {
      const res = await fetch(`/api/manager/messages/?id=${encodeURIComponent(messageToDelete.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete message.');
      }
      const deletedId = messageToDelete.id;
      setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      if (selectedMessage?.id === deletedId) {
        setSelectedMessage(null);
      }
      setMessageToDelete(null);
      setFeedback({ type: 'success', message: 'Message permanently deleted.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete message.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setDeletingMessage(false);
    }
  };

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
              This area is restricted to authorized ToolForForever administrators. Please log in with an authorized account.
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

  const unreadCount = messages.filter((m) => m.status === 'unread').length;

  const filteredTools = data.toolUsage.filter(
    (t) =>
      t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.slug.toLowerCase().includes(toolSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(toolSearch.toLowerCase())
  );

  const filteredMessages = messages.filter((msg) => {
    if (messageFilter !== 'all' && msg.status !== messageFilter) return false;
    if (!messageSearch.trim()) return true;
    const q = messageSearch.toLowerCase();
    return (
      msg.name.toLowerCase().includes(q) ||
      msg.email.toLowerCase().includes(q) ||
      msg.category.toLowerCase().includes(q) ||
      msg.message.toLowerCase().includes(q)
    );
  });

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
            ToolForForever Manager Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600 flex items-center gap-2">
            <span>Status:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Manager Session Active ({data.authenticatedAs})
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={refreshAll}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview & Usage</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'messages'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Contact Messages</span>
          {unreadCount > 0 ? (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-xs">
              {unreadCount}
            </span>
          ) : (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {messages.length}
            </span>
          )}
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

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & USAGE */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in">
          {/* KPI Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
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

            <div
              onClick={() => setActiveTab('messages')}
              className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs hover:border-blue-300 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-blue-600 transition">
                  Contact Messages
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                  <span>{messages.length}</span>
                  {unreadCount > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-blue-600 font-medium">View submitted inquiries →</p>
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
                Registered platform members and administrators.
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CONTACT MESSAGES */}
      {/* ========================================================================= */}
      {activeTab === 'messages' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header & Filter Controls */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <span>Contact Messages ({messages.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {messages.length} Total Messages · {unreadCount} Unread
                </p>
              </div>

              {/* Search input */}
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search name, email, message..."
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status Filter Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-4">
              <span className="text-xs font-medium text-slate-500 mr-1">Filter:</span>
              {(['all', 'unread', 'read', 'replied', 'resolved'] as const).map((statusKey) => {
                const count =
                  statusKey === 'all'
                    ? messages.length
                    : messages.filter((m) => m.status === statusKey).length;
                const active = messageFilter === statusKey;
                return (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => setMessageFilter(statusKey)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className="capitalize">{statusKey}</span>
                    <span
                      className={`text-2xs px-1.5 py-0.2 rounded-full font-bold ${
                        active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Topic</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMessages.map((msg) => {
                    const isUnread = msg.status === 'unread';
                    return (
                      <tr
                        key={msg.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isUnread ? 'bg-blue-50/30 font-medium' : ''
                        }`}
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Unread" />
                            )}
                            <span className="truncate max-w-[150px]">{msg.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600">
                          <span className="truncate max-w-[180px] block">{msg.email}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          <span className="inline-block px-2 py-0.5 rounded-full text-2xs font-medium bg-slate-100 text-slate-700">
                            {msg.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-semibold capitalize ${
                              msg.status === 'unread'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : msg.status === 'read'
                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : msg.status === 'replied'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {msg.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {new Date(msg.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewMessage(msg)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setMessageToDelete(msg)}
                              title="Delete message"
                              aria-label="Delete message"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMessages.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-medium text-slate-700">No contact messages found.</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {messages.length === 0
                            ? 'Submitted messages from the Contact Us form will appear here.'
                            : 'No messages match the current search or status filter.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MESSAGE MODAL */}
      {/* ========================================================================= */}
      {selectedMessage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-message-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 id="view-message-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span>Contact Message</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submitted {new Date(selectedMessage.createdAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition"
                aria-label="Close message"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Information Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block text-2xs uppercase tracking-wider font-semibold">
                  Sender Name
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {selectedMessage.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-2xs uppercase tracking-wider font-semibold">
                  Email Address
                </span>
                <a
                  href={`mailto:${selectedMessage.email}`}
                  className="font-mono text-blue-600 hover:underline mt-0.5 block truncate"
                >
                  {selectedMessage.email}
                </a>
              </div>
              <div>
                <span className="text-slate-400 block text-2xs uppercase tracking-wider font-semibold">
                  Topic / Category
                </span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {selectedMessage.category}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-2xs uppercase tracking-wider font-semibold">
                  Current Status
                </span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-2xs font-bold capitalize mt-0.5 ${
                    selectedMessage.status === 'unread'
                      ? 'bg-blue-100 text-blue-800'
                      : selectedMessage.status === 'read'
                      ? 'bg-slate-200 text-slate-800'
                      : selectedMessage.status === 'replied'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedMessage.status}
                </span>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-2">Message:</span>
              <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-sans">
                {selectedMessage.message}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setMessageToDelete(selectedMessage);
                }}
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="w-full sm:w-auto flex flex-wrap items-center justify-end gap-2">
                {selectedMessage.status !== 'read' && (
                  <button
                    type="button"
                    disabled={updatingMessageStatus}
                    onClick={() => handleUpdateStatus(selectedMessage.id, 'read')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    Mark as Read
                  </button>
                )}

                {selectedMessage.status !== 'replied' && (
                  <button
                    type="button"
                    disabled={updatingMessageStatus}
                    onClick={() => handleUpdateStatus(selectedMessage.id, 'replied')}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    Mark as Replied
                  </button>
                )}

                {selectedMessage.status !== 'resolved' && (
                  <button
                    type="button"
                    disabled={updatingMessageStatus}
                    onClick={() => handleUpdateStatus(selectedMessage.id, 'resolved')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark as Resolved</span>
                  </button>
                )}

                {selectedMessage.status !== 'unread' && (
                  <button
                    type="button"
                    disabled={updatingMessageStatus}
                    onClick={() => handleUpdateStatus(selectedMessage.id, 'unread')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    Mark as Unread
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE MESSAGE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {messageToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-msg-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-msg-dialog-title" className="text-base font-bold text-slate-900">
                  Delete this message permanently?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to permanently remove this message?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">From:</span>
                <span className="font-semibold text-slate-900">{messageToDelete.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="font-semibold text-slate-900 font-mono text-2xs">
                  {messageToDelete.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Topic:</span>
                <span className="text-slate-700">{messageToDelete.category}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              This action cannot be undone. The message will be permanently deleted from the database storage.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deletingMessage}
                onClick={() => setMessageToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingMessage}
                onClick={confirmDeleteMessage}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {deletingMessage && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{deletingMessage ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE MEMBER MODAL */}
      {/* ========================================================================= */}
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
