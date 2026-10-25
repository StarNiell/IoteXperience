import { createContext, useContext } from 'react';

// "auto" follows the device setting (prefers-color-scheme)
export type ThemeMode = 'auto' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'iotx-theme';

export interface ThemeContextValue {
  mode: ThemeMode;          // what the user chose
  theme: Theme;             // what is shown
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'auto',
  theme: 'dark',
  setMode: () => { },
});

export function useTheme() {
  return useContext(ThemeContext);
}
