'use client';

import React, { useState } from 'react';
import {
  Eye,
  Search,
  Globe,
  TrendingUp,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { PageViewItem, PageVisitItem } from './types';

interface PageViewsSectionProps {
  pageViews: {
    totalViews: number;
    uniqueSessionsCount: number;
    pages: PageViewItem[];
    dailyTrends: { date: string; views: number }[];
    recentVisits: PageVisitItem[];
  };
}

export function PageViewsSection({ pageViews }: PageViewsSectionProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pages' | 'recent' | 'trends'>('pages');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const { totalViews, uniqueSessionsCount, pages, dailyTrends, recentVisits } = pageViews;

  const filteredPages = pages.filter((p) => {
    if (!search.trim()) return true;
    return p.path.toLowerCase().includes(search.trim().toLowerCase());
  });

  const totalPages = Math.ceil(filteredPages.length / pageSize) || 1;
  const paginatedPages = filteredPages.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const maxDailyViews = Math.max(...dailyTrends.map((d) => d.views), 10);

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/80 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-blue-900">
            <span className="text-xs font-bold uppercase tracking-wider">Total Page Views</span>
            <Eye className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalViews}</span>
            <span className="text-xs font-medium text-slate-500">views in period</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Excludes internal manager dashboard & admin traffic
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">Unique Sessions</span>
            <Globe className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{uniqueSessionsCount}</span>
            <span className="text-xs font-medium text-slate-500">sessions</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Distinct visitor sessions visiting pages
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold uppercase tracking-wider">Distinct Routes</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{pages.length}</span>
            <span className="text-xs font-medium text-slate-500">unique URLs</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Pages receiving traffic in selected period
          </p>
        </div>
      </div>

      {/* 2. Sub-tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pages')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'pages'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Most Visited Pages ({pages.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'recent'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Recent Visit Logs ({recentVisits.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trends')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'trends'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Daily Trends ({dailyTrends.length} days)
          </button>
        </div>

        {activeTab === 'pages' && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search page paths..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition"
            />
          </div>
        )}
      </div>

      {/* 3. Most Visited Pages Table */}
      {activeTab === 'pages' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {paginatedPages.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Eye className="h-10 w-10 mx-auto mb-2 opacity-30 text-blue-500" />
              <p className="text-sm font-medium text-slate-700">No page views recorded in this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-center">Rank</th>
                    <th className="px-4 py-3">Page Path</th>
                    <th className="px-4 py-3 text-right">Views</th>
                    <th className="px-4 py-3 text-right">Unique Sessions</th>
                    <th className="px-4 py-3 text-right">Traffic Share</th>
                    <th className="px-4 py-3 text-center">Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedPages.map((page, idx) => {
                    const globalRank = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={page.path} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-700">
                            #{globalRank}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-900">
                          {page.path}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-blue-600">
                          {page.views}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-600">
                          {page.uniqueSessions}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${Math.min(100, page.percentage)}%` }}
                              />
                            </div>
                            <span>{page.percentage}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={page.path}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-slate-400 hover:text-blue-600 transition"
                            title="Open URL"
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

      {/* 4. Recent Visit Logs */}
      {activeTab === 'recent' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {recentVisits.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm">No recent visit logs found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Page Path</th>
                    <th className="px-4 py-3">Masked IP</th>
                    <th className="px-4 py-3">Session Token</th>
                    <th className="px-4 py-3">Referrer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentVisits.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {new Date(v.timestamp).toLocaleString('en-GB')}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {v.path}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {v.maskedIp}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400 truncate max-w-[130px]">
                        {v.visitorSessionId || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-[150px]">
                        {v.referrer || 'Direct'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. Daily Trends */}
      {activeTab === 'trends' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-900 mb-4">Daily Page Views Breakdown</h4>
          <div className="space-y-2">
            {dailyTrends.map((d) => (
              <div key={d.date} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                <span className="font-semibold text-slate-700">{d.date}</span>
                <div className="flex items-center gap-3">
                  <div className="w-36 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${Math.min(100, (d.views / maxDailyViews) * 100)}%` }}
                    />
                  </div>
                  <span className="font-bold text-slate-900 min-w-[40px] text-right">{d.views}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
