import { Wifi, WifiOff, RefreshCw, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount, forceSync } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-success">
            <Cloud className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Connecté et synchronisé</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!isOnline ? (
        <Badge variant="destructive" className="gap-1">
          <WifiOff className="h-3 w-3" />
          Hors-ligne
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1">
          <Wifi className="h-3 w-3" />
          En ligne
        </Badge>
      )}

      {pendingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 gap-1"
              onClick={forceSync}
              disabled={!isOnline || isSyncing}
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {pendingCount}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{pendingCount} modification(s) en attente de synchronisation</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
