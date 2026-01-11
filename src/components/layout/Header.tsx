import { useState, useEffect } from 'react';
import { LogOut, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminFeatures } from '@/hooks/useAdminFeatures';
import { Button } from '@/components/ui/button';
import { OfflineIndicator } from '@/components/dashboard/OfflineIndicator';
import { GlobalSearch } from '@/components/features/GlobalSearch';

export function Header() {
  const { user, logout } = useAuth();
  const { settings } = useAdminFeatures();
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (settings.global_search) {
          setSearchOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.global_search]);

  return (
    <>
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

          <div className="flex items-center gap-2 sm:gap-4">
            <OfflineIndicator />
            
            {settings.global_search && (
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden sm:flex gap-2 text-muted-foreground"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
                <span className="hidden md:inline">Rechercher...</span>
                <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                  ⌘K
                </kbd>
              </Button>
            )}
            
            {settings.global_search && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="sm:hidden"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
            
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
      
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
