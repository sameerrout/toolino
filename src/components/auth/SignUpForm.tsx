'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter a password.');
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
      const res = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account. Please try again.');
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
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
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
              Create an account
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Sign up to get full access to Toolnova
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
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="signup-name" className="sr-only">
                Full Name
              </label>
              <div className="group relative flex items-center bg-[#f0f3f6] hover:bg-[#ebf0f5] focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-400/40 focus-within:border-slate-300 border border-transparent rounded-2xl px-4 py-3 sm:py-3.5 transition-all duration-150">
                <User className="w-5 h-5 text-slate-400 shrink-0 select-none mr-3" />
                <input
                  id="signup-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="signup-email" className="sr-only">
                Email
              </label>
              <div className="group relative flex items-center bg-[#f0f3f6] hover:bg-[#ebf0f5] focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-400/40 focus-within:border-slate-300 border border-transparent rounded-2xl px-4 py-3 sm:py-3.5 transition-all duration-150">
                <Mail className="w-5 h-5 text-slate-400 shrink-0 select-none mr-3" />
                <input
                  id="signup-email"
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

            {/* Password Field with Eye Toggle */}
            <div className="space-y-1.5">
              <label htmlFor="signup-password" className="sr-only">
                Password
              </label>
              <div className="group relative flex items-center bg-[#f0f3f6] hover:bg-[#ebf0f5] focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-400/40 focus-within:border-slate-300 border border-transparent rounded-2xl px-4 py-3 sm:py-3.5 transition-all duration-150">
                <Lock className="w-5 h-5 text-slate-400 shrink-0 select-none mr-3" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
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

            {/* Confirm Password Field with Eye Toggle */}
            <div className="space-y-1.5">
              <label htmlFor="signup-confirm-password" className="sr-only">
                Confirm Password
              </label>
              <div className="group relative flex items-center bg-[#f0f3f6] hover:bg-[#ebf0f5] focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-400/40 focus-within:border-slate-300 border border-transparent rounded-2xl px-4 py-3 sm:py-3.5 transition-all duration-150">
                <Lock className="w-5 h-5 text-slate-400 shrink-0 select-none mr-3" />
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
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

            {/* Create Account Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 px-5 rounded-2xl bg-[#18181b] hover:bg-black active:scale-[0.99] text-white text-sm sm:text-base font-medium shadow-sm transition-all duration-150 disabled:opacity-60 cursor-pointer"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                <span>Create Account</span>
              </button>
            </div>
          </form>

          {/* Already have an account? Sign In */}
          <div className="pt-2 text-center text-xs sm:text-sm text-slate-500">
            <p>
              Already have an account?{' '}
              <Link
                href="/signin/"
                className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
              >
                Sign In
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
