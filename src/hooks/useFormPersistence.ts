import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

interface UseFormPersistenceOptions<T> {
  key: string;
  defaultValues: T;
  debounceMs?: number;
  formName?: string;
}

export function useFormPersistence<T extends Record<string, any>>({
  key,
  defaultValues,
  debounceMs = 300,
  formName = 'Formulaire',
}: UseFormPersistenceOptions<T>) {
  const storageKey = `form_draft_${key}`;
  const hasShownToast = useRef(false);
  
  // Initialize state from localStorage or default values
  const [values, setValues] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle schema changes
        return { ...defaultValues, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to restore form data:', error);
    }
    return defaultValues;
  });

  const [wasRestored] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  });

  const [isDirty, setIsDirty] = useState(wasRestored);

  // Show toast when draft is restored
  useEffect(() => {
    if (wasRestored && !hasShownToast.current) {
      hasShownToast.current = true;
      toast({
        title: "Brouillon restauré",
        description: `Votre saisie précédente de "${formName}" a été restaurée.`,
        duration: 4000,
      });
    }
  }, [wasRestored, formName]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Save to localStorage with debounce
  const persistToStorage = useCallback((data: T) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
        setIsDirty(true);
      } catch (error) {
        console.warn('Failed to save form data:', error);
      }
    }, debounceMs);
  }, [storageKey, debounceMs]);

  // Update a single field
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => {
      const updated = { ...prev, [field]: value };
      persistToStorage(updated);
      return updated;
    });
  }, [persistToStorage]);

  // Update multiple fields at once
  const updateFields = useCallback((updates: Partial<T>) => {
    setValues(prev => {
      const updated = { ...prev, ...updates };
      persistToStorage(updated);
      return updated;
    });
  }, [persistToStorage]);

  // Clear saved data (call after successful submission)
  const clearPersistedData = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    try {
      localStorage.removeItem(storageKey);
      setValues(defaultValues);
      setIsDirty(false);
    } catch (error) {
      console.warn('Failed to clear form data:', error);
    }
  }, [storageKey, defaultValues]);

  // Reset form to defaults without clearing storage
  const resetToDefaults = useCallback(() => {
    setValues(defaultValues);
  }, [defaultValues]);

  // Force save immediately (useful before page unload)
  const forceSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
    } catch (error) {
      console.warn('Failed to force save form data:', error);
    }
  }, [storageKey, values]);

  // Save on visibility change (app going to background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        forceSave();
      }
    };

    const handleBeforeUnload = () => {
      forceSave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [forceSave]);

  return {
    values,
    updateField,
    updateFields,
    clearPersistedData,
    resetToDefaults,
    forceSave,
    isDirty,
  };
}
