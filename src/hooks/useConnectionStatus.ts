import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface ConnectionStatusOptions {
  retryDelay?: number;
  maxRetries?: number;
  onReconnect?: () => void;
}

interface PendingRetry {
  id: string;
  action: () => Promise<any>;
  description: string;
  retryCount: number;
}

export function useConnectionStatus(options: ConnectionStatusOptions = {}) {
  const { retryDelay = 5000, maxRetries = 3, onReconnect } = options;
  
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pendingRetries, setPendingRetries] = useState<PendingRetry[]>([]);
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastError(null);
      
      // Dismiss any existing connection error toast
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      
      toast.success('Connexion rétablie', {
        description: pendingRetries.length > 0 
          ? `${pendingRetries.length} action(s) en attente de synchronisation`
          : 'Vous êtes de nouveau en ligne',
      });
      
      onReconnect?.();
      
      // Auto-retry pending actions
      if (pendingRetries.length > 0) {
        retryPendingActions();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toastIdRef.current = toast.warning('Mode hors-ligne', {
        description: 'Les modifications seront synchronisées à la reconnexion.',
        duration: Infinity,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [pendingRetries, onReconnect]);

  // Execute with connection handling
  const executeWithRetry = useCallback(async <T>(
    action: () => Promise<T>,
    description: string = 'Action'
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    // Check if online first
    if (!navigator.onLine) {
      setIsOnline(false);
      const retryId = crypto.randomUUID();
      setPendingRetries(prev => [...prev, {
        id: retryId,
        action,
        description,
        retryCount: 0,
      }]);
      
      return {
        success: false,
        error: 'Vous êtes hors-ligne. L\'action sera retentée automatiquement.',
      };
    }

    setIsConnecting(true);
    setLastError(null);

    try {
      const data = await action();
      setIsConnecting(false);
      return { success: true, data };
    } catch (error: any) {
      setIsConnecting(false);
      
      // Determine if it's a network/timeout error
      const isNetworkError = 
        error?.message?.includes('fetch') ||
        error?.message?.includes('network') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('Failed to fetch') ||
        error?.code === 'ECONNABORTED' ||
        error?.name === 'TypeError';

      if (isNetworkError) {
        const errorMessage = 'Erreur de connexion. Nouvelle tentative automatique...';
        setLastError(errorMessage);
        
        // Add to pending retries
        const retryId = crypto.randomUUID();
        setPendingRetries(prev => [...prev, {
          id: retryId,
          action,
          description,
          retryCount: 0,
        }]);

        // Show persistent toast with retry option
        toastIdRef.current = toast.error('Échec de connexion', {
          description: errorMessage,
          duration: Infinity,
          action: {
            label: 'Réessayer',
            onClick: () => retryPendingActions(),
          },
        });

        // Schedule automatic retry
        retryTimeoutRef.current = setTimeout(() => {
          if (navigator.onLine) {
            retryPendingActions();
          }
        }, retryDelay);

        return { success: false, error: errorMessage };
      }

      // Non-network error
      const errorMessage = error?.message || 'Une erreur est survenue';
      setLastError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [retryDelay]);

  // Retry all pending actions
  const retryPendingActions = useCallback(async () => {
    if (pendingRetries.length === 0 || isConnecting) return;

    setIsConnecting(true);
    
    // Dismiss existing error toast
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }

    const stillPending: PendingRetry[] = [];
    let successCount = 0;

    for (const retry of pendingRetries) {
      if (retry.retryCount >= maxRetries) {
        toast.error(`Échec: ${retry.description}`, {
          description: 'Nombre maximum de tentatives atteint.',
        });
        continue;
      }

      try {
        await retry.action();
        successCount++;
      } catch (error) {
        stillPending.push({
          ...retry,
          retryCount: retry.retryCount + 1,
        });
      }
    }

    setPendingRetries(stillPending);
    setIsConnecting(false);
    setLastError(stillPending.length > 0 ? 'Certaines actions ont échoué' : null);

    if (successCount > 0) {
      toast.success('Synchronisation réussie', {
        description: `${successCount} action(s) synchronisée(s).`,
      });
    }

    if (stillPending.length > 0) {
      toastIdRef.current = toast.error('Actions en attente', {
        description: `${stillPending.length} action(s) n'ont pas pu être synchronisées.`,
        duration: Infinity,
        action: {
          label: 'Réessayer',
          onClick: () => retryPendingActions(),
        },
      });
    }
  }, [pendingRetries, isConnecting, maxRetries]);

  // Manual retry trigger
  const manualRetry = useCallback(() => {
    if (!navigator.onLine) {
      toast.error('Toujours hors-ligne', {
        description: 'Vérifiez votre connexion internet.',
      });
      return;
    }
    retryPendingActions();
  }, [retryPendingActions]);

  // Clear pending actions
  const clearPending = useCallback(() => {
    setPendingRetries([]);
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, []);

  return {
    isOnline,
    isConnecting,
    lastError,
    pendingCount: pendingRetries.length,
    executeWithRetry,
    manualRetry,
    clearPending,
  };
}

// Utility function to safely access nested properties
export function safeAccess<T>(
  data: T | null | undefined,
  defaultValue: T
): T {
  return data ?? defaultValue;
}

// Utility function to safely parse JSON from localStorage
export function safeParseJSON<T>(
  key: string,
  defaultValue: T
): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    
    const parsed = JSON.parse(stored);
    return parsed ?? defaultValue;
  } catch (error) {
    console.warn(`Failed to parse localStorage key "${key}":`, error);
    return defaultValue;
  }
}

// Utility function to safely stringify and store in localStorage
export function safeStoreJSON(key: string, data: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Failed to store in localStorage key "${key}":`, error);
    return false;
  }
}
