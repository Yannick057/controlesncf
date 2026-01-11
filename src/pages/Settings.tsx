import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Palette, Bell, Info, 
  Moon, Sun, Monitor, 
  Check, ShieldCheck,
  Navigation as NavigationIcon, GripVertical, Bug, Sparkles, Vibrate, Rocket, Eye, EyeOff, Lock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, THEME_OPTIONS, Theme } from '@/contexts/ThemeContext';
import { useReleaseNotes } from '@/hooks/useReleaseNotes';
import { useVersionNotification } from '@/hooks/useVersionNotification';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BugReportDialog } from '@/components/features/BugReportDialog';
import { ReleaseNotesDialog } from '@/components/features/ReleaseNotesDialog';
import { ThemeCreator } from '@/components/features/ThemeCreator';

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
  { id: 'dashboard', label: 'Dashboard', path: '/', canHide: true },
  { id: 'onboard', label: 'À Bord', path: '/onboard', canHide: true },
  { id: 'station', label: 'En Gare', path: '/station', canHide: true },
  { id: 'history', label: 'Historique', path: '/history', canHide: true },
  { id: 'settings', label: 'Paramètres', path: '/settings', canHide: false }, // Non désactivable
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, refreshUserRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const { latestVersion, loading: loadingVersion } = useReleaseNotes();
  const { hasNewVersion, markChangelogViewed } = useVersionNotification();
  const { isEnabled: hapticEnabled, isSupported: hapticSupported, setEnabled: setHapticEnabled } = useHapticFeedback();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [defaultPage, setDefaultPage] = useState('/');
  const [pageOrder, setPageOrder] = useState<string[]>(['dashboard', 'onboard', 'station', 'history', 'settings']);
  const [hiddenPages, setHiddenPages] = useState<string[]>([]);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

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
      const { data, error } = await supabase
        .from('user_preferences')
        .select('default_page, page_order, hidden_pages')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        setDefaultPage(data.default_page || '/');
        if (data.page_order && Array.isArray(data.page_order)) {
          setPageOrder(data.page_order as string[]);
        }
        if (data.hidden_pages && Array.isArray(data.hidden_pages)) {
          setHiddenPages(data.hidden_pages as string[]);
          localStorage.setItem('user_hidden_pages', JSON.stringify(data.hidden_pages));
        }
      } else {
        // Load from localStorage as fallback
        const savedPage = localStorage.getItem('user_default_page');
        const savedOrder = localStorage.getItem('user_page_order');
        const savedHidden = localStorage.getItem('user_hidden_pages');
        if (savedPage) setDefaultPage(savedPage);
        if (savedOrder) {
          try {
            setPageOrder(JSON.parse(savedOrder));
          } catch {}
        }
        if (savedHidden) {
          try {
            setHiddenPages(JSON.parse(savedHidden));
          } catch {}
        }
      }
      setPrefsLoaded(true);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setPrefsLoaded(true);
    }
  };

  const saveUserPreferences = async () => {
    if (!user?.id) {
      toast.error('Utilisateur non connecté');
      return;
    }
    
    setSavingPreferences(true);
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking existing preferences:', fetchError);
        throw fetchError;
      }

      let saveError;
      if (existing) {
        const { error } = await supabase
          .from('user_preferences')
          .update({ 
            default_page: defaultPage, 
            page_order: pageOrder,
            hidden_pages: hiddenPages,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        saveError = error;
      } else {
        const { error } = await supabase
          .from('user_preferences')
          .insert({ 
            user_id: user.id, 
            default_page: defaultPage, 
            page_order: pageOrder,
            hidden_pages: hiddenPages
          });
        saveError = error;
      }

      if (saveError) {
        console.error('Error saving preferences:', saveError);
        throw saveError;
      }

      // Save to localStorage for quick access
      localStorage.setItem('user_default_page', defaultPage);
      localStorage.setItem('user_page_order', JSON.stringify(pageOrder));
      localStorage.setItem('user_hidden_pages', JSON.stringify(hiddenPages));

      toast.success('Préférences de navigation enregistrées');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Erreur lors de la sauvegarde des préférences');
    } finally {
      setSavingPreferences(false);
    }
  };

  const togglePageVisibility = (pageId: string) => {
    if (hiddenPages.includes(pageId)) {
      setHiddenPages(hiddenPages.filter(p => p !== pageId));
    } else {
      setHiddenPages([...hiddenPages, pageId]);
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
            <p className="text-xs text-muted-foreground">
              Page actuelle: {PAGE_OPTIONS.find(p => p.value === defaultPage)?.label || defaultPage}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Visibilité des pages</label>
            <p className="text-xs text-muted-foreground mb-2">
              Activez ou désactivez les pages dans la navigation
            </p>
            <div className="space-y-2">
              {PAGE_ORDER_OPTIONS.map((page) => {
                const isHidden = hiddenPages.includes(page.id);
                const canToggle = page.canHide;
                return (
                  <button
                    key={page.id}
                    onClick={() => canToggle && togglePageVisibility(page.id)}
                    disabled={!canToggle}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border p-3 transition-all',
                      !canToggle 
                        ? 'border-border bg-muted/30 cursor-not-allowed opacity-60' 
                        : isHidden 
                          ? 'border-border hover:border-primary/50' 
                          : 'border-primary bg-primary/10'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isHidden ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-primary" />
                      )}
                      <span className={cn(isHidden && 'text-muted-foreground')}>{page.label}</span>
                      {!canToggle && (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className={cn(
                      'flex h-6 w-11 items-center rounded-full p-1 transition-colors',
                      !canToggle ? 'bg-primary' : isHidden ? 'bg-muted' : 'bg-primary'
                    )}>
                      <div className={cn(
                        'h-4 w-4 rounded-full bg-background transition-transform',
                        !canToggle || !isHidden ? 'translate-x-5' : 'translate-x-0'
                      )} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ordre des pages</label>
            <div className="space-y-2">
              {pageOrder.map((pageId, index) => {
                const page = PAGE_ORDER_OPTIONS.find(p => p.id === pageId);
                if (!page) return null;
                const isHidden = hiddenPages.includes(page.id);
                return (
                  <div 
                    key={pageId}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border border-border bg-card p-3",
                      isHidden && "opacity-50"
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 font-medium">{page.label}</span>
                    {isHidden && (
                      <span className="text-xs text-muted-foreground">(masquée)</span>
                    )}
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

      {/* Custom Themes */}
      <div className="animate-slide-up" style={{ animationDelay: '75ms' }}>
        <ThemeCreator />
      </div>

      {/* Notifications */}
      <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications & Retour haptique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {hapticSupported && (
            <button
              onClick={() => setHapticEnabled(!hapticEnabled)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-4 transition-all',
                hapticEnabled 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-3">
                <Vibrate className={cn('h-5 w-5', hapticEnabled ? 'text-primary' : 'text-muted-foreground')} />
                <div className="text-left">
                  <span className="block">Vibration de confirmation</span>
                  <span className="text-xs text-muted-foreground">Retour haptique lors des validations</span>
                </div>
              </div>
              <div className={cn(
                'flex h-6 w-11 items-center rounded-full p-1 transition-colors',
                hapticEnabled ? 'bg-primary' : 'bg-muted'
              )}>
                <div className={cn(
                  'h-4 w-4 rounded-full bg-background transition-transform',
                  hapticEnabled ? 'translate-x-5' : 'translate-x-0'
                )} />
              </div>
            </button>
          )}
        </CardContent>
      </Card>

      {/* Support & Feedback */}
      <Card className="animate-slide-up" style={{ animationDelay: '125ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-primary" />
            Support & Feedback
          </CardTitle>
          <CardDescription>
            Signaler un problème ou consulter les mises à jour
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <BugReportDialog>
              <Button variant="outline">
                <Bug className="mr-2 h-4 w-4" />
                Signaler un bug
              </Button>
            </BugReportDialog>
            <ReleaseNotesDialog>
              <Button variant="outline">
                <Sparkles className="mr-2 h-4 w-4" />
                Notes de version
              </Button>
            </ReleaseNotesDialog>
            <Button 
              variant="outline" 
              onClick={() => {
                markChangelogViewed();
                navigate('/changelog');
              }}
              className="relative"
            >
              <Rocket className="mr-2 h-4 w-4" />
              Changelog complet
              {hasNewVersion && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-pulse">
                  !
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="animate-slide-up" style={{ animationDelay: '150ms' }}>
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
              <span className="font-medium">
                {loadingVersion ? '...' : latestVersion?.version || '1.0.0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version API</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dernière mise à jour</span>
              <span className="font-medium">
                {loadingVersion ? '...' : latestVersion?.releaseDate 
                  ? new Date(latestVersion.releaseDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                  : 'Janvier 2026'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
