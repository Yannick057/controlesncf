import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailSettings {
  sender_domain: string;
}

const DEFAULT_SETTINGS: EmailSettings = {
  sender_domain: 'onboarding@resend.dev',
};

export function useEmailSettings() {
  const [settings, setSettings] = useState<EmailSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('email_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const newSettings = { ...DEFAULT_SETTINGS };
      data?.forEach((row: { setting_key: string; setting_value: string }) => {
        if (row.setting_key in newSettings) {
          (newSettings as any)[row.setting_key] = row.setting_value;
        }
      });

      setSettings(newSettings);
    } catch (error) {
      console.error('Error fetching email settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(async (settingKey: keyof EmailSettings, value: string) => {
    try {
      // First check if the setting exists
      const { data: existing } = await supabase
        .from('email_settings')
        .select('id')
        .eq('setting_key', settingKey)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('email_settings')
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq('setting_key', settingKey);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_settings')
          .insert({ setting_key: settingKey, setting_value: value });

        if (error) throw error;
      }

      setSettings(prev => ({ ...prev, [settingKey]: value }));
      toast.success('Paramètre email mis à jour');
    } catch (error) {
      console.error('Error updating email setting:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  }, []);

  return { settings, loading, updateSetting, refetch: fetchSettings };
}
