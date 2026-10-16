import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manager Dashboard - ToolForForever',
  description: 'Authorized management and statistics dashboard for ToolForForever.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
