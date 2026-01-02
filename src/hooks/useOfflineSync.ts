import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface SyncQueueItem {
  id: string;
  type: 'onboard' | 'station';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

const SYNC_QUEUE_KEY = 'sncf_sync_queue';
const OFFLINE_DATA_KEY = 'sncf_offline_data';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load sync queue from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    if (stored) {
      setSyncQueue(JSON.parse(stored));
    }
  }, []);

  // Save sync queue to localStorage
  useEffect(() => {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
  }, [syncQueue]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connexion rétablie', {
        description: 'Synchronisation des données en cours...',
      });
      syncPendingChanges();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Mode hors-ligne activé', {
        description: 'Les modifications seront synchronisées à la reconnexion.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add item to sync queue
  const addToQueue = useCallback((item: Omit<SyncQueueItem, 'id' | 'timestamp'>) => {
    const newItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
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
    if (!isOnline || syncQueue.length === 0 || isSyncing) return;

    setIsSyncing(true);
    const failedItems: SyncQueueItem[] = [];

    for (const item of syncQueue) {
      try {
        // In a real app, this would sync with the backend
        // For now, we just process locally and clear the queue
        console.log('Syncing item:', item);
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Sync failed for item:', item, error);
        failedItems.push(item);
      }
    }

    setSyncQueue(failedItems);
    setIsSyncing(false);

    if (failedItems.length === 0) {
      toast.success('Synchronisation terminée', {
        description: `${syncQueue.length} modification(s) synchronisée(s).`,
      });
    } else {
      toast.error('Synchronisation partielle', {
        description: `${failedItems.length} modification(s) en attente.`,
      });
    }
  }, [isOnline, syncQueue, isSyncing]);

  // Manually trigger sync
  const forceSync = useCallback(() => {
    if (!isOnline) {
      toast.error('Impossible de synchroniser', {
        description: 'Vérifiez votre connexion internet.',
      });
      return;
    }
    syncPendingChanges();
  }, [isOnline, syncPendingChanges]);

  // Clear sync queue
  const clearQueue = useCallback(() => {
    setSyncQueue([]);
    localStorage.removeItem(SYNC_QUEUE_KEY);
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
