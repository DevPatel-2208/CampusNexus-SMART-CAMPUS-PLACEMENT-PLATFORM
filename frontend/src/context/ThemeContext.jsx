import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      // Clear legacy cc-theme so users with auto-saved dark mode get the new light default
      if (localStorage.getItem('cc-theme')) {
        localStorage.removeItem('cc-theme');
      }
      const t = localStorage.getItem('campusnexus-theme');
      if (t === 'dark' || t === 'light') return t;
      return 'light'; // Always default to light mode
    } catch { return 'light'; }
  });
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.classList.add('dark');
    } else {
      delete document.documentElement.dataset.theme;
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('campusnexus-theme', theme); } catch { /* ignore */ }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
