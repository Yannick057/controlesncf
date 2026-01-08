import { useState, useEffect, useCallback, useRef } from 'react';
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

// Safe number helper
function safeNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return defaultValue;
}

// Safe string helper
function safeString(value: unknown, defaultValue: string = ''): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return defaultValue;
  return String(value);
}

// Safe array helper
function safeArray<T>(value: unknown, defaultValue: T[] = []): T[] {
  if (Array.isArray(value)) return value;
  return defaultValue;
}

// Connection error detection
function isConnectionError(error: unknown): boolean {
  if (!error) return false;
  const message = (error as Error)?.message?.toLowerCase() ?? '';
  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('failed to fetch') ||
    message.includes('connection') ||
    (error as any)?.code === 'ECONNABORTED'
  );
}

export function useSupabaseOnboardControls() {
  const [controls, setControls] = useState<OnboardControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const fetchControls = useCallback(async (showToast: boolean = true) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('onboard_controls')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Safe mapping with null checks
      const mapped: OnboardControl[] = safeArray(data).map((c: any) => ({
        id: safeString(c?.id, crypto.randomUUID()),
        trainNumber: safeString(c?.train_number),
        origin: safeString(c?.origin),
        destination: safeString(c?.destination),
        date: safeString(c?.control_date),
        time: safeString(c?.control_time),
        passengers: safeNumber(c?.passengers),
        tarifsBord: safeArray(c?.tarifs_bord),
        tarifsControle: safeArray(c?.tarifs_controle),
        stt50Count: safeNumber(c?.stt50_count),
        pvList: safeArray(c?.pv_list),
        stt100Count: safeNumber(c?.stt100_count),
        riPositif: safeNumber(c?.ri_positif),
        riNegatif: safeNumber(c?.ri_negatif),
        commentaire: safeString(c?.commentaire),
        fraudCount: safeNumber(c?.fraud_count),
        fraudRate: safeNumber(c?.fraud_rate),
        timestamp: safeString(c?.created_at),
        userId: safeString(c?.user_id),
      }));

      setControls(mapped);
      
      // Dismiss any existing error toast
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    } catch (err) {
      console.error('Error fetching onboard controls:', err);
      const errorMessage = isConnectionError(err)
        ? 'Erreur de connexion. Nouvelle tentative automatique...'
        : 'Erreur lors du chargement des contrôles';
      
      setError(errorMessage);
      
      if (showToast) {
        toastIdRef.current = toast.error('Erreur de chargement', {
          description: errorMessage,
          duration: isConnectionError(err) ? Infinity : 5000,
          action: {
            label: 'Réessayer',
            onClick: () => fetchControls(true),
          },
        });
      }
      
      // Auto-retry on connection error
      if (isConnectionError(err)) {
        retryTimeoutRef.current = setTimeout(() => {
          if (navigator.onLine) {
            fetchControls(false);
          }
        }, 5000);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchControls();
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchControls]);

  const addControl = useCallback(async (control: Omit<OnboardControl, 'id' | 'fraudRate' | 'timestamp' | 'userId'>) => {
    if (!user?.id) {
      toast.error('Vous devez être connecté');
      return null;
    }

    // Validate input
    if (!control) {
      toast.error('Données de contrôle invalides');
      return null;
    }

    const passengers = safeNumber(control.passengers);
    const fraudCount = safeNumber(control.fraudCount);
    const fraudRate = passengers > 0 ? (fraudCount / passengers) * 100 : 0;

    try {
      const { data, error: insertError } = await supabase
        .from('onboard_controls')
        .insert({
          user_id: user.id,
          train_number: safeString(control.trainNumber),
          origin: safeString(control.origin),
          destination: safeString(control.destination),
          control_date: safeString(control.date),
          control_time: safeString(control.time),
          passengers: passengers,
          tarifs_bord: safeArray(control.tarifsBord) as unknown as any,
          tarifs_controle: safeArray(control.tarifsControle) as unknown as any,
          stt50_count: safeNumber(control.stt50Count),
          pv_list: safeArray(control.pvList) as unknown as any,
          stt100_count: safeNumber(control.stt100Count),
          ri_positif: safeNumber(control.riPositif),
          ri_negatif: safeNumber(control.riNegatif),
          commentaire: safeString(control.commentaire),
          fraud_count: fraudCount,
          fraud_rate: fraudRate,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (!data) {
        throw new Error('Aucune donnée retournée');
      }

      const newControl: OnboardControl = {
        id: safeString(data.id),
        trainNumber: safeString(data.train_number),
        origin: safeString(data.origin),
        destination: safeString(data.destination),
        date: safeString(data.control_date),
        time: safeString(data.control_time),
        passengers: safeNumber(data.passengers),
        tarifsBord: safeArray(data.tarifs_bord as unknown as TarifBordItem[]),
        tarifsControle: safeArray(data.tarifs_controle as unknown as TarifItem[]),
        stt50Count: safeNumber(data.stt50_count),
        pvList: safeArray(data.pv_list as unknown as TarifItem[]),
        stt100Count: safeNumber(data.stt100_count),
        riPositif: safeNumber(data.ri_positif),
        riNegatif: safeNumber(data.ri_negatif),
        commentaire: safeString(data.commentaire),
        fraudCount: safeNumber(data.fraud_count),
        fraudRate: safeNumber(data.fraud_rate),
        timestamp: safeString(data.created_at),
        userId: safeString(data.user_id),
      };

      setControls((prev) => [newControl, ...prev]);
      return newControl;
    } catch (err) {
      console.error('Error adding control:', err);
      
      if (isConnectionError(err)) {
        toast.error('Erreur de connexion', {
          description: 'Impossible d\'enregistrer le contrôle. Réessayez.',
          action: {
            label: 'Réessayer',
            onClick: () => addControl(control),
          },
        });
      } else {
        toast.error('Erreur lors de l\'ajout du contrôle');
      }
      return null;
    }
  }, [user?.id]);

  const deleteControl = useCallback(async (id: string) => {
    if (!id) {
      toast.error('ID de contrôle invalide');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('onboard_controls')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setControls((prev) => prev.filter((c) => c.id !== id));
      toast.success('Contrôle supprimé');
    } catch (err) {
      console.error('Error deleting control:', err);
      
      if (isConnectionError(err)) {
        toast.error('Erreur de connexion', {
          description: 'Impossible de supprimer. Réessayez.',
          action: {
            label: 'Réessayer',
            onClick: () => deleteControl(id),
          },
        });
      } else {
        toast.error('Erreur lors de la suppression');
      }
    }
  }, []);

  const clearControls = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { error: clearError } = await supabase
        .from('onboard_controls')
        .delete()
        .eq('user_id', user.id);

      if (clearError) throw clearError;

      setControls([]);
      toast.success('Tous les contrôles ont été supprimés');
    } catch (err) {
      console.error('Error clearing controls:', err);
      toast.error('Erreur lors de la suppression');
    }
  }, [user?.id]);

  return { 
    controls, 
    loading, 
    error,
    addControl, 
    deleteControl, 
    clearControls, 
    refetch: fetchControls, 
    setControls 
  };
}

