import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireManagerSession } from '@/lib/auth';
import { ManagerDashboard } from '@/components/manager/ManagerDashboard';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Toolnova',
  description: 'Authorized admin dashboard for Toolnova.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const session = await requireManagerSession();
  if (!session) {
    redirect('/signin/?redirect=/admin/');
  }

  return <ManagerDashboard />;
}
