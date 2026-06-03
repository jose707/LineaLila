import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StorageHelper } from '../services/storage';

export interface UserSettings {
  darkMode: boolean;
  appPin: string | null;
  preferredVehicleType: 'taxi' | 'minibus' | 'bus' | 'motorcycle';
  priceMin: number;
  priceMax: number;
  driverGenderFilter: 'any' | 'male' | 'female';
  driverMinRating: number;
  autoAcceptRides: boolean;
  allowNegotiation: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  setAppPin: (pin: string | null) => void;
  clearSettings: () => void;
  isLoading: boolean;
}

const defaultSettings: UserSettings = {
  darkMode: false,
  appPin: null,
  preferredVehicleType: 'taxi',
  priceMin: 0,
  priceMax: 100,
  driverGenderFilter: 'any',
  driverMinRating: 0,
  autoAcceptRides: false,
  allowNegotiation: true,
  notificationsEnabled: true,
  soundEnabled: true,
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const stored = StorageHelper.getItem('@settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      }
      const storedPin = StorageHelper.getItem('@app_pin');
      if (storedPin) {
        setSettings(prev => ({ ...prev, appPin: storedPin }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      StorageHelper.setItem('@settings', JSON.stringify(updated));
      return updated;
    });
  };

  const setAppPin = (pin: string | null) => {
    if (pin) {
      StorageHelper.setItem('@app_pin', pin);
    } else {
      StorageHelper.removeItem('@app_pin');
    }
    updateSettings({ appPin: pin });
  };

  const clearSettings = () => {
    setSettings(defaultSettings);
    StorageHelper.removeItem('@settings');
    StorageHelper.removeItem('@app_pin');
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        setAppPin,
        clearSettings,
        isLoading,
      }}>
      {children}
    </SettingsContext.Provider>
  );
};