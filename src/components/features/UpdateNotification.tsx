import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { useVersionNotification } from '@/hooks/useVersionNotification';
import { Button } from '@/components/ui/button';

export function UpdateNotification() {
  const navigate = useNavigate();
  const { 
    latestVersion, 
    shouldShowNotification, 
    dismissNotification,
    markChangelogViewed 
  } = useVersionNotification();

  useEffect(() => {
    if (shouldShowNotification && latestVersion) {
      const toastId = toast.custom(
        (t) => (
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-card p-4 shadow-lg">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-foreground">
                Nouvelle version disponible ! 🎉
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-mono font-medium text-primary">v{latestVersion.version}</span>
                {' - '}
                {latestVersion.title}
              </p>
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={() => {
                    markChangelogViewed();
                    navigate('/changelog');
                    toast.dismiss(t);
                  }}
                >
                  Voir les nouveautés
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    dismissNotification();
                    toast.dismiss(t);
                  }}
                >
                  Plus tard
                </Button>
              </div>
            </div>
          </div>
        ),
        {
          duration: 15000,
          position: 'top-center',
        }
      );

      return () => {
        toast.dismiss(toastId);
      };
    }
  }, [shouldShowNotification, latestVersion, navigate, dismissNotification, markChangelogViewed]);

  return null;
}
