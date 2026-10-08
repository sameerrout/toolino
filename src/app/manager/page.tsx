import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireManagerSession } from '@/lib/auth';
import { ManagerDashboard } from '@/components/manager/ManagerDashboard';

export const metadata: Metadata = {
  title: 'Manager Dashboard - ToolForForever',
  description: 'Authorized management and statistics dashboard for ToolForForever.',
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
