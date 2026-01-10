'use client';

/**
 * ThemeProvider - Client Component
 * Charge le thème depuis l'API, fallback sur défaut si erreur
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  foregroundColor: string;
  borderRadius: string;
}

const defaultTheme: ThemeSettings = {
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  backgroundColor: '#ffffff',
  foregroundColor: '#0f0f10',
  borderRadius: '8',
};

const ThemeContext = createContext<ThemeSettings>(defaultTheme);

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Charger le thème depuis l'API
    fetch('/api/theme/settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setTheme({
            primaryColor: data.primary_color || defaultTheme.primaryColor,
            secondaryColor: data.secondary_color || defaultTheme.secondaryColor,
            backgroundColor: data.background_color || defaultTheme.backgroundColor,
            foregroundColor: data.foreground_color || defaultTheme.foregroundColor,
            borderRadius: data.border_radius || defaultTheme.borderRadius,
          });
        }
      })
      .catch(() => {
        // Erreur API → utiliser thème par défaut
      });
  }, []);

  // Appliquer les CSS variables
  useEffect(() => {
    if (mounted) {
      document.documentElement.style.setProperty('--theme-primary', theme.primaryColor);
      document.documentElement.style.setProperty('--theme-secondary', theme.secondaryColor);
      document.documentElement.style.setProperty('--theme-background', theme.backgroundColor);
      document.documentElement.style.setProperty('--theme-foreground', theme.foregroundColor);
      document.documentElement.style.setProperty('--theme-radius', `${theme.borderRadius}px`);
      
      // Appliquer au body
      document.body.style.backgroundColor = theme.backgroundColor;
      document.body.style.color = theme.foregroundColor;
    }
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
