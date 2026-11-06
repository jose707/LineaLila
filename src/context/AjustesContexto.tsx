import React, { createContext as crearContexto, useContext as usarContexto, useState as usarEstado, useEffect as usarEfecto, ReactNode } from 'react';
import { AlmacenamientoAuxiliar } from '../services/storage';

export interface UsuarioAjustes {
  darkMode: boolean;
  appPin: string | null;
  preferredVehicleType: 'taxi' | 'minibus' | 'bus' | 'motocicleta';
  priceMin: number;
  priceMax: number;
  driverGenderFilter: 'any' | 'male' | 'female';
  driverMinRating: number;
  autoAcceptRides: boolean;
  allowNegotiation: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

interface AjustesContextoTipo {
  settings: UsuarioAjustes;
  updateSettings: (newSettings: Partial<UsuarioAjustes>) => void;
  setAppPin: (pin: string | null) => void;
  clearSettings: () => void;
  isLoading: boolean;
}

const predeterminadoAjustes: UsuarioAjustes = {
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
  soundEnabled: true
};

const AjustesContexto = crearContexto<AjustesContextoTipo | null>(null);

const usarAjustes = () => {
  const contexto = usarContexto(AjustesContexto);
  if (!contexto) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return contexto;
};export { usarAjustes };

interface AjustesProviderPropiedades {
  children: ReactNode;
}

const AjustesProvider: React.FC<AjustesProviderPropiedades> = ({ children: hijos }) => {
  const [ajustes, establecerAjustes] = usarEstado<UsuarioAjustes>(predeterminadoAjustes);
  const [esCargando, establecerEsCargando] = usarEstado(true);

  usarEfecto(() => {
    cargarAjustes();
  }, []);

  const cargarAjustes = () => {
    try {
      const almacenado = AlmacenamientoAuxiliar.obtenerElemento('@settings');
      if (almacenado) {
        const analizado = JSON.parse(almacenado);
        establecerAjustes({ ...predeterminadoAjustes, ...analizado });
      }
      const almacenadoPin = AlmacenamientoAuxiliar.obtenerElemento('@app_pin');
      if (almacenadoPin) {
        establecerAjustes((anterior) => ({ ...anterior, appPin: almacenadoPin }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      establecerEsCargando(false);
    }
  };

  const actualizarAjustes = (nuevoAjustes: Partial<UsuarioAjustes>) => {
    establecerAjustes((anterior) => {
      const actualizado = { ...anterior, ...nuevoAjustes };
      AlmacenamientoAuxiliar.establecerElemento('@settings', JSON.stringify(actualizado));
      return actualizado;
    });
  };

  const establecerAplicacionPin = (pin: string | null) => {
    if (pin) {
      AlmacenamientoAuxiliar.establecerElemento('@app_pin', pin);
    } else {
      AlmacenamientoAuxiliar.quitarElemento('@app_pin');
    }
    actualizarAjustes({ appPin: pin });
  };

  const limpiarAjustes = () => {
    establecerAjustes(predeterminadoAjustes);
    AlmacenamientoAuxiliar.quitarElemento('@settings');
    AlmacenamientoAuxiliar.quitarElemento('@app_pin');
  };

  return (
    <AjustesContexto.Provider
      value={{
        settings: ajustes,
        updateSettings: actualizarAjustes,
        setAppPin: establecerAplicacionPin,
        clearSettings: limpiarAjustes,
        isLoading: esCargando
      }}>
      {hijos}
    </AjustesContexto.Provider>);

};export { AjustesProvider };
