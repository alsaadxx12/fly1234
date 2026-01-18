import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

type Theme = 'light' | 'dark';

interface CustomSettings {
  logoUrl: string;
  headerGradient: string;
}

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  customSettings: CustomSettings;
  setCustomSettings: (settings: CustomSettings) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_SETTINGS: CustomSettings = {
  logoUrl: 'https://fly4all.com/_next/image?url=%2Flogo%2Ffly4all%2Fheader.webp&w=640&q=75',
  headerGradient: 'from-indigo-700 via-indigo-800 to-blue-800'
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light'; // Default to light theme
  });

  const [customSettings, setCustomSettingsState] = useState<CustomSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'theme');
    
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as CustomSettings;
        setCustomSettingsState(data);
      } else {
        // If no settings exist in Firestore, create them with defaults
        setDoc(settingsRef, DEFAULT_SETTINGS).catch(e => console.error("Error creating default theme settings:", e));
      }
    }, (error) => {
      console.error("Error listening to theme settings:", error);
      // Fallback to default if there's an error
      setCustomSettingsState(DEFAULT_SETTINGS);
    });

    return () => unsubscribe();
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('theme', newTheme);
  };
  
  const setCustomSettings = async (newSettings: CustomSettings) => {
    try {
      const settingsRef = doc(db, 'settings', 'theme');
      await setDoc(settingsRef, newSettings, { merge: true });
      // The onSnapshot listener will update the state, so no need for setCustomSettingsState here
    } catch (e) {
      console.error("Failed to save custom theme settings to Firestore", e);
      throw e; // Re-throw to be caught by the calling component
    }
  };

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, customSettings, setCustomSettings }}>
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
