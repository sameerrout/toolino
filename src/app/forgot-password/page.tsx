import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Forgot Password - ToolForForever',
  description: 'Reset your ToolForForever account password.',
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[75vh] flex items-center justify-center text-slate-400">Loading...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
