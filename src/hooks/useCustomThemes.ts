import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CustomTheme {
  id: string;
  userId: string;
  name: string;
  isPublic: boolean;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    accent: string;
    muted: string;
    card: string;
    border: string;
  };
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_COLORS = {
  background: '0 0% 100%',
  foreground: '222.2 84% 4.9%',
  primary: '222.2 47.4% 11.2%',
  primaryForeground: '210 40% 98%',
  secondary: '210 40% 96.1%',
  accent: '210 40% 96.1%',
  muted: '210 40% 96.1%',
  card: '0 0% 100%',
  border: '214.3 31.8% 91.4%',
};

export function useCustomThemes() {
  const { user } = useAuth();
  const [themes, setThemes] = useState<CustomTheme[]>([]);
  const [publicThemes, setPublicThemes] = useState<CustomTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCustomTheme, setActiveCustomTheme] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('active_custom_theme');
    if (saved) setActiveCustomTheme(saved);
  }, []);

  const fetchThemes = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Fetch user's own themes
      const { data: ownThemes, error: ownError } = await supabase
        .from('custom_themes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ownError) throw ownError;

      // Fetch public themes from others
      const { data: pubThemes, error: pubError } = await supabase
        .from('custom_themes')
        .select('*')
        .eq('is_public', true)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (pubError) throw pubError;

      const mapTheme = (t: any): CustomTheme => ({
        id: t.id,
        userId: t.user_id,
        name: t.name,
        isPublic: t.is_public,
        colors: { ...DEFAULT_COLORS, ...t.colors },
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      });

      setThemes((ownThemes || []).map(mapTheme));
      setPublicThemes((pubThemes || []).map(mapTheme));
    } catch (error) {
      console.error('Error fetching themes:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const createTheme = useCallback(async (name: string, colors: typeof DEFAULT_COLORS, isPublic = false) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('custom_themes')
        .insert({
          user_id: user.id,
          name,
          colors,
          is_public: isPublic,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Thème créé avec succès');
      fetchThemes();
      return data;
    } catch (error) {
      console.error('Error creating theme:', error);
      toast.error('Erreur lors de la création du thème');
      return null;
    }
  }, [user?.id, fetchThemes]);

  const updateTheme = useCallback(async (themeId: string, updates: Partial<Pick<CustomTheme, 'name' | 'colors' | 'isPublic'>>) => {
    try {
      const { error } = await supabase
        .from('custom_themes')
        .update({
          ...(updates.name && { name: updates.name }),
          ...(updates.colors && { colors: updates.colors }),
          ...(updates.isPublic !== undefined && { is_public: updates.isPublic }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', themeId);

      if (error) throw error;

      toast.success('Thème mis à jour');
      fetchThemes();
    } catch (error) {
      console.error('Error updating theme:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  }, [fetchThemes]);

  const deleteTheme = useCallback(async (themeId: string) => {
    try {
      const { error } = await supabase
        .from('custom_themes')
        .delete()
        .eq('id', themeId);

      if (error) throw error;

      if (activeCustomTheme === themeId) {
        setActiveCustomTheme(null);
        localStorage.removeItem('active_custom_theme');
      }

      toast.success('Thème supprimé');
      fetchThemes();
    } catch (error) {
      console.error('Error deleting theme:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, [fetchThemes, activeCustomTheme]);

  const applyTheme = useCallback((theme: CustomTheme | null) => {
    const root = document.documentElement;
    
    if (!theme) {
      // Reset to default theme
      setActiveCustomTheme(null);
      localStorage.removeItem('active_custom_theme');
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--muted');
      root.style.removeProperty('--card');
      root.style.removeProperty('--border');
      return;
    }

    // Apply custom theme colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });

    setActiveCustomTheme(theme.id);
    localStorage.setItem('active_custom_theme', theme.id);
    toast.success(`Thème "${theme.name}" appliqué`);
  }, []);

  const duplicateTheme = useCallback(async (theme: CustomTheme) => {
    return createTheme(`${theme.name} (copie)`, theme.colors, false);
  }, [createTheme]);

  // Duplicate theme if user modifies a shared/community theme
  const duplicateAndEdit = useCallback(async (theme: CustomTheme, updates: Partial<Pick<CustomTheme, 'name' | 'colors' | 'isPublic'>>) => {
    if (!user?.id) return null;

    // If it's the user's own theme, just update it
    if (theme.userId === user.id) {
      await updateTheme(theme.id, updates);
      return { updated: true, themeId: theme.id };
    }

    // Otherwise, create a copy with the new modifications
    const newColors = updates.colors ? { ...theme.colors, ...updates.colors } : theme.colors;
    const newName = updates.name || `${theme.name} (ma version)`;
    
    const newTheme = await createTheme(newName, newColors, false);
    if (newTheme) {
      toast.success('Une copie personnelle du thème a été créée');
      return { created: true, themeId: newTheme.id };
    }
    return null;
  }, [user?.id, createTheme, updateTheme]);

  return {
    themes,
    publicThemes,
    loading,
    activeCustomTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    applyTheme,
    duplicateTheme,
    duplicateAndEdit,
    refetch: fetchThemes,
    DEFAULT_COLORS,
  };
}
