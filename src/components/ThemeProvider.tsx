import React from 'react';
import { ThemeContext, useThemeContext } from '@/hooks/useTheme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeContextValue = useThemeContext();

  React.useEffect(() => {
    // Ensure theme is properly initialized
    if (themeContextValue.theme) {
      const root = document.documentElement;
      if (themeContextValue.actualTheme === 'dark') {
        root.classList.remove('light');
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    }
  }, [themeContextValue.actualTheme, themeContextValue.theme]);

  return (
    <ThemeContext.Provider value={themeContextValue}>
      {children}
    </ThemeContext.Provider>
  );
}