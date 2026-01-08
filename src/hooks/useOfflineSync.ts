import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { safeParseJSON, safeStoreJSON } from './useConnectionStatus';

interface SyncQueueItem {
  id: string;
  type: 'onboard' | 'station';
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'sncf_sync_queue';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Load sync queue from localStorage safely
  useEffect(() => {
    const stored = safeParseJSON<SyncQueueItem[]>(SYNC_QUEUE_KEY, []);
    // Ensure all items have required properties
    const validated = stored
      .filter((item): item is SyncQueueItem => 
        item !== null &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.type === 'string' &&
        typeof item.action === 'string' &&
        typeof item.timestamp === 'number'
      )
      .map(item => ({
        ...item,
        retryCount: item.retryCount ?? 0,
        data: item.data ?? {},
      }));
    setSyncQueue(validated);
  }, []);

  // Save sync queue to localStorage safely
  useEffect(() => {
    safeStoreJSON(SYNC_QUEUE_KEY, syncQueue);
  }, [syncQueue]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      // Dismiss offline toast
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      
      toast.success('Connexion rétablie', {
        description: 'Synchronisation des données en cours...',
      });
      syncPendingChanges();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toastIdRef.current = toast.warning('Mode hors-ligne activé', {
        description: 'Les modifications seront synchronisées à la reconnexion.',
        duration: Infinity,
        action: {
          label: 'Réessayer',
          onClick: () => {
            if (navigator.onLine) {
              setIsOnline(true);
              syncPendingChanges();
            } else {
              toast.error('Toujours hors-ligne', {
                description: 'Vérifiez votre connexion internet.',
              });
            }
          },
        },
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
  }, []);

  // Add item to sync queue with validation
  const addToQueue = useCallback((item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) => {
    // Validate item before adding
    if (!item || !item.type || !item.action) {
      console.warn('Invalid sync queue item:', item);
      return null;
    }

    const newItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
      data: item.data ?? {},
    };
    
    setSyncQueue((prev) => [...prev, newItem]);
    
    if (!isOnline) {
      toast.info('Enregistré localement', {
        description: 'Sera synchronisé à la reconnexion.',
      });
    }
    
    return newItem.id;
  }, [isOnline]);

  // Sync pending changes when online
  const syncPendingChanges = useCallback(async () => {
    if (!navigator.onLine || syncQueue.length === 0 || isSyncing) return;

    setIsSyncing(true);
    const failedItems: SyncQueueItem[] = [];
    let successCount = 0;

    for (const item of syncQueue) {
      // Skip items that have exceeded max retries
      if (item.retryCount >= MAX_RETRIES) {
        toast.error('Synchronisation abandonnée', {
          description: `L'élément a échoué après ${MAX_RETRIES} tentatives.`,
        });
        continue;
      }

      try {
        // Validate item data before processing
        if (!item.data || typeof item.data !== 'object') {
          throw new Error('Invalid item data');
        }
        
        // In a real app, this would sync with the backend
        console.log('Syncing item:', item);
        await new Promise((resolve) => setTimeout(resolve, 100));
        successCount++;
      } catch (error) {
        console.error('Sync failed for item:', item, error);
        failedItems.push({
          ...item,
          retryCount: item.retryCount + 1,
        });
      }
    }

    setSyncQueue(failedItems);
    setIsSyncing(false);

    if (successCount > 0 && failedItems.length === 0) {
      toast.success('Synchronisation terminée', {
        description: `${successCount} modification(s) synchronisée(s).`,
      });
    } else if (failedItems.length > 0) {
      toastIdRef.current = toast.error('Synchronisation partielle', {
        description: `${failedItems.length} modification(s) en attente.`,
        duration: Infinity,
        action: {
          label: 'Réessayer',
          onClick: () => forceSync(),
        },
      });
      
      // Schedule automatic retry
      retryTimeoutRef.current = setTimeout(() => {
        if (navigator.onLine) {
          syncPendingChanges();
        }
      }, RETRY_DELAY_MS);
    }
  }, [syncQueue, isSyncing]);

  // Manually trigger sync
  const forceSync = useCallback(() => {
    if (!navigator.onLine) {
      toast.error('Impossible de synchroniser', {
        description: 'Vérifiez votre connexion internet.',
        action: {
          label: 'Réessayer',
          onClick: () => forceSync(),
        },
      });
      return;
    }
    
    // Dismiss any existing toast
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
    
    syncPendingChanges();
  }, [syncPendingChanges]);

  // Clear sync queue
  const clearQueue = useCallback(() => {
    setSyncQueue([]);
    localStorage.removeItem(SYNC_QUEUE_KEY);
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount: syncQueue.length,
    addToQueue,
    forceSync,
    clearQueue,
  };
}
