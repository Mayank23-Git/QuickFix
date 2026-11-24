import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { apiRequest } from '../services/api.js';

const THEME_STORAGE_KEY = 'quickfix_theme';
const THEME_MANUAL_KEY = 'quickfix_theme_manual';
const VALID_THEMES = ['light', 'dark', 'system'];

const ThemeContext = createContext(null);

function getSystemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getInitialTheme() {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && VALID_THEMES.includes(saved)) return saved;
  } catch {
    // Ignore storage access errors
  }
  return 'system';
}

function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return 'light';
  const prefersDark = getSystemPrefersDark();
  const resolved = theme === 'dark' || (theme === 'system' && prefersDark) ? 'dark' : 'light';
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }) {
  const { user, isAuthenticated, setUser } = useAuth();
  const [theme, setThemeState] = useState(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() => applyThemeToDocument(getInitialTheme()));

  // Apply theme immediately on mount and whenever preference changes
  useEffect(() => {
    setResolvedTheme(applyThemeToDocument(theme));
  }, [theme]);

  // Listen for OS light/dark changes when System Default is active
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = () => {
      if (theme === 'system') {
        setResolvedTheme(applyThemeToDocument('system'));
      }
    };

    if (media.addEventListener) {
      media.addEventListener('change', handleSystemChange);
      return () => media.removeEventListener('change', handleSystemChange);
    }
    media.addListener(handleSystemChange);
    return () => media.removeListener(handleSystemChange);
  }, [theme]);

  // Sync from user profile on login if no explicit local override was set on this browser
  useEffect(() => {
    if (!isAuthenticated || !user?.themePreference) return;
    if (!VALID_THEMES.includes(user.themePreference)) return;

    try {
      const hasManualChoice = window.localStorage.getItem(THEME_MANUAL_KEY) === '1';
      if (!hasManualChoice && user.themePreference !== theme) {
        window.localStorage.setItem(THEME_STORAGE_KEY, user.themePreference);
        setThemeState(user.themePreference);
      }
    } catch {
      // Ignore storage access errors
    }
  }, [isAuthenticated, user?.themePreference, theme]);

  const setTheme = useCallback(
    (nextTheme) => {
      if (!VALID_THEMES.includes(nextTheme)) return;
      setThemeState(nextTheme);
      setResolvedTheme(applyThemeToDocument(nextTheme));

      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        window.localStorage.setItem(THEME_MANUAL_KEY, '1');
      } catch {
        // Ignore storage errors
      }

      if (isAuthenticated) {
        setUser((prev) => (prev ? { ...prev, themePreference: nextTheme } : prev));
        apiRequest('/api/users/me/theme', {
          method: 'PATCH',
          body: { themePreference: nextTheme },
        }).catch(() => {});
      }
    },
    [isAuthenticated, setUser]
  );

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        isDark: resolvedTheme === 'dark',
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}
