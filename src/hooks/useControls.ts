import { useState, useEffect, useCallback } from 'react';

export interface TarifItem {
  id: number;
  type: 'STT' | 'RNV' | 'Titre tiers' | 'D. naissance' | 'Autre';
  montant: number;
}

export interface OnboardControl {
  id: number;
  trainNumber: string;
  route: string;
  date: string;
  time: string;
  passengers: number;
  // Tarif à bord
  tarifBord: number;
  // Tarif contrôle
  tarifsControle: TarifItem[];
  stt50Count: number;
  // PV
  pvList: TarifItem[];
  stt100Count: number;
  // RI
  riPositif: number;
  riNegatif: number;
  commentaire: string;
  // Calculated
  fraudCount: number;
  fraudRate: number;
  timestamp: string;
}

export interface StationControl {
  id: number;
  stationName: string;
  platform: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  passengers: number;
  // Tarif contrôle
  tarifsControle: TarifItem[];
  stt50Count: number;
  // PV
  pvList: TarifItem[];
  stt100Count: number;
  // RI
  riPositif: number;
  riNegatif: number;
  commentaire: string;
  // Calculated
  fraudCount: number;
  fraudRate: number;
  timestamp: string;
}

export function useOnboardControls() {
  const [controls, setControls] = useState<OnboardControl[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('sncf-controls-onboard');
    if (saved) {
      setControls(JSON.parse(saved));
    }
  }, []);

  const addControl = useCallback((control: Omit<OnboardControl, 'id' | 'fraudRate' | 'timestamp'>) => {
    const fraudCount = control.fraudCount;
    const newControl: OnboardControl = {
      ...control,
      id: Date.now(),
      fraudRate: control.passengers > 0 ? (fraudCount / control.passengers) * 100 : 0,
      timestamp: new Date().toISOString(),
    };

    setControls((prev) => {
      const updated = [newControl, ...prev];
      localStorage.setItem('sncf-controls-onboard', JSON.stringify(updated));
      return updated;
    });

    return newControl;
  }, []);

  const clearControls = useCallback(() => {
    setControls([]);
    localStorage.removeItem('sncf-controls-onboard');
  }, []);

  return { controls, addControl, clearControls, setControls };
}

export function useStationControls() {
  const [controls, setControls] = useState<StationControl[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('sncf-controls-station');
    if (saved) {
      setControls(JSON.parse(saved));
    }
  }, []);

  const addControl = useCallback((control: Omit<StationControl, 'id' | 'fraudRate' | 'timestamp'>) => {
    const fraudCount = control.fraudCount;
    const newControl: StationControl = {
      ...control,
      id: Date.now(),
      fraudRate: control.passengers > 0 ? (fraudCount / control.passengers) * 100 : 0,
      timestamp: new Date().toISOString(),
    };

    setControls((prev) => {
      const updated = [newControl, ...prev];
      localStorage.setItem('sncf-controls-station', JSON.stringify(updated));
      return updated;
    });

    return newControl;
  }, []);

  const clearControls = useCallback(() => {
    setControls([]);
    localStorage.removeItem('sncf-controls-station');
  }, []);

  return { controls, addControl, clearControls, setControls };
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

  return {
    totalOnboard,
    totalStation,
    total,
    totalPassengers,
    totalFrauds,
    fraudRate,
    totalTarifsControle,
    totalPV,
  };
}
