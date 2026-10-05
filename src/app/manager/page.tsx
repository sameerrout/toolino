import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireManagerSession } from '@/lib/auth';
import { ManagerDashboard } from '@/components/manager/ManagerDashboard';

export const metadata: Metadata = {
  title: 'Manager Dashboard - Toolino',
  description: 'Authorized management and statistics dashboard for Toolino.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ManagerPage() {
  const session = await requireManagerSession();
  if (!session) {
    redirect('/signin/?redirect=/manager/');
  }

  return <ManagerDashboard />;
}
