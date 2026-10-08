import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireManagerSession } from '@/lib/auth';
import { ManagerDashboard } from '@/components/manager/ManagerDashboard';

export const metadata: Metadata = {
  title: 'Admin Dashboard - ToolForForever',
  description: 'Authorized admin dashboard for ToolForForever.',
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
