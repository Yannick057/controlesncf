import { ReactNode } from 'react';
import { Header } from './Header';
import { Navigation, MobileNavigation } from './Navigation';
import { UpdateNotification } from '@/components/features/UpdateNotification';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation />
      <main className="container py-6 pb-24 md:pb-6">
        {children}
      </main>
      <MobileNavigation />
      <UpdateNotification />
    </div>
  );
}
