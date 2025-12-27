import { ReactNode } from 'react';
import { Header } from './Header';
import { Navigation, MobileNavigation } from './Navigation';

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
    </div>
  );
}
