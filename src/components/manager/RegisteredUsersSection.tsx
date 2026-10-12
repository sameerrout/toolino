'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  ArrowUpDown,
  Shield,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { RegisteredUserItem } from './types';

interface RegisteredUsersSectionProps {
  users: RegisteredUserItem[];
  totalCount: number;
  onOpenUserModal: (userId: string) => void;
}

export function RegisteredUsersSection({
  users,
  totalCount,
  onOpenUserModal,
}: RegisteredUsersSectionProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastLoginAt' | 'loginCount' | 'email'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Filter & sort in client when full list is loaded
  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q)
    );
  });

  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'createdAt') {
      cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'lastLoginAt') {
      cmp = new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime();
    } else if (sortBy === 'loginCount') {
      cmp = (b.loginCount || 1) - (a.loginCount || 1);
    } else if (sortBy === 'email') {
      cmp = a.email.localeCompare(b.email);
    }
    return sortOrder === 'asc' ? -cmp : cmp;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (field: 'createdAt' | 'lastLoginAt' | 'loginCount' | 'email') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-5">
      {/* Search & Sort Bar */}
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
            placeholder="Search users by email, name, or User ID..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'lastLoginAt' | 'loginCount' | 'email')}
              className="bg-transparent font-semibold text-slate-900 border-none outline-none cursor-pointer"
            >
              <option value="createdAt">Registration Date</option>
              <option value="lastLoginAt">Last Login</option>
              <option value="loginCount">Total Logins</option>
              <option value="email">Email</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Registered Accounts ({filtered.length} of {totalCount})
            </h3>
          </div>
        </div>

        {paginated.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30 text-blue-500" />
            <p className="text-sm font-medium text-slate-700">No matching user records found</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('email')}>
                    Email Address
                  </th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('createdAt')}>
                    Registered
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('lastLoginAt')}>
                    Last Login
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:text-slate-900" onClick={() => toggleSort('loginCount')}>
                    Logins
                  </th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 truncate max-w-[120px]" title={user.id}>
                      {user.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 truncate max-w-[190px]" title={user.email}>
                          {user.email}
                        </span>
                        {user.isManager && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            <Shield className="h-2.5 w-2.5" /> Manager
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                        {user.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                          user.authProvider === 'google'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {user.authProvider}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(user.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {user.loginCount || 1}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenUserModal(user.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Activity
                      </button>
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
