import { useState, useEffect } from 'react';
import { LayoutDashboard, Train, Building2, Settings, History, Shield, UserCog } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

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
const managerNavItem: NavItem = { id: 'manager', to: '/manager', icon: UserCog, label: 'Équipe' };

export function Navigation() {
  const { user } = useAuth();
  const [pageOrder, setPageOrder] = useState<string[]>(['dashboard', 'onboard', 'station', 'history', 'settings']);

  useEffect(() => {
    const savedOrder = localStorage.getItem('user_page_order');
    if (savedOrder) {
      try {
        setPageOrder(JSON.parse(savedOrder));
      } catch {
        // Keep default order
      }
    }
  }, []);

  // Reorder nav items based on user preference
  const orderedNavItems = pageOrder
    .map(id => ALL_NAV_ITEMS.find(item => item.id === id))
    .filter((item): item is NavItem => item !== undefined);

  // Add role-specific items
  let navItems = [...orderedNavItems];
  if (user?.role === 'admin') {
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
  const [pageOrder, setPageOrder] = useState<string[]>(['dashboard', 'onboard', 'station', 'history', 'settings']);

  useEffect(() => {
    const savedOrder = localStorage.getItem('user_page_order');
    if (savedOrder) {
      try {
        setPageOrder(JSON.parse(savedOrder));
      } catch {
        // Keep default order
      }
    }
  }, []);

  // Reorder nav items based on user preference
  const orderedNavItems = pageOrder
    .map(id => ALL_NAV_ITEMS.find(item => item.id === id))
    .filter((item): item is NavItem => item !== undefined);

  // Add role-specific items
  let navItems = [...orderedNavItems];
  if (user?.role === 'admin') {
    navItems.push(adminNavItem);
  } else if (user?.role === 'manager') {
    navItems.push(managerNavItem);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden">
      <div className={cn("grid gap-1 p-2", navItems.length === 6 ? "grid-cols-6" : "grid-cols-5")}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
