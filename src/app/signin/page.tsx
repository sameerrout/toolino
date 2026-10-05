import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In - Toolnova',
  description: 'Sign in to your Toolnova account to continue.',
};

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-[75vh] flex items-center justify-center text-slate-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
