'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid email or password.');
      }

      // Check redirect destination
      if (redirectUrl && redirectUrl.startsWith('/')) {
        router.push(redirectUrl);
      } else if (data.user?.isManager) {
        router.push('/manager/');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setError('Google Sign-In is not yet configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment.');
      return;
    }

    setGoogleLoading(true);

    // If Google Identity Services script is available on window
    const google = (window as unknown as { google?: { accounts?: { id?: { initialize: (config: unknown) => void; prompt: () => void } } } }).google;
    if (google?.accounts?.id) {
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) {
              setError('Google Sign-In failed: no credential received.');
              setGoogleLoading(false);
              return;
            }
            try {
              const res = await fetch('/api/auth/google/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Google login failed.');
              if (redirectUrl && redirectUrl.startsWith('/')) {
                router.push(redirectUrl);
              } else if (data.user?.isManager) {
                router.push('/manager/');
              } else {
                router.push('/');
              }
              router.refresh();
            } catch (authErr: unknown) {
              setError(authErr instanceof Error ? authErr.message : 'Google authentication failed.');
            } finally {
              setGoogleLoading(false);
            }
          },
        });
        google.accounts.id.prompt();
      } catch (_err) {
        setError('Failed to launch Google Sign-In prompt.');
        setGoogleLoading(false);
      }
    } else {
      setError('Google Sign-In is loading or credentials pending. Please sign in with your email and password.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-[420px] space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>

        {/* Card Surface */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-9 space-y-6">
          {/* Header & Logo */}
          <div className="flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Sign in to your Toolnova account to continue
            </p>
          </div>

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
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="sr-only">
                Email
              </label>
              <div className="group relative flex items-center bg-[#f0f3f6] hover:bg-[#ebf0f5] focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-400/40 focus-within:border-slate-300 border border-transparent rounded-2xl px-4 py-3 sm:py-3.5 transition-all duration-150">
                <Mail className="w-5 h-5 text-slate-400 shrink-0 select-none mr-3" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="sr-only">
                Password
              </label>
              <div className="group relative flex items-center bg-[#f0f3f6] hover:bg-[#ebf0f5] focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-400/40 focus-within:border-slate-300 border border-transparent rounded-2xl px-4 py-3 sm:py-3.5 transition-all duration-150">
                <Lock className="w-5 h-5 text-slate-400 shrink-0 select-none mr-3" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
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

            {/* Forgot Password Link - Aligned right below Password */}
            <div className="flex justify-end pt-0.5 pb-1">
              <Link
                href="/forgot-password/"
                className="text-xs sm:text-sm text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 px-5 rounded-2xl bg-[#18181b] hover:bg-black active:scale-[0.99] text-white text-sm sm:text-base font-medium shadow-sm transition-all duration-150 disabled:opacity-60 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>Sign In</span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">OR</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Don't have an account? Sign Up */}
          <div className="pt-2 text-center text-xs sm:text-sm text-slate-500">
            <p>
              Don&apos;t have an account?{' '}
              <Link
                href="/signup/"
                className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
              >
                Sign Up
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
