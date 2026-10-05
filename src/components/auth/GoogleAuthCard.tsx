'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/layout/Logo';
import { ShieldCheck, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

interface AuthCardProps {
  mode: 'signin' | 'login';
}

export function GoogleAuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isSignIn = mode === 'signin';
  const title = isSignIn ? 'Sign In to Toolino' : 'Welcome back to Toolino';
  const subtitle = isSignIn
    ? 'Create your account using your email and password.'
    : 'Log in to your Toolino account.';

  // Handle Email + Password Form Submission
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (isSignIn && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isSignIn ? '/api/auth/register/' : '/api/auth/login/';
      const body = isSignIn
        ? { email, password, confirmPassword }
        : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      // Redirect appropriately based on role
      if (data.user?.isManager) {
        router.push('/manager/');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-5">
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-7 sm:p-8 space-y-6">
          <div className="flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-xs">{subtitle}</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Email + Password Authentication Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                autoComplete={isSignIn ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {isSignIn && (
              <div>
                <label htmlFor="auth-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-900 placeholder:text-slate-400"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSignIn ? 'Create Account' : 'Log In'}</span>
            </button>
          </form>

          {/* Toggle between Sign In and Log In */}
          <div className="pt-2 text-center text-xs text-slate-500">
            {isSignIn ? (
              <p>
                Already have an account?{' '}
                <Link href="/login/" className="font-semibold text-blue-600 hover:underline">
                  Log In
                </Link>
              </p>
            ) : (
              <p>
                Don&apos;t have an account?{' '}
                <Link href="/signin/" className="font-semibold text-blue-600 hover:underline">
                  Sign In
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Privacy Note */}
        <div className="text-center text-2xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Secure authentication • Privacy-first design</span>
        </div>
      </div>
    </div>
  );
}
