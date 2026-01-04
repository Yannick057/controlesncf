import { useState, useEffect } from 'react';
import { 
  User, Palette, Database, Bell, Info, 
  Moon, Sun, Monitor, Download, Upload, Trash2, 
  ExternalLink, Bug, HelpCircle, Check, ShieldCheck,
  Navigation as NavigationIcon, GripVertical
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, THEME_OPTIONS, Theme } from '@/contexts/ThemeContext';
import { useOnboardControls, useStationControls } from '@/hooks/useControls';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type UserRole = 'agent' | 'manager' | 'admin';

const ROLE_LABELS: Record<UserRole, string> = {
  agent: 'Agent de contrôle',
  manager: 'Manager',
  admin: 'Administrateur',
};

const THEME_ICONS: Record<Theme, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  auto: Monitor,
  stranger: () => <span className="text-lg">🔴</span>,
  neon: () => <span className="text-lg">💜</span>,
  cyberpunk: () => <span className="text-lg">🌆</span>,
  gold: () => <span className="text-lg">✨</span>,
  aurora: () => <span className="text-lg">🌊</span>,
};

const PAGE_OPTIONS = [
  { value: '/', label: 'Dashboard' },
  { value: '/onboard', label: 'À Bord' },
  { value: '/station', label: 'En Gare' },
  { value: '/history', label: 'Historique' },
  { value: '/settings', label: 'Paramètres' },
];

const PAGE_ORDER_OPTIONS = [
  { id: 'dashboard', label: 'Dashboard', path: '/' },
  { id: 'onboard', label: 'À Bord', path: '/onboard' },
  { id: 'station', label: 'En Gare', path: '/station' },
  { id: 'history', label: 'Historique', path: '/history' },
  { id: 'settings', label: 'Paramètres', path: '/settings' },
];

