import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationSettings {
  fraudThreshold: number;
  notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  fraudThreshold: 5.0,
  notificationsEnabled: true,
};

const LOCAL_SETTINGS_KEY = 'sncf_notification_settings';

export function useFraudNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [hasPermission, setHasPermission] = useState(false);
  const [lastAlertedRate, setLastAlertedRate] = useState<number | null>(null);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      // Try local storage first
      const local = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (local) {
        setSettings(JSON.parse(local));
      }

      // If authenticated, try to load from database
      if (isAuthenticated && user?.id) {
        try {
          const { data } = await supabase
            .from('notification_settings')
            .select('fraud_threshold, notifications_enabled')
            .eq('user_id', user.id)
            .single();

          if (data) {
            const dbSettings = {
              fraudThreshold: data.fraud_threshold,
              notificationsEnabled: data.notifications_enabled,
            };
            setSettings(dbSettings);
            localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(dbSettings));
          }
        } catch (error) {
          console.error('Error loading notification settings:', error);
        }
      }
    };

    loadSettings();
  }, [isAuthenticated, user?.id]);

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications non supportées', {
        description: 'Votre navigateur ne supporte pas les notifications.',
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      
      if (granted) {
        toast.success('Notifications activées');
      } else {
        toast.error('Notifications refusées');
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updated));

    // Save to database if authenticated
    if (isAuthenticated && user?.id) {
      try {
        await supabase
          .from('notification_settings')
          .upsert({
            user_id: user.id,
            fraud_threshold: updated.fraudThreshold,
            notifications_enabled: updated.notificationsEnabled,
          });
      } catch (error) {
        console.error('Error saving notification settings:', error);
      }
    }

    toast.success('Paramètres mis à jour');
  }, [settings, isAuthenticated, user?.id]);

  // Check fraud rate and alert if threshold exceeded
  const checkFraudRate = useCallback((currentRate: number) => {
    if (!settings.notificationsEnabled) return;
    if (currentRate <= settings.fraudThreshold) return;
    if (lastAlertedRate !== null && Math.abs(currentRate - lastAlertedRate) < 0.5) return;

    setLastAlertedRate(currentRate);

    // Show toast notification
    toast.warning(`Alerte fraude : ${currentRate.toFixed(1)}%`, {
      description: `Le taux de fraude dépasse le seuil de ${settings.fraudThreshold}%`,
      duration: 10000,
    });

    // Show browser notification if permission granted
    if (hasPermission && document.hidden) {
      new Notification('🚨 Alerte Fraude SNCF', {
        body: `Taux de fraude : ${currentRate.toFixed(1)}% (seuil : ${settings.fraudThreshold}%)`,
        icon: '/favicon.ico',
        tag: 'fraud-alert',
      });
    }
  }, [settings, hasPermission, lastAlertedRate]);

  return {
    settings,
    hasPermission,
    requestPermission,
    updateSettings,
    checkFraudRate,
  };
}
