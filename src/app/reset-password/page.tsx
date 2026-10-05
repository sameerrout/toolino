import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset Password - Toolino',
  description: 'Set a new password for your Toolino account.',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[75vh] flex items-center justify-center text-slate-400">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
