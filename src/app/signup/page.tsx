import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SignUpForm } from '@/components/auth/SignUpForm';

export const metadata: Metadata = {
  title: 'Sign Up - Toolnova',
  description: 'Create your Toolnova account.',
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-[75vh] flex items-center justify-center text-slate-400">Loading...</div>}>
      <SignUpForm />
    </Suspense>
  );
}
