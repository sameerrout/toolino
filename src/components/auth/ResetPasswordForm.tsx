'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('Invalid or missing password reset token. Please request a new link.');
      return;
    }

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setSuccess(data.message || 'Password successfully reset! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/signin/');
      }, 2000);
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
              Reset Password
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-xs">
              Enter your new password below to regain access to your account.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div
              role="status"
              className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 text-xs sm:text-sm text-emerald-800 flex items-start gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span className="font-medium leading-snug">{success}</span>
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
            {/* New Password */}
            <div className="space-y-1.5">
              <label htmlFor="reset-password" className="sr-only">
                New Password
              </label>
              <div className="group relative flex items-center bg-[#f0f3f6] hover:bg-[#ebf0f5] focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-400/40 focus-within:border-slate-300 border border-transparent rounded-2xl px-4 py-3 sm:py-3.5 transition-all duration-150">
                <Lock className="w-5 h-5 text-slate-400 shrink-0 select-none mr-3" />
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New Password"
                  className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none pr-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="p-1 -mr-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-800 transition-colors"
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label htmlFor="reset-confirm-password" className="sr-only">
                Confirm New Password
              </label>
              <div className="group relative flex items-center bg-[#f0f3f6] hover:bg-[#ebf0f5] focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-400/40 focus-within:border-slate-300 border border-transparent rounded-2xl px-4 py-3 sm:py-3.5 transition-all duration-150">
                <Lock className="w-5 h-5 text-slate-400 shrink-0 select-none mr-3" />
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none pr-2"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="p-1 -mr-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-800 transition-colors"
                >
                  {showConfirmPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !token}
              className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 px-5 rounded-2xl bg-[#18181b] hover:bg-black active:scale-[0.99] text-white text-sm sm:text-base font-medium shadow-sm transition-all duration-150 disabled:opacity-60 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>Reset Password</span>
            </button>
          </form>

          {/* Return to Login */}
          <div className="pt-2 text-center text-xs sm:text-sm text-slate-500">
            <p>
              Remember your credentials?{' '}
              <Link
                href="/login/"
                className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
              >
                Back to Login
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
