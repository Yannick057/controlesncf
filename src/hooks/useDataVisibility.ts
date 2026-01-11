import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DataVisibilitySetting {
  id: string;
  userId: string;
  canViewAllData: boolean;
  grantedBy: string | null;
  grantedAt: string | null;
}

export function useDataVisibility() {
  const { user } = useAuth();
  const [canViewAllData, setCanViewAllData] = useState(false);
  const [globalVisibility, setGlobalVisibility] = useState(false);
  const [allSettings, setAllSettings] = useState<DataVisibilitySetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Fetch global setting
      const { data: globalData } = await supabase
        .from('admin_feature_settings')
        .select('enabled')
        .eq('feature_key', 'global_data_visibility')
        .single();

      const isGlobalEnabled = globalData?.enabled || false;
      setGlobalVisibility(isGlobalEnabled);

      // Check user's own visibility setting
      const { data: userSetting } = await supabase
        .from('data_visibility_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // User can view all data if global is enabled OR they have individual permission
      setCanViewAllData(isGlobalEnabled || userSetting?.can_view_all_data || false);

      // If admin, fetch all settings
      if (user.role === 'admin') {
        const { data: allData } = await supabase
          .from('data_visibility_settings')
          .select('*');

        setAllSettings((allData || []).map((s: any) => ({
          id: s.id,
          userId: s.user_id,
          canViewAllData: s.can_view_all_data,
          grantedBy: s.granted_by,
          grantedAt: s.granted_at,
        })));
      }
    } catch (error) {
      console.error('Error fetching data visibility settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const toggleGlobalVisibility = useCallback(async (enabled: boolean) => {
    if (user?.role !== 'admin') return;

    try {
      const { error } = await supabase
        .from('admin_feature_settings')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('feature_key', 'global_data_visibility');

      if (error) throw error;

      setGlobalVisibility(enabled);
      toast.success(enabled 
        ? 'Visibilité globale activée - Tous les utilisateurs peuvent voir toutes les données' 
        : 'Visibilité globale désactivée'
      );
      fetchSettings();
    } catch (error) {
      console.error('Error toggling global visibility:', error);
      toast.error('Erreur lors de la modification');
    }
  }, [user?.role, fetchSettings]);

  const grantUserVisibility = useCallback(async (userId: string, canView: boolean) => {
    if (user?.role !== 'admin') return;

    try {
      // Check if setting exists
      const { data: existing } = await supabase
        .from('data_visibility_settings')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('data_visibility_settings')
          .update({
            can_view_all_data: canView,
            granted_by: user.id,
            granted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('data_visibility_settings')
          .insert({
            user_id: userId,
            can_view_all_data: canView,
            granted_by: user.id,
            granted_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      toast.success(canView ? 'Accès aux données accordé' : 'Accès aux données révoqué');
      fetchSettings();
    } catch (error) {
      console.error('Error granting visibility:', error);
      toast.error('Erreur lors de la modification');
    }
  }, [user?.id, user?.role, fetchSettings]);

  const getUserVisibility = useCallback((userId: string): boolean => {
    if (globalVisibility) return true;
    const setting = allSettings.find(s => s.userId === userId);
    return setting?.canViewAllData || false;
  }, [globalVisibility, allSettings]);

  return {
    canViewAllData,
    globalVisibility,
    allSettings,
    loading,
    toggleGlobalVisibility,
    grantUserVisibility,
    getUserVisibility,
    refetch: fetchSettings,
  };
}