export function useSupabaseStationControls() {
  const [controls, setControls] = useState<StationControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const fetchControls = useCallback(async (showToast: boolean = true) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('station_controls')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Safe mapping with null checks
      const mapped: StationControl[] = safeArray(data).map((c: any) => ({
        id: safeString(c?.id, crypto.randomUUID()),
        stationName: safeString(c?.station_name),
        platform: safeString(c?.platform),
        origin: safeString(c?.origin),
        destination: safeString(c?.destination),
        date: safeString(c?.control_date),
        time: safeString(c?.control_time),
        passengers: safeNumber(c?.passengers),
        tarifsBord: safeArray(c?.tarifs_bord),
        tarifsControle: safeArray(c?.tarifs_controle),
        stt50Count: safeNumber(c?.stt50_count),
        pvList: safeArray(c?.pv_list),
        stt100Count: safeNumber(c?.stt100_count),
        riPositif: safeNumber(c?.ri_positif),
        riNegatif: safeNumber(c?.ri_negatif),
        commentaire: safeString(c?.commentaire),
        fraudCount: safeNumber(c?.fraud_count),
        fraudRate: safeNumber(c?.fraud_rate),
        timestamp: safeString(c?.created_at),
        userId: safeString(c?.user_id),
      }));

      setControls(mapped);
      
      // Dismiss any existing error toast
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    } catch (err) {
      console.error('Error fetching station controls:', err);
      const errorMessage = isConnectionError(err)
        ? 'Erreur de connexion. Nouvelle tentative automatique...'
        : 'Erreur lors du chargement des contrôles';
      
      setError(errorMessage);
      
      if (showToast) {
        toastIdRef.current = toast.error('Erreur de chargement', {
          description: errorMessage,
          duration: isConnectionError(err) ? Infinity : 5000,
          action: {
            label: 'Réessayer',
            onClick: () => fetchControls(true),
          },
        });
      }
      
      // Auto-retry on connection error
      if (isConnectionError(err)) {
        retryTimeoutRef.current = setTimeout(() => {
          if (navigator.onLine) {
            fetchControls(false);
          }
        }, 5000);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchControls();
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchControls]);

  const addControl = useCallback(async (control: Omit<StationControl, 'id' | 'fraudRate' | 'timestamp' | 'userId'>) => {
    if (!user?.id) {
      toast.error('Vous devez être connecté');
      return null;
    }

    // Validate input
    if (!control) {
      toast.error('Données de contrôle invalides');
      return null;
    }

    const passengers = safeNumber(control.passengers);
    const fraudCount = safeNumber(control.fraudCount);
    const fraudRate = passengers > 0 ? (fraudCount / passengers) * 100 : 0;

    try {
      const { data, error: insertError } = await supabase
        .from('station_controls')
        .insert({
          user_id: user.id,
          station_name: safeString(control.stationName),
          platform: safeString(control.platform),
          origin: safeString(control.origin),
          destination: safeString(control.destination),
          control_date: safeString(control.date),
          control_time: safeString(control.time),
          passengers: passengers,
          tarifs_bord: safeArray(control.tarifsBord) as unknown as any,
          tarifs_controle: safeArray(control.tarifsControle) as unknown as any,
          stt50_count: safeNumber(control.stt50Count),
          pv_list: safeArray(control.pvList) as unknown as any,
          stt100_count: safeNumber(control.stt100Count),
          ri_positif: safeNumber(control.riPositif),
          ri_negatif: safeNumber(control.riNegatif),
          commentaire: safeString(control.commentaire),
          fraud_count: fraudCount,
          fraud_rate: fraudRate,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (!data) {
        throw new Error('Aucune donnée retournée');
      }

      const newControl: StationControl = {
        id: safeString(data.id),
        stationName: safeString(data.station_name),
        platform: safeString(data.platform),
        origin: safeString(data.origin),
        destination: safeString(data.destination),
        date: safeString(data.control_date),
        time: safeString(data.control_time),
        passengers: safeNumber(data.passengers),
        tarifsBord: safeArray(data.tarifs_bord as unknown as TarifBordItem[]),
        tarifsControle: safeArray(data.tarifs_controle as unknown as TarifItem[]),
        stt50Count: safeNumber(data.stt50_count),
        pvList: safeArray(data.pv_list as unknown as TarifItem[]),
        stt100Count: safeNumber(data.stt100_count),
        riPositif: safeNumber(data.ri_positif),
        riNegatif: safeNumber(data.ri_negatif),
        commentaire: safeString(data.commentaire),
        fraudCount: safeNumber(data.fraud_count),
        fraudRate: safeNumber(data.fraud_rate),
        timestamp: safeString(data.created_at),
        userId: safeString(data.user_id),
      };

      setControls((prev) => [newControl, ...prev]);
      return newControl;
    } catch (err) {
      console.error('Error adding control:', err);
      
      if (isConnectionError(err)) {
        toast.error('Erreur de connexion', {
          description: 'Impossible d\'enregistrer le contrôle. Réessayez.',
          action: {
            label: 'Réessayer',
            onClick: () => addControl(control),
          },
        });
      } else {
        toast.error('Erreur lors de l\'ajout du contrôle');
      }
      return null;
    }
  }, [user?.id]);

  const deleteControl = useCallback(async (id: string) => {
    if (!id) {
      toast.error('ID de contrôle invalide');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('station_controls')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setControls((prev) => prev.filter((c) => c.id !== id));
      toast.success('Contrôle supprimé');
    } catch (err) {
      console.error('Error deleting control:', err);
      
      if (isConnectionError(err)) {
        toast.error('Erreur de connexion', {
          description: 'Impossible de supprimer. Réessayez.',
          action: {
            label: 'Réessayer',
            onClick: () => deleteControl(id),
          },
        });
      } else {
        toast.error('Erreur lors de la suppression');
      }
    }
  }, []);

  const clearControls = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { error: clearError } = await supabase
        .from('station_controls')
        .delete()
        .eq('user_id', user.id);

      if (clearError) throw clearError;

      setControls([]);
      toast.success('Tous les contrôles ont été supprimés');
    } catch (err) {
      console.error('Error clearing controls:', err);
      toast.error('Erreur lors de la suppression');
    }
  }, [user?.id]);

  return { 
    controls, 
    loading, 
    error,
    addControl, 
    deleteControl, 
    clearControls, 
    refetch: fetchControls, 
    setControls 
  };
}

