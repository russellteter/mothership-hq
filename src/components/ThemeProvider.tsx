import React from 'react';
import { ThemeContext, useThemeContext } from '@/hooks/useTheme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeContextValue = useThemeContext();

  return (
    <ThemeContext.Provider value={themeContextValue}>
      {children}
    </ThemeContext.Provider>
  );
}