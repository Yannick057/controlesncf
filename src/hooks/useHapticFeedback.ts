import { useCallback, useEffect, useState } from 'react';

export function useHapticFeedback() {
  const [isEnabled, setIsEnabled] = useState(() => {
    const saved = localStorage.getItem('haptic_feedback_enabled');
    return saved !== 'false'; // Enabled by default
  });

  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if Vibration API is supported
    setIsSupported('vibrate' in navigator);
  }, []);

  useEffect(() => {
    localStorage.setItem('haptic_feedback_enabled', String(isEnabled));
  }, [isEnabled]);

  const vibrate = useCallback((pattern: number | number[] = 50) => {
    if (!isEnabled || !isSupported) return false;
    
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }, [isEnabled, isSupported]);

  // Preset patterns
  const vibrateSuccess = useCallback(() => {
    return vibrate([50, 30, 50]); // Double tap for success
  }, [vibrate]);

  const vibrateError = useCallback(() => {
    return vibrate([100, 50, 100, 50, 100]); // Triple long for error
  }, [vibrate]);

  const vibrateLight = useCallback(() => {
    return vibrate(30); // Light tap
  }, [vibrate]);

  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  return {
    isEnabled,
    isSupported,
    setEnabled: setIsEnabled,
    toggleEnabled,
    vibrate,
    vibrateSuccess,
    vibrateError,
    vibrateLight,
  };
}