export default function Settings() {
  const { user, refreshUserRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const { controls: onboardControls, clearControls: clearOnboard, setControls: setOnboard } = useOnboardControls();
  const { controls: stationControls, clearControls: clearStation, setControls: setStation } = useStationControls();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [defaultPage, setDefaultPage] = useState('/');
  const [pageOrder, setPageOrder] = useState<string[]>(['dashboard', 'onboard', 'station', 'history', 'settings']);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Refresh user role on mount
  useEffect(() => {
    refreshUserRole();
    loadUserPreferences();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('notifications_enabled');
    setNotificationsEnabled(saved === 'true');
  }, []);

  const loadUserPreferences = async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('default_page, page_order')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setDefaultPage(data.default_page);
        if (data.page_order && Array.isArray(data.page_order)) {
          setPageOrder(data.page_order as string[]);
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const saveUserPreferences = async () => {
    if (!user?.id) return;
    
    setSavingPreferences(true);
    try {
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_preferences')
          .update({ default_page: defaultPage, page_order: pageOrder })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_preferences')
          .insert({ user_id: user.id, default_page: defaultPage, page_order: pageOrder });
      }

      // Save to localStorage for quick access
      localStorage.setItem('user_default_page', defaultPage);
      localStorage.setItem('user_page_order', JSON.stringify(pageOrder));

      toast.success('Préférences de navigation enregistrées');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Erreur lors de la sauvegarde des préférences');
    } finally {
      setSavingPreferences(false);
    }
  };

  const movePageUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...pageOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setPageOrder(newOrder);
  };

  const movePageDown = (index: number) => {
    if (index === pageOrder.length - 1) return;
    const newOrder = [...pageOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setPageOrder(newOrder);
  };

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('notifications_enabled', 'true');
        toast.success('Notifications activées');
      } else {
        toast.error('Permission refusée');
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('notifications_enabled', 'false');
      toast.info('Notifications désactivées');
    }
  };

  const userRole = user?.role || 'agent';

  const handleExport = () => {
    const data = {
      onboardControls,
      stationControls,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sncf-controles-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Données exportées avec succès');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            if (data.onboardControls) {
              const merged = [...data.onboardControls, ...onboardControls];
              setOnboard(merged);
              localStorage.setItem('sncf-controls-onboard', JSON.stringify(merged));
            }
            if (data.stationControls) {
              const merged = [...data.stationControls, ...stationControls];
              setStation(merged);
              localStorage.setItem('sncf-controls-station', JSON.stringify(merged));
            }
            toast.success('Données importées avec succès');
          } catch {
            toast.error('Fichier invalide');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleReset = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les données ? Cette action est irréversible.')) {
      clearOnboard();
      clearStation();
      toast.success('Toutes les données ont été supprimées');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Gérez votre compte et les préférences de l'application</p>
      </div>

      {/* User Account */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Compte utilisateur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm text-muted-foreground">Nom</label>
              <p className="font-medium">{user?.name || 'Agent SNCF'}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Rôle</label>
              <p className="font-medium flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {ROLE_LABELS[userRole]}
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Dernière connexion</label>
              <p className="font-medium">
                {user?.lastLogin 
                  ? new Date(user.lastLogin).toLocaleString('fr-FR')
                  : 'Non disponible'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Preferences */}
      <Card className="animate-slide-up" style={{ animationDelay: '25ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <NavigationIcon className="h-5 w-5 text-primary" />
            Préférences de navigation
          </CardTitle>
          <CardDescription>
            Choisissez votre page par défaut et l'ordre des pages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Page par défaut</label>
            <Select value={defaultPage} onValueChange={setDefaultPage}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Choisir une page" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_OPTIONS.map((page) => (
                  <SelectItem key={page.value} value={page.value}>
                    {page.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ordre des pages</label>
            <div className="space-y-2">
              {pageOrder.map((pageId, index) => {
                const page = PAGE_ORDER_OPTIONS.find(p => p.id === pageId);
                if (!page) return null;
                return (
                  <div 
                    key={pageId}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card p-3"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 font-medium">{page.label}</span>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => movePageUp(index)}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => movePageDown(index)}
                        disabled={index === pageOrder.length - 1}
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Button onClick={saveUserPreferences} disabled={savingPreferences}>
            {savingPreferences ? 'Enregistrement...' : 'Enregistrer les préférences'}
          </Button>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card className="animate-slide-up" style={{ animationDelay: '50ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Apparence & Thèmes
          </CardTitle>
          <CardDescription>
            Choisissez parmi {THEME_OPTIONS.length} thèmes disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {THEME_OPTIONS.map((option) => {
              const IconComponent = THEME_ICONS[option.value];
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200',
                    theme === option.value
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                  )}
                >
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg',
                    theme === option.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  )}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">{option.label}</p>
                  </div>
                  {theme === option.value && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Gestion des données
          </CardTitle>
          <CardDescription>
            {onboardControls.length + stationControls.length} contrôles enregistrés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exporter mes contrôles (JSON)
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleImport}>
            <Upload className="h-4 w-4" />
            Importer des contrôles
          </Button>
          <Button variant="destructive" className="w-full justify-start gap-2" onClick={handleReset}>
            <Trash2 className="h-4 w-4" />
            Réinitialiser toutes les données
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="animate-slide-up" style={{ animationDelay: '150ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={handleNotificationToggle}
            className={cn(
              'flex w-full items-center justify-between rounded-lg border p-4 transition-all',
              notificationsEnabled 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="flex items-center gap-3">
              <Bell className={cn('h-5 w-5', notificationsEnabled ? 'text-primary' : 'text-muted-foreground')} />
              <span>Notifications desktop</span>
            </div>
            <div className={cn(
              'flex h-6 w-11 items-center rounded-full p-1 transition-colors',
              notificationsEnabled ? 'bg-primary' : 'bg-muted'
            )}>
              <div className={cn(
                'h-4 w-4 rounded-full bg-background transition-transform',
                notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
              )} />
            </div>
          </button>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            À propos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version app</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version API</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dernière mise à jour</span>
              <span className="font-medium">31/12/2025</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Notes de version
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Bug className="h-4 w-4" />
              Signaler un bug
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Support SNCF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}