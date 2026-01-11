import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeatureSettings {
  agent_performance_charts: boolean;
  global_search: boolean;
  pdf_export_manager: boolean;
  fraud_heatmap: boolean;
  team_notes: boolean;
  bug_reports: boolean;
  onboard_controls: boolean;
  station_controls: boolean;
}

const DEFAULT_SETTINGS: FeatureSettings = {
  agent_performance_charts: true,
  global_search: true,
  pdf_export_manager: true,
  fraud_heatmap: true,
  team_notes: true,
  bug_reports: true,
  onboard_controls: true,
  station_controls: true,
};

const FEATURE_LABELS: Record<keyof FeatureSettings, { name: string; description: string }> = {
  agent_performance_charts: {
    name: 'Graphiques de performance',
    description: 'Affiche les statistiques de performance par agent sur la page Manager',
  },
  global_search: {
    name: 'Recherche globale',
    description: 'Permet la recherche dans toute l\'application (contrôles, utilisateurs, versions)',
  },
  pdf_export_manager: {
    name: 'Export PDF Manager',
    description: 'Permet l\'export PDF des statistiques d\'équipe pour les managers',
  },
  fraud_heatmap: {
    name: 'Carte de chaleur fraude',
    description: 'Affiche la carte de chaleur des fraudes sur le dashboard',
  },
  team_notes: {
    name: 'Notes d\'équipe',
    description: 'Permet l\'envoi de notes entre membres de l\'équipe',
  },
  bug_reports: {
    name: 'Signalement de bugs',
    description: 'Permet aux utilisateurs de signaler des bugs',
  },
  onboard_controls: {
    name: 'Contrôles à bord',
    description: 'Active la page de saisie des contrôles à bord',
  },
  station_controls: {
    name: 'Contrôles en gare',
    description: 'Active la page de saisie des contrôles en gare',
  },
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
      // Try update first
      const { data, error: updateError } = await supabase
        .from('admin_feature_settings')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('feature_key', featureKey)
        .select();

      // If no rows updated, insert
      if (!updateError && (!data || data.length === 0)) {
        const { error: insertError } = await supabase
          .from('admin_feature_settings')
          .insert({ feature_key: featureKey, enabled });
        
        if (insertError) throw insertError;
      } else if (updateError) {
        throw updateError;
      }

      setSettings(prev => ({ ...prev, [featureKey]: enabled }));
      toast.success(enabled ? 'Fonctionnalité activée' : 'Fonctionnalité désactivée');
    } catch (error) {
      console.error('Error toggling feature:', error);
      toast.error('Erreur lors de la modification');
    }
  }, []);

  return { settings, loading, toggleFeature, refetch: fetchSettings, FEATURE_LABELS };
}
