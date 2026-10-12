'use client';

import React, { useState } from 'react';
import {
  Mail,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { ContactMessageItem } from './types';

interface ContactMessagesSectionProps {
  messages: ContactMessageItem[];
  onRefresh: () => void;
}

export function ContactMessagesSection({ messages, onRefresh }: ContactMessagesSectionProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'replied' | 'resolved'>('all');
  const [search, setSearch] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessageItem | null>(null);
  const [updating, setUpdating] = useState(false);
  const [_deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filtered = messages.filter((m) => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdating(true);
    try {
      const res = await fetch('/api/manager/messages/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        onRefresh();
        if (selectedMessage && selectedMessage.id === id) {
          setSelectedMessage((prev) => (prev ? { ...prev, status: status as ContactMessageItem['status'] } : null));
        }
      }
    } catch {
      // Ignore
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/manager/messages/?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onRefresh();
        if (selectedMessage?.id === id) setSelectedMessage(null);
      }
    } catch {
      // Ignore
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search & Filter Bar */}
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
            placeholder="Search messages by sender name, email, or content..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'unread', 'read', 'replied', 'resolved'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setFilter(st);
                setCurrentPage(1);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {paginated.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Mail className="h-10 w-10 mx-auto mb-2 opacity-30 text-blue-500" />
            <p className="text-sm font-medium text-slate-700">No contact messages found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Sender</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Message Snippet</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((msg) => (
                  <tr
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className="hover:bg-slate-50/60 cursor-pointer transition"
                  >
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{msg.name}</span>
                      <span className="text-[11px] text-slate-400">{msg.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 capitalize">
                        {msg.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[260px]">
                      {msg.message}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(msg.createdAt).toLocaleDateString('en-GB', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                          msg.status === 'unread'
                            ? 'bg-amber-100 text-amber-800'
                            : msg.status === 'read'
                            ? 'bg-blue-100 text-blue-800'
                            : msg.status === 'replied'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {msg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="rounded-lg p-1 text-slate-400 hover:text-red-600 transition"
                        title="Delete Message"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedMessage.name}</h3>
                <p className="text-xs text-slate-500">{selectedMessage.email}</p>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="capitalize font-semibold text-slate-700">
                  Category: {selectedMessage.category}
                </span>
                <span>{new Date(selectedMessage.createdAt).toLocaleString('en-GB')}</span>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-800 whitespace-pre-wrap border border-slate-100 max-h-60 overflow-y-auto">
                {selectedMessage.message}
              </div>

              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Update Status:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['unread', 'read', 'replied', 'resolved'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={updating || selectedMessage.status === st}
                      onClick={() => handleUpdateStatus(selectedMessage.id, st)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                        selectedMessage.status === st
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
