import { useMemo, useState, useCallback } from 'react';

// Common SNCF train prefixes and patterns
const TRAIN_PREFIXES = ['TGV', 'OUIGO', 'TER', 'IC', 'INTERCITES', 'RER', 'TRANSILIEN'];

// Simulated train schedule data based on time of day
const TRAIN_SCHEDULE: Record<string, { start: number; end: number; numbers: string[] }[]> = {
  TGV: [
    { start: 6, end: 9, numbers: ['8401', '8403', '8501', '8503', '8541', '8543', '8601', '8603'] },
    { start: 9, end: 12, numbers: ['8405', '8407', '8505', '8507', '8545', '8547', '8605', '8607'] },
    { start: 12, end: 15, numbers: ['8411', '8413', '8511', '8513', '8551', '8553', '8611', '8613'] },
    { start: 15, end: 18, numbers: ['8421', '8423', '8521', '8523', '8561', '8563', '8621', '8623'] },
    { start: 18, end: 22, numbers: ['8431', '8433', '8531', '8533', '8571', '8573', '8631', '8633'] },
  ],
  OUIGO: [
    { start: 6, end: 10, numbers: ['7601', '7603', '7801', '7803'] },
    { start: 10, end: 14, numbers: ['7605', '7607', '7805', '7807'] },
    { start: 14, end: 18, numbers: ['7611', '7613', '7811', '7813'] },
    { start: 18, end: 22, numbers: ['7621', '7623', '7821', '7823'] },
  ],
  TER: [
    { start: 5, end: 9, numbers: ['17501', '17503', '86701', '86703', '17505', '17507'] },
    { start: 9, end: 14, numbers: ['17511', '17513', '86711', '86713', '17515', '17517'] },
    { start: 14, end: 19, numbers: ['17521', '17523', '86721', '86723', '17525', '17527'] },
    { start: 19, end: 23, numbers: ['17531', '17533', '86731', '86733', '17535', '17537'] },
  ],
  IC: [
    { start: 6, end: 12, numbers: ['3601', '3603', '3801', '3803'] },
    { start: 12, end: 18, numbers: ['3611', '3613', '3811', '3813'] },
    { start: 18, end: 22, numbers: ['3621', '3623', '3821', '3823'] },
  ],
};

export interface TrainSuggestion {
  value: string;
  label: string;
  type: string;
}

export function useTrainPrediction() {
  const [recentTrains, setRecentTrains] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recent_trains');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const currentHour = useMemo(() => new Date().getHours(), []);

  const getScheduledTrains = useCallback((prefix: string): string[] => {
    const schedule = TRAIN_SCHEDULE[prefix];
    if (!schedule) return [];

    const currentSlot = schedule.find(
      slot => currentHour >= slot.start && currentHour < slot.end
    );
    
    return currentSlot ? currentSlot.numbers.map(n => `${prefix} ${n}`) : [];
  }, [currentHour]);

  const getSuggestions = useCallback((input: string): TrainSuggestion[] => {
    const query = input.trim().toUpperCase();
    const suggestions: TrainSuggestion[] = [];

    // If empty, only show recent trains (no pre-filled suggestions)
    if (!query) {
      // Add recent trains only
      recentTrains.slice(0, 5).forEach(train => {
        suggestions.push({
          value: train,
          label: `${train} (récent)`,
          type: 'recent'
        });
      });

      return suggestions;
    }

    // Check if query starts with a known prefix
    const matchingPrefix = TRAIN_PREFIXES.find(p => p.startsWith(query) || query.startsWith(p));

    if (matchingPrefix) {
      // If just the prefix, show scheduled trains for that type
      if (query === matchingPrefix || query.length <= matchingPrefix.length + 1) {
        getScheduledTrains(matchingPrefix).forEach(train => {
          suggestions.push({
            value: train,
            label: train,
            type: 'scheduled'
          });
        });
      }
    }

    // Add matching recent trains
    recentTrains
      .filter(train => train.toUpperCase().includes(query))
      .forEach(train => {
        if (!suggestions.find(s => s.value === train)) {
          suggestions.push({
            value: train,
            label: `${train} (récent)`,
            type: 'recent'
          });
        }
      });

    // If input looks like a number, suggest with common prefixes
    if (/^\d+$/.test(query) && query.length >= 3) {
      ['TGV', 'TER', 'IC', 'OUIGO'].forEach(prefix => {
        const train = `${prefix} ${query}`;
        if (!suggestions.find(s => s.value === train)) {
          suggestions.push({
            value: train,
            label: train,
            type: 'suggestion'
          });
        }
      });
    }

    return suggestions.slice(0, 8);
  }, [recentTrains, getScheduledTrains, currentHour]);

  const addRecentTrain = useCallback((train: string) => {
    if (!train.trim()) return;
    
    setRecentTrains(prev => {
      const filtered = prev.filter(t => t !== train);
      const updated = [train, ...filtered].slice(0, 10);
      localStorage.setItem('recent_trains', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    getSuggestions,
    addRecentTrain,
    recentTrains,
  };
}
