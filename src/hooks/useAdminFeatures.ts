import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeatureSettings {
  agent_performance_charts: boolean;
}

const DEFAULT_SETTINGS: FeatureSettings = {
  agent_performance_charts: true,
};

export function useAdminFeatures() {
  const [settings, setSettings] = useState<FeatureSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_feature_settings')
        .select('feature_key, enabled');

      if (error) throw error;

      const newSettings = { ...DEFAULT_SETTINGS };
      data?.forEach((row: any) => {
        if (row.feature_key in newSettings) {
          (newSettings as any)[row.feature_key] = row.enabled;
        }
      });

      setSettings(newSettings);
    } catch (error) {
      console.error('Error fetching feature settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const toggleFeature = useCallback(async (featureKey: keyof FeatureSettings, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_feature_settings')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('feature_key', featureKey);

      if (error) throw error;

      setSettings(prev => ({ ...prev, [featureKey]: enabled }));
      toast.success(enabled ? 'Fonctionnalité activée' : 'Fonctionnalité désactivée');
    } catch (error) {
      console.error('Error toggling feature:', error);
      toast.error('Erreur lors de la modification');
    }
  }, []);

  return { settings, loading, toggleFeature, refetch: fetchSettings };
}
