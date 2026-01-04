import { LayoutDashboard, Train, Building2, Settings, History, Shield } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const baseNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/onboard', icon: Train, label: 'À Bord' },
  { to: '/station', icon: Building2, label: 'En Gare' },
  { to: '/history', icon: History, label: 'Historique' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
];

const adminNavItem = { to: '/admin', icon: Shield, label: 'Admin' };

export function Navigation() {
  const { user } = useAuth();
  const navItems = user?.role === 'admin' ? [...baseNavItems, adminNavItem] : baseNavItems;

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
  const navItems = user?.role === 'admin' ? [...baseNavItems, adminNavItem] : baseNavItems;

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