export function useControlStats(onboardControls: OnboardControl[], stationControls: StationControl[]) {
  // Safe arrays with proper typing
  const safeOnboard: OnboardControl[] = Array.isArray(onboardControls) ? onboardControls : [];
  const safeStation: StationControl[] = Array.isArray(stationControls) ? stationControls : [];
  
  const totalOnboard = safeOnboard.length;
  const totalStation = safeStation.length;
  const total = totalOnboard + totalStation;

  const totalPassengers = 
    safeOnboard.reduce((sum, c) => sum + safeNumber(c?.passengers), 0) +
    safeStation.reduce((sum, c) => sum + safeNumber(c?.passengers), 0);

  const totalFrauds = 
    safeOnboard.reduce((sum, c) => sum + safeNumber(c?.fraudCount), 0) +
    safeStation.reduce((sum, c) => sum + safeNumber(c?.fraudCount), 0);

  const fraudRate = totalPassengers > 0 ? (totalFrauds / totalPassengers) * 100 : 0;

  const totalTarifsControle = 
    safeOnboard.reduce((sum, c) => {
      const tarifsSum = (c?.tarifsControle ?? []).reduce((s, t) => s + safeNumber(t?.montant), 0);
      return sum + tarifsSum + (safeNumber(c?.stt50Count) * 50);
    }, 0) +
    safeStation.reduce((sum, c) => {
      const tarifsSum = (c?.tarifsControle ?? []).reduce((s, t) => s + safeNumber(t?.montant), 0);
      return sum + tarifsSum + (safeNumber(c?.stt50Count) * 50);
    }, 0);

  const totalPV = 
    safeOnboard.reduce((sum, c) => {
      const pvSum = (c?.pvList ?? []).reduce((s, t) => s + safeNumber(t?.montant), 0);
      return sum + pvSum + (safeNumber(c?.stt100Count) * 100);
    }, 0) +
    safeStation.reduce((sum, c) => {
      const pvSum = (c?.pvList ?? []).reduce((s, t) => s + safeNumber(t?.montant), 0);
      return sum + pvSum + (safeNumber(c?.stt100Count) * 100);
    }, 0);

  const totalTarifsBord = 
    safeOnboard.reduce((sum, c) => {
      const bordSum = (c?.tarifsBord ?? []).reduce((s, t) => s + safeNumber(t?.montant), 0);
      return sum + bordSum;
    }, 0) +
    safeStation.reduce((sum, c) => {
      const bordSum = (c?.tarifsBord ?? []).reduce((s, t) => s + safeNumber(t?.montant), 0);
      return sum + bordSum;
    }, 0);

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
