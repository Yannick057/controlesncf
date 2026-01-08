import { Wifi, WifiOff, RefreshCw, Cloud, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, forceSync } = useOfflineSync();

  return (
    <div className="flex items-center gap-2">
      {/* Connection Status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
              isOnline 
                ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                : "bg-destructive/10 text-destructive animate-pulse"
            )}
          >
            {isOnline ? (
              <>
                <Cloud className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Connecté</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Hors-ligne</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isOnline ? 'Connecté au serveur' : 'Connexion perdue - Mode hors-ligne actif'}</p>
        </TooltipContent>
      </Tooltip>

      {/* Pending Sync Counter */}
      {pendingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={isOnline ? "outline" : "destructive"}
              size="sm" 
              className={cn(
                "h-7 gap-1.5 text-xs font-medium",
                !isOnline && "animate-pulse"
              )}
              onClick={forceSync}
              disabled={!isOnline || isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              <span>{pendingCount} en attente</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{pendingCount} modification(s) en attente</p>
            <p className="text-xs text-muted-foreground">
              {isOnline 
                ? 'Cliquez pour synchroniser maintenant' 
                : 'Sera synchronisé automatiquement à la reconnexion'}
            </p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Syncing Indicator */}
      {isSyncing && (
        <Badge variant="secondary" className="gap-1 text-xs animate-pulse">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Sync...
        </Badge>
      )}
    </div>
  );
}
