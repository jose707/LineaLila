import { useEffect as usarEfecto, useState as usarEstado } from 'react';
import * as AlmacenamientoServicio from "../services/storage.servicio";

interface PersistedAutenticacionDatos {
  token: string | null;
  firebaseUid: string | null;
  phoneNumber: string | null;
  lastLogin: string | null;
  isLoading: boolean;
}

const usarPersistenteAutenticacion = () => {
  const [autenticacionDatos, establecerAutenticacionDatos] = usarEstado<PersistedAutenticacionDatos>({
    token: null,
    firebaseUid: null,
    phoneNumber: null,
    lastLogin: null,
    isLoading: true
  });

  // Load auth data on app start
  usarEfecto(() => {
    const cargarPersistedDatos = async () => {
      try {
        const token = await AlmacenamientoServicio.obtenerTokenAutenticacion();
        const firebaseUid = await AlmacenamientoServicio.obtenerUidFirebase();
        const telefonoNumero = await AlmacenamientoServicio.obtenerNumeroTelefono();
        const ultimoIngresar = await AlmacenamientoServicio.obtenerUltimoAcceso();

        establecerAutenticacionDatos({
          token,
          firebaseUid,
          phoneNumber: telefonoNumero,
          lastLogin: ultimoIngresar,
          isLoading: false
        });

        console.log('✅ Auth data loaded from storage');
      } catch (error) {
        console.error('❌ Error loading persisted auth data:', error);
        establecerAutenticacionDatos((anterior) => ({ ...anterior, isLoading: false }));
      }
    };

    cargarPersistedDatos();
  }, []);

  const guardarAutenticacionDatos = async (datos: Partial<PersistedAutenticacionDatos>) => {
    try {
      if (datos.token) {
        await AlmacenamientoServicio.guardarAutenticacionToken(datos.token);
      }
      if (datos.firebaseUid) {
        await AlmacenamientoServicio.storeFirebaseUid(datos.firebaseUid);
      }
      if (datos.phoneNumber) {
        await AlmacenamientoServicio.guardarTelefonoNumero(datos.phoneNumber);
      }
      if (datos.lastLogin) {
        await AlmacenamientoServicio.guardarUltimoIngresar();
      }

      establecerAutenticacionDatos((anterior) => ({ ...anterior, ...datos }));
      console.log('✅ Auth data saved');
    } catch (error) {
      console.error('❌ Error saving auth data:', error);
    }
  };

  const limpiarAutenticacionDatos = async () => {
    try {
      await AlmacenamientoServicio.limpiarDatosAutenticacion();
      establecerAutenticacionDatos({
        token: null,
        firebaseUid: null,
        phoneNumber: null,
        lastLogin: null,
        isLoading: false
      });
      console.log('✅ Auth data cleared');
    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
    }
  };

  return {
    ...autenticacionDatos,
    saveAuthData: guardarAutenticacionDatos,
    clearAuthData: limpiarAutenticacionDatos
  };
};export { usarPersistenteAutenticacion };
