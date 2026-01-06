import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type TarifBordType = 'bord' | 'exceptionnel';

export interface TarifItem {
  id: number;
  type: 'STT' | 'RNV' | 'Titre tiers' | 'D. naissance' | 'Autre';
  montant: number;
}

export interface TarifBordItem {
  id: number;
  montant: number;
  description?: string;
  tarifType: TarifBordType;
}

export interface OnboardControl {
  id: string;
  trainNumber: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  passengers: number;
  tarifsBord: TarifBordItem[];
  tarifsControle: TarifItem[];
  stt50Count: number;
  pvList: TarifItem[];
  stt100Count: number;
  riPositif: number;
  riNegatif: number;
  commentaire: string;
  fraudCount: number;
  fraudRate: number;
  timestamp: string;
  userId?: string;
}

export interface StationControl {
  id: string;
  stationName: string;
  platform: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  passengers: number;
  tarifsBord: TarifBordItem[];
  tarifsControle: TarifItem[];
  stt50Count: number;
  pvList: TarifItem[];
  stt100Count: number;
  riPositif: number;
  riNegatif: number;
  commentaire: string;
  fraudCount: number;
  fraudRate: number;
  timestamp: string;
  userId?: string;
}

export function useSupabaseOnboardControls() {
  const [controls, setControls] = useState<OnboardControl[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchControls = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('onboard_controls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: OnboardControl[] = (data || []).map((c: any) => ({
        id: c.id,
        trainNumber: c.train_number,
        origin: c.origin,
        destination: c.destination,
        date: c.control_date,
        time: c.control_time,
        passengers: c.passengers,
        tarifsBord: c.tarifs_bord || [],
        tarifsControle: c.tarifs_controle || [],
        stt50Count: c.stt50_count,
        pvList: c.pv_list || [],
        stt100Count: c.stt100_count,
        riPositif: c.ri_positif,
        riNegatif: c.ri_negatif,
        commentaire: c.commentaire || '',
        fraudCount: c.fraud_count,
        fraudRate: c.fraud_rate,
        timestamp: c.created_at,
        userId: c.user_id,
      }));

      setControls(mapped);
    } catch (error) {
      console.error('Error fetching onboard controls:', error);
      toast.error('Erreur lors du chargement des contrôles');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchControls();
  }, [fetchControls]);

  const addControl = useCallback(async (control: Omit<OnboardControl, 'id' | 'fraudRate' | 'timestamp' | 'userId'>) => {
    if (!user?.id) {
      toast.error('Vous devez être connecté');
      return null;
    }

    const fraudRate = control.passengers > 0 ? (control.fraudCount / control.passengers) * 100 : 0;

    try {
      const { data, error } = await supabase
        .from('onboard_controls')
        .insert({
          user_id: user.id,
          train_number: control.trainNumber,
          origin: control.origin,
          destination: control.destination,
          control_date: control.date,
          control_time: control.time,
          passengers: control.passengers,
          tarifs_bord: control.tarifsBord as unknown as any,
          tarifs_controle: control.tarifsControle as unknown as any,
          stt50_count: control.stt50Count,
          pv_list: control.pvList as unknown as any,
          stt100_count: control.stt100Count,
          ri_positif: control.riPositif,
          ri_negatif: control.riNegatif,
          commentaire: control.commentaire,
          fraud_count: control.fraudCount,
          fraud_rate: fraudRate,
        })
        .select()
        .single();

      if (error) throw error;

      const newControl: OnboardControl = {
        id: data.id,
        trainNumber: data.train_number,
        origin: data.origin,
        destination: data.destination,
        date: data.control_date,
        time: data.control_time,
        passengers: data.passengers,
        tarifsBord: (data.tarifs_bord as unknown as TarifBordItem[]) || [],
        tarifsControle: (data.tarifs_controle as unknown as TarifItem[]) || [],
        stt50Count: data.stt50_count,
        pvList: (data.pv_list as unknown as TarifItem[]) || [],
        stt100Count: data.stt100_count,
        riPositif: data.ri_positif,
        riNegatif: data.ri_negatif,
        commentaire: data.commentaire || '',
        fraudCount: data.fraud_count,
        fraudRate: data.fraud_rate,
        timestamp: data.created_at,
        userId: data.user_id,
      };

      setControls((prev) => [newControl, ...prev]);
      return newControl;
    } catch (error) {
      console.error('Error adding control:', error);
      toast.error('Erreur lors de l\'ajout du contrôle');
      return null;
    }
  }, [user?.id]);

  const deleteControl = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('onboard_controls')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setControls((prev) => prev.filter((c) => c.id !== id));
      toast.success('Contrôle supprimé');
    } catch (error) {
      console.error('Error deleting control:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, []);

  const clearControls = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('onboard_controls')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setControls([]);
      toast.success('Tous les contrôles ont été supprimés');
    } catch (error) {
      console.error('Error clearing controls:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, [user?.id]);

  return { controls, loading, addControl, deleteControl, clearControls, refetch: fetchControls, setControls };
}

export function useSupabaseStationControls() {
  const [controls, setControls] = useState<StationControl[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchControls = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('station_controls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: StationControl[] = (data || []).map((c: any) => ({
        id: c.id,
        stationName: c.station_name,
        platform: c.platform,
        origin: c.origin,
        destination: c.destination,
        date: c.control_date,
        time: c.control_time,
        passengers: c.passengers,
        tarifsBord: c.tarifs_bord || [],
        tarifsControle: c.tarifs_controle || [],
        stt50Count: c.stt50_count,
        pvList: c.pv_list || [],
        stt100Count: c.stt100_count,
        riPositif: c.ri_positif,
        riNegatif: c.ri_negatif,
        commentaire: c.commentaire || '',
        fraudCount: c.fraud_count,
        fraudRate: c.fraud_rate,
        timestamp: c.created_at,
        userId: c.user_id,
      }));

      setControls(mapped);
    } catch (error) {
      console.error('Error fetching station controls:', error);
      toast.error('Erreur lors du chargement des contrôles');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchControls();
  }, [fetchControls]);

  const addControl = useCallback(async (control: Omit<StationControl, 'id' | 'fraudRate' | 'timestamp' | 'userId'>) => {
    if (!user?.id) {
      toast.error('Vous devez être connecté');
      return null;
    }

    const fraudRate = control.passengers > 0 ? (control.fraudCount / control.passengers) * 100 : 0;

    try {
      const { data, error } = await supabase
        .from('station_controls')
        .insert({
          user_id: user.id,
          station_name: control.stationName,
          platform: control.platform,
          origin: control.origin,
          destination: control.destination,
          control_date: control.date,
          control_time: control.time,
          passengers: control.passengers,
          tarifs_bord: control.tarifsBord as unknown as any,
          tarifs_controle: control.tarifsControle as unknown as any,
          stt50_count: control.stt50Count,
          pv_list: control.pvList as unknown as any,
          stt100_count: control.stt100Count,
          ri_positif: control.riPositif,
          ri_negatif: control.riNegatif,
          commentaire: control.commentaire,
          fraud_count: control.fraudCount,
          fraud_rate: fraudRate,
        })
        .select()
        .single();

      if (error) throw error;

      const newControl: StationControl = {
        id: data.id,
        stationName: data.station_name,
        platform: data.platform,
        origin: data.origin,
        destination: data.destination,
        date: data.control_date,
        time: data.control_time,
        passengers: data.passengers,
        tarifsBord: (data.tarifs_bord as unknown as TarifBordItem[]) || [],
        tarifsControle: (data.tarifs_controle as unknown as TarifItem[]) || [],
        stt50Count: data.stt50_count,
        pvList: (data.pv_list as unknown as TarifItem[]) || [],
        stt100Count: data.stt100_count,
        riPositif: data.ri_positif,
        riNegatif: data.ri_negatif,
        commentaire: data.commentaire || '',
        fraudCount: data.fraud_count,
        fraudRate: data.fraud_rate,
        timestamp: data.created_at,
        userId: data.user_id,
      };

      setControls((prev) => [newControl, ...prev]);
      return newControl;
    } catch (error) {
      console.error('Error adding control:', error);
      toast.error('Erreur lors de l\'ajout du contrôle');
      return null;
    }
  }, [user?.id]);

  const deleteControl = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('station_controls')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setControls((prev) => prev.filter((c) => c.id !== id));
      toast.success('Contrôle supprimé');
    } catch (error) {
      console.error('Error deleting control:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, []);

  const clearControls = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('station_controls')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setControls([]);
      toast.success('Tous les contrôles ont été supprimés');
    } catch (error) {
      console.error('Error clearing controls:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, [user?.id]);

  return { controls, loading, addControl, deleteControl, clearControls, refetch: fetchControls, setControls };
}

export function useControlStats(onboardControls: OnboardControl[], stationControls: StationControl[]) {
  const totalOnboard = onboardControls.length;
  const totalStation = stationControls.length;
  const total = totalOnboard + totalStation;

  const totalPassengers = 
    onboardControls.reduce((sum, c) => sum + c.passengers, 0) +
    stationControls.reduce((sum, c) => sum + c.passengers, 0);

  const totalFrauds = 
    onboardControls.reduce((sum, c) => sum + c.fraudCount, 0) +
    stationControls.reduce((sum, c) => sum + c.fraudCount, 0);

  const fraudRate = totalPassengers > 0 ? (totalFrauds / totalPassengers) * 100 : 0;

  const totalTarifsControle = 
    onboardControls.reduce((sum, c) => sum + c.tarifsControle.reduce((s, t) => s + t.montant, 0) + (c.stt50Count * 50), 0) +
    stationControls.reduce((sum, c) => sum + c.tarifsControle.reduce((s, t) => s + t.montant, 0) + (c.stt50Count * 50), 0);

  const totalPV = 
    onboardControls.reduce((sum, c) => sum + c.pvList.reduce((s, t) => s + t.montant, 0) + (c.stt100Count * 100), 0) +
    stationControls.reduce((sum, c) => sum + c.pvList.reduce((s, t) => s + t.montant, 0) + (c.stt100Count * 100), 0);

  const totalTarifsBord = 
    onboardControls.reduce((sum, c) => sum + c.tarifsBord.reduce((s, t) => s + t.montant, 0), 0) +
    stationControls.reduce((sum, c) => sum + c.tarifsBord.reduce((s, t) => s + t.montant, 0), 0);

  return {
    totalOnboard,
    totalStation,
    total,
    totalPassengers,
    totalFrauds,
    fraudRate,
    totalTarifsControle,
    totalPV,
    totalTarifsBord,
  };
}
