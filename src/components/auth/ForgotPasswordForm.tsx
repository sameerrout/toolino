'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, AlertCircle, CheckCircle2, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process password reset request.');
      }

      setSuccess(data.message || 'If an account exists for this email, a password reset link has been sent to your inbox.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-[420px] space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/signin/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>

        {/* Card Surface */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-9 space-y-6">
          {/* Header & Logo */}
          <div className="flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Forgot password?
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-xs">
              Enter your registered email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div
              role="status"
              className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 text-xs sm:text-sm text-emerald-800 space-y-2 animate-in fade-in"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="font-medium leading-snug">{success}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-red-50 border border-red-200/90 text-xs sm:text-sm text-red-700 flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field matching attached reference */}
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="sr-only">
                Registered Email
              </label>
              <div className="group relative flex items-center bg-[#f0f3f6] hover:bg-[#ebf0f5] focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-400/40 focus-within:border-slate-300 border border-transparent rounded-2xl px-4 py-3 sm:py-3.5 transition-all duration-150">
                <Mail className="w-5 h-5 text-slate-400 shrink-0 select-none mr-3" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Registered Email"
                  className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                />
              </div>
            </div>

            {/* Send Reset Link Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 px-5 rounded-2xl bg-[#18181b] hover:bg-black active:scale-[0.99] text-white text-sm sm:text-base font-medium shadow-sm transition-all duration-150 disabled:opacity-60 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>Send Reset Link</span>
            </button>
          </form>

          {/* Return to Login Link */}
          <div className="pt-2 text-center text-xs sm:text-sm text-slate-500">
            <p>
              Remember your password?{' '}
              <Link
                href="/login/"
                className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
              >
                Return to Login
              </Link>
            </p>
          </div>
        </div>

        {/* Security & Privacy Badge */}
        <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>Secure authentication • Privacy-first design</span>
        </div>
      </div>
    </div>
  );
}
