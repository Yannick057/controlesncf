import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ReleaseNote {
  id: string;
  version: string;
  title: string;
  content: string;
  releaseDate: string;
  createdAt: string;
}

export function useReleaseNotes() {
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [latestVersion, setLatestVersion] = useState<ReleaseNote | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchReleaseNotes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('release_notes')
        .select('*')
        .order('release_date', { ascending: false });

      if (error) throw error;

      const mapped: ReleaseNote[] = (data || []).map((r: any) => ({
        id: r.id,
        version: r.version,
        title: r.title,
        content: r.content,
        releaseDate: r.release_date,
        createdAt: r.created_at,
      }));

      setReleaseNotes(mapped);
      setLatestVersion(mapped[0] || null);
    } catch (error) {
      console.error('Error fetching release notes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReleaseNotes();
  }, [fetchReleaseNotes]);

  const addReleaseNote = useCallback(async (version: string, title: string, content: string, releaseDate?: string) => {
    if (!user?.id || user.role !== 'admin') {
      toast.error('Seuls les administrateurs peuvent ajouter des notes de version');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('release_notes')
        .insert({
          version,
          title,
          content,
          release_date: releaseDate || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Note de version ajoutée');
      fetchReleaseNotes();
      return data;
    } catch (error) {
      console.error('Error adding release note:', error);
      toast.error('Erreur lors de l\'ajout');
      return null;
    }
  }, [user?.id, user?.role, fetchReleaseNotes]);

  return { releaseNotes, latestVersion, loading, addReleaseNote, refetch: fetchReleaseNotes };
}
