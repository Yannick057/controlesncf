import { useState, useEffect } from 'react';
import { LayoutDashboard, Train, Building2, Settings, History, Shield, UserCog } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTeamNotes } from '@/hooks/useTeamNotes';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  id: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'onboard', to: '/onboard', icon: Train, label: 'À Bord' },
  { id: 'station', to: '/station', icon: Building2, label: 'En Gare' },
  { id: 'history', to: '/history', icon: History, label: 'Historique' },
  { id: 'settings', to: '/settings', icon: Settings, label: 'Paramètres' },
];

const adminNavItem: NavItem = { id: 'admin', to: '/admin', icon: Shield, label: 'Admin' };
const managerNavItem: NavItem = { id: 'manager', to: '/manager', icon: UserCog, label: 'Manager' };

export function Navigation() {
  const { user } = useAuth();
  const [pageOrder, setPageOrder] = useState<string[]>(['dashboard', 'onboard', 'station', 'history', 'settings']);
  const [hiddenPages, setHiddenPages] = useState<string[]>([]);

  useEffect(() => {
    const savedOrder = localStorage.getItem('user_page_order');
    if (savedOrder) {
      try {
        setPageOrder(JSON.parse(savedOrder));
      } catch {
        // Keep default order
      }
    }

    // Load hidden pages
    const savedHidden = localStorage.getItem('user_hidden_pages');
    if (savedHidden) {
      try {
        setHiddenPages(JSON.parse(savedHidden));
      } catch {
        // Keep empty
      }
    }

    // Also load from database if user is logged in
    if (user?.id) {
      supabase
        .from('user_preferences')
        .select('hidden_pages')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.hidden_pages) {
            setHiddenPages(data.hidden_pages as string[]);
            localStorage.setItem('user_hidden_pages', JSON.stringify(data.hidden_pages));
          }
        });
    }
  }, [user?.id]);

  // Reorder nav items based on user preference, filter out hidden pages
  const orderedNavItems = pageOrder
    .map(id => ALL_NAV_ITEMS.find(item => item.id === id))
    .filter((item): item is NavItem => item !== undefined)
    .filter(item => !hiddenPages.includes(item.id));

  // Add role-specific items (manager and admin pages can't be hidden)
  let navItems = [...orderedNavItems];
  if (user?.role === 'admin') {
    navItems.push(managerNavItem);
    navItems.push(adminNavItem);
  } else if (user?.role === 'manager') {
    navItems.push(managerNavItem);
  }

  return (
    <nav className="border-b border-border bg-card/50">
      <div className="container">
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

export function MobileNavigation() {
  const { user } = useAuth();
  const { unreadCount } = useTeamNotes();
  const [pageOrder, setPageOrder] = useState<string[]>(['dashboard', 'onboard', 'station', 'history', 'settings']);
  const [hiddenPages, setHiddenPages] = useState<string[]>([]);

  useEffect(() => {
    const savedOrder = localStorage.getItem('user_page_order');
    if (savedOrder) {
      try {
        setPageOrder(JSON.parse(savedOrder));
      } catch {
        // Keep default order
      }
    }

    // Load hidden pages
    const savedHidden = localStorage.getItem('user_hidden_pages');
    if (savedHidden) {
      try {
        setHiddenPages(JSON.parse(savedHidden));
      } catch {
        // Keep empty
      }
    }

    // Also load from database if user is logged in
    if (user?.id) {
      supabase
        .from('user_preferences')
        .select('hidden_pages')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.hidden_pages) {
            setHiddenPages(data.hidden_pages as string[]);
            localStorage.setItem('user_hidden_pages', JSON.stringify(data.hidden_pages));
          }
        });
    }
  }, [user?.id]);

  // Reorder nav items based on user preference, filter out hidden pages
  const orderedNavItems = pageOrder
    .map(id => ALL_NAV_ITEMS.find(item => item.id === id))
    .filter((item): item is NavItem => item !== undefined)
    .filter(item => !hiddenPages.includes(item.id));

  // Add role-specific items (manager and admin pages can't be hidden)
  let navItems = [...orderedNavItems];
  if (user?.role === 'admin') {
    navItems.push(managerNavItem);
    navItems.push(adminNavItem);
  } else if (user?.role === 'manager') {
    navItems.push(managerNavItem);
  }

  // Dynamic grid columns based on number of items
  const gridCols = navItems.length <= 5 ? 'grid-cols-5' : navItems.length === 6 ? 'grid-cols-6' : 'grid-cols-7';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden">
      <div className={cn("grid gap-0.5 p-1.5", gridCols)}>
        {navItems.map((item) => (
          <Tooltip key={item.to} delayDuration={300}>
            <TooltipTrigger asChild>
              <span className="contents">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'relative flex flex-col items-center justify-center rounded-lg p-2 text-xs font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {/* Badge pour les notes non lues sur l'icône Équipe */}
                  {item.id === 'manager' && unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </NavLink>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {item.label}
              {item.id === 'manager' && unreadCount > 0 && ` (${unreadCount} non lue${unreadCount > 1 ? 's' : ''})`}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </nav>
  );
}
