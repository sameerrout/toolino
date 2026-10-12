'use client';

import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Globe,
  Cloud,
  Clock,
} from 'lucide-react';
import { SystemStatusData } from './types';

interface SystemStatusSectionProps {
  systemStatus: SystemStatusData;
}

export function SystemStatusSection({ systemStatus }: SystemStatusSectionProps) {
  const isConnected = systemStatus.isDatabaseConnected || systemStatus.databaseStatus === 'connected';

  return (
    <div className="space-y-6">
      {/* 1. Architecture & Hosting Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cloud Storage */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Storage Provider
            </span>
            <Cloud className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-3 text-lg font-bold text-slate-900">{systemStatus.storageProvider}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-xs font-semibold text-slate-700 capitalize">
              {isConnected ? 'Active & Persistent' : systemStatus.databaseStatus}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 font-mono truncate">
            {systemStatus.targetAccount}
          </p>
        </div>

        {/* Server Timezone & Runtime */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Reporting Timezone
            </span>
            <Clock className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-3 text-lg font-bold text-slate-900">Asia/Kolkata (IST)</p>
          <p className="mt-1 text-xs text-slate-500">UTC +05:30 calendar day boundaries</p>
          <p className="mt-2 text-[11px] text-slate-400">
            Server time: {new Date(systemStatus.serverTimestamp).toLocaleTimeString('en-GB')}
          </p>
        </div>

        {/* Deployment Platform */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Deployment Platform
            </span>
            <Globe className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-3 text-lg font-bold text-slate-900">Vercel Serverless</p>
          <p className="mt-1 text-xs text-slate-500">Node.js 22 · Next.js 15 App Router</p>
          <p className="mt-2 text-[11px] text-slate-400 capitalize">
            Env: {systemStatus.nodeEnv}
          </p>
        </div>
      </div>

      {/* 2. Manager Allowlist & Authorization */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Authorized Manager Accounts</h3>
        </div>
        <p className="text-xs text-slate-600 mb-4">
          Only verified sessions matching these authorized email addresses can access the Manager Dashboard and its server API endpoints:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {systemStatus.authorizedManagers.map((email) => {
            const isCurrent = email.toLowerCase() === systemStatus.authenticatedAs.toLowerCase();
            return (
              <div
                key={email}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  isCurrent
                    ? 'border-blue-300 bg-blue-50/60'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 truncate">{email}</span>
                </div>
                {isCurrent && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                    Current Session
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Privacy, Security & Data Protection Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Active Security & Privacy Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Server-Side Authorization Enforced</p>
              <p className="text-slate-500 mt-0.5">
                Every manager page and API endpoint verifies the HMAC token against the server-side allowlist.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Keyed HMAC-SHA256 IP Masking</p>
              <p className="text-slate-500 mt-0.5">
                Client IP addresses are never exposed or stored plaintext. Only masked octets (192.168.***.***) are retained.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Scrypt Salted Password Hashing</p>
              <p className="text-slate-500 mt-0.5">
                Passwords are cryptographically hashed using Scrypt with distinct 16-byte random salts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Internal Manager Traffic Exclusion</p>
              <p className="text-slate-500 mt-0.5">
                Requests to /manager/ and /admin/ are strictly excluded from public page views and public visitor metrics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
