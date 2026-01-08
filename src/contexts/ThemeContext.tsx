import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'dark' | 'light' | 'auto' | 'stranger' | 'neon' | 'cyberpunk' | 'gold' | 'aurora';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Clair', icon: '☀️' },
  { value: 'dark', label: 'Sombre', icon: '🌙' },
  { value: 'auto', label: 'Automatique', icon: '🔄' },
  { value: 'stranger', label: 'Stranger Things', icon: '🔴' },
  { value: 'neon', label: 'Néon', icon: '💜' },
  { value: 'cyberpunk', label: 'Cyberpunk', icon: '🌆' },
  { value: 'gold', label: 'Or & Noir', icon: '✨' },
  { value: 'aurora', label: 'Aurora', icon: '🌊' },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Initialize from localStorage during state creation
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme_preference') as Theme;
      return savedTheme || 'dark';
    }
    return 'dark';
  });
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('dark');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handler);
    setIsInitialized(true);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const effectiveTheme: Theme = theme === 'auto' ? systemTheme : theme;

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light', 'stranger', 'neon', 'cyberpunk', 'gold', 'aurora');
    document.documentElement.classList.add(effectiveTheme);
  }, [effectiveTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme_preference', newTheme);
  };

  // Prevent flash of unstyled content
  if (!isInitialized) {
    return <div className="dark" style={{ minHeight: '100vh', background: 'hsl(222, 25%, 8%)' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}