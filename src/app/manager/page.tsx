'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { ManagerDashboard } from '@/components/manager/ManagerDashboard';

export default function ManagerPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'manager') {
      router.replace('/login/?redirect=/manager/');
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center text-slate-500 text-sm">
        Verifying manager privileges...
      </div>
    );
  }

  return <ManagerDashboard />;
}
