import { useState, useEffect, useCallback } from 'react';

export interface OnboardControl {
  id: number;
  trainNumber: string;
  route: string;
  date: string;
  time: string;
  passengers: number;
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
  fraudCount: number;
  fraudRate: number;
  timestamp: string;
}

export function useOnboardControls() {
  const [controls, setControls] = useState<OnboardControl[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('onboard_controls');
    if (saved) {
      setControls(JSON.parse(saved));
    }
  }, []);

  const addControl = useCallback((control: Omit<OnboardControl, 'id' | 'fraudRate' | 'timestamp'>) => {
    const newControl: OnboardControl = {
      ...control,
      id: Date.now(),
      fraudRate: control.passengers > 0 ? (control.fraudCount / control.passengers) * 100 : 0,
      timestamp: new Date().toISOString(),
    };

    setControls((prev) => {
      const updated = [newControl, ...prev];
      localStorage.setItem('onboard_controls', JSON.stringify(updated));
      return updated;
    });

    return newControl;
  }, []);

  const clearControls = useCallback(() => {
    setControls([]);
    localStorage.removeItem('onboard_controls');
  }, []);

  return { controls, addControl, clearControls, setControls };
}

export function useStationControls() {
  const [controls, setControls] = useState<StationControl[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('station_controls');
    if (saved) {
      setControls(JSON.parse(saved));
    }
  }, []);

  const addControl = useCallback((control: Omit<StationControl, 'id' | 'fraudRate' | 'timestamp'>) => {
    const newControl: StationControl = {
      ...control,
      id: Date.now(),
      fraudRate: control.passengers > 0 ? (control.fraudCount / control.passengers) * 100 : 0,
      timestamp: new Date().toISOString(),
    };

    setControls((prev) => {
      const updated = [newControl, ...prev];
      localStorage.setItem('station_controls', JSON.stringify(updated));
      return updated;
    });

    return newControl;
  }, []);

  const clearControls = useCallback(() => {
    setControls([]);
    localStorage.removeItem('station_controls');
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

  return {
    totalOnboard,
    totalStation,
    total,
    totalPassengers,
    totalFrauds,
    fraudRate,
  };
}
