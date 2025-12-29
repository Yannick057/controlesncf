import { useState, useEffect } from 'react';
import { 
  User, Palette, Smartphone, Database, Bell, Info, 
  Moon, Sun, Monitor, Download, Upload, Trash2, 
  ExternalLink, Bug, HelpCircle, Check
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useOnboardControls, useStationControls } from '@/hooks/useControls';
import { usePWA } from '@/hooks/usePWA';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { controls: onboardControls, clearControls: clearOnboard, setControls: setOnboard } = useOnboardControls();
  const { controls: stationControls, clearControls: clearStation, setControls: setStation } = useStationControls();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { isInstalled, isInstallable, install } = usePWA();

  useEffect(() => {
    const saved = localStorage.getItem('notifications_enabled');
    setNotificationsEnabled(saved === 'true');
  }, []);

  const handleInstallApp = async () => {
    const success = await install();
    if (success) {
      toast.success('Application installée avec succès !');
    } else if (!isInstallable) {
      // Show manual instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        toast.info('Appuyez sur Partager puis "Sur l\'écran d\'accueil"');
      } else {
        toast.info('Utilisez le menu du navigateur pour installer l\'application');
      }
    }
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

  const themeOptions = [
    { value: 'dark' as const, label: 'Sombre', icon: Moon, description: 'Réduction de la fatigue oculaire' },
    { value: 'light' as const, label: 'Clair', icon: Sun, description: 'Meilleure lisibilité en plein jour' },
    { value: 'auto' as const, label: 'Auto', icon: Monitor, description: 'Suit les préférences système' },
  ];

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
              <p className="font-medium">Agent de contrôle</p>
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

      {/* Theme */}
      <Card className="animate-slide-up" style={{ animationDelay: '50ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Apparence & Thèmes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {themeOptions.map((option) => (
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
                  <option.icon className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                {theme === option.value && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PWA */}
      <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Application mobile
          </CardTitle>
          <CardDescription>Installez l'application pour un accès rapide</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              isInstalled ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
            )}>
              {isInstalled ? <Check className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {isInstalled ? 'Application installée' : 'Application non installée'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isInstalled 
                  ? 'Vous utilisez la version installée'
                  : 'Ajoutez l\'app à votre écran d\'accueil'}
              </p>
            </div>
          </div>
          
          {!isInstalled && (
            <Button onClick={handleInstallApp} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Installer l'application
            </Button>
          )}
          
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span><span className="font-medium">Version:</span> 1.0.0</span>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="animate-slide-up" style={{ animationDelay: '150ms' }}>
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
      <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
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
                'h-4 w-4 rounded-full bg-white transition-transform',
                notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
              )} />
            </div>
          </button>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="animate-slide-up" style={{ animationDelay: '250ms' }}>
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
              <span className="font-medium">29/12/2025</span>
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
