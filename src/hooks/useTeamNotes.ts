import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TeamNote {
  id: string;
  authorId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  authorName?: string;
  authorEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
}

export function useTeamNotes() {
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotes = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for names
      const { data: profiles } = await supabase.from('profiles').select('id, email, full_name');
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const mapped: TeamNote[] = (data || []).map((n: any) => ({
        id: n.id,
        authorId: n.author_id,
        recipientId: n.recipient_id,
        content: n.content,
        isRead: n.is_read,
        createdAt: n.created_at,
        authorName: profileMap.get(n.author_id)?.full_name || undefined,
        authorEmail: profileMap.get(n.author_id)?.email || undefined,
        recipientName: profileMap.get(n.recipient_id)?.full_name || undefined,
        recipientEmail: profileMap.get(n.recipient_id)?.email || undefined,
      }));

      setNotes(mapped);
      setUnreadCount(mapped.filter(n => n.recipientId === user.id && !n.isRead).length);
    } catch (error) {
      console.error('Error fetching team notes:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = useCallback(async (recipientId: string, content: string) => {
    if (!user?.id) {
      toast.error('Vous devez être connecté');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('team_notes')
        .insert({
          author_id: user.id,
          recipient_id: recipientId,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Note envoyée');
      fetchNotes();
      return data;
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Erreur lors de l\'envoi de la note');
      return null;
    }
  }, [user?.id, fetchNotes]);

  const markAsRead = useCallback(async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('team_notes')
        .update({ is_read: true })
        .eq('id', noteId);

      if (error) throw error;

      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking note as read:', error);
    }
  }, []);

  const deleteNote = useCallback(async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('team_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note supprimée');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, []);

  return { notes, unreadCount, loading, addNote, markAsRead, deleteNote, refetch: fetchNotes };
}
