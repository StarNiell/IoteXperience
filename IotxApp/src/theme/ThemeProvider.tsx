import React, { useCallback, useEffect, useState } from 'react';
import { ThemeContext, ThemeMode, Theme, THEME_STORAGE_KEY } from './themeContext';

function readMode(): ThemeMode {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'auto') return value;
  } catch { /* storage not available */ }
  return 'auto';
}

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

// Light/dark theme: follows the device unless the user picks one (saved in this browser).
// Sets data-theme (our CSS tokens) and data-bs-theme (Bootstrap components) on <html>.
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [systemDark, setSystemDark] = useState<boolean>(() => darkQuery().matches);

  useEffect(() => {
    const query = darkQuery();
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const theme: Theme = mode === 'auto' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  const setMode = useCallback((value: ThemeMode) => {
    setModeState(value);
    try { localStorage.setItem(THEME_STORAGE_KEY, value); } catch { /* storage not available */ }
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, theme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
