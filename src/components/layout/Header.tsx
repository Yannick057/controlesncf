import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { OfflineIndicator } from '@/components/dashboard/OfflineIndicator';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Logo SNCF Contrôles" 
            className="h-10 w-10 rounded-lg object-contain"
          />
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">SNCF Contrôles</span>
            <span className="text-xs text-muted-foreground">Gestion des contrôles</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <OfflineIndicator />
          <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <span>{user?.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
