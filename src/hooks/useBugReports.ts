import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BugReport {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

export function useBugReports() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchReports = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for names (only if admin)
      let profileMap = new Map();
      if (user.role === 'admin') {
        const { data: profiles } = await supabase.from('profiles').select('id, email, full_name');
        profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      }

      const mapped: BugReport[] = (data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        description: r.description,
        status: r.status,
        priority: r.priority,
        createdAt: r.created_at,
        userName: profileMap.get(r.user_id)?.full_name || undefined,
        userEmail: profileMap.get(r.user_id)?.email || undefined,
      }));

      setReports(mapped);
    } catch (error) {
      console.error('Error fetching bug reports:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const addReport = useCallback(async (title: string, description: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    if (!user?.id) {
      toast.error('Vous devez être connecté');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .insert({
          user_id: user.id,
          title,
          description,
          priority,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Bug signalé avec succès');
      fetchReports();
      return data;
    } catch (error) {
      console.error('Error adding bug report:', error);
      toast.error('Erreur lors du signalement');
      return null;
    }
  }, [user?.id, fetchReports]);

  const updateStatus = useCallback(async (reportId: string, status: BugReport['status']) => {
    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ status })
        .eq('id', reportId);

      if (error) throw error;

      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Error updating bug status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  }, []);

  return { reports, loading, addReport, updateStatus, refetch: fetchReports };
}
