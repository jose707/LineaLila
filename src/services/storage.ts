// src/services/storage.ts
// Centralized storage helper:
// - Prefer MMKV (sync, fast)
// - If MMKV is not available (common in mislinked/bridgeless-native issues), fall back to
//   an in-memory cache backed by AsyncStorage (persisted) while keeping a sync API.

type SincronizacionAlmacenamiento = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

let almacenamientoInstancia: SincronizacionAlmacenamiento | null = null;
const VERBOSE_ALMACENAMIENTO_LOGS = false;

// Persistent fallback (sync reads from cache, async write-through to disk)
const alternativaCache = new Map<string, string>();
let alternativaHydrating = false;

const hydrateAlternativaDesdeAsincronoAlmacenamiento = () => {
  if (alternativaHydrating) return;
  alternativaHydrating = true;
  try {
    const AsincronoAlmacenamiento =
    require('@react-native-async-storage/async-storage').default;

    AsincronoAlmacenamiento.getAllKeys().
    then((claves: string[]) => claves?.length ? AsincronoAlmacenamiento.multiGet(claves) : []).
    then((entradas: Array<[string, string | null]>) => {
      for (const [k, v] of entradas) {
        if (typeof v === 'string') alternativaCache.set(k, v);
      }
      if (VERBOSE_ALMACENAMIENTO_LOGS) {
        console.log('✅ [Storage] AsyncStorage fallback hydrated');
      }
    }).
    catch((error: any) => {
      console.warn('⚠️ [Storage] AsyncStorage hydration failed:', error);
    });
  } catch (error) {
    console.warn('⚠️ [Storage] AsyncStorage not available:', error);
  }
};

const makeAsincronoAlmacenamientoBackedSincronizarAlmacenamiento = (): SincronizacionAlmacenamiento => {
  hydrateAlternativaDesdeAsincronoAlmacenamiento();

  let AsincronoAlmacenamiento: any = null;
  try {
    AsincronoAlmacenamiento = require('@react-native-async-storage/async-storage').default;
  } catch {
    AsincronoAlmacenamiento = null;
  }

  return {
    getString: (clave: string) => alternativaCache.get(clave),
    set: (clave: string, valor: string) => {
      alternativaCache.set(clave, valor);
      if (AsincronoAlmacenamiento) {
        AsincronoAlmacenamiento.setItem(clave, valor).catch((error: any) =>
        console.warn('⚠️ [Storage] AsyncStorage setItem failed:', error)
        );
      }
    },
    delete: (clave: string) => {
      alternativaCache.delete(clave);
      if (AsincronoAlmacenamiento) {
        AsincronoAlmacenamiento.removeItem(clave).catch((error: any) =>
        console.warn('⚠️ [Storage] AsyncStorage removeItem failed:', error)
        );
      }
    }
  };
};

try {
  const mmkvModule = require('react-native-mmkv');
  // Newer react-native-mmkv exports factory functions (e.g. createMMKV)
  const crearMmkv =
  typeof mmkvModule?.createMMKV === 'function' ? mmkvModule.createMMKV : null;

  // Older exports may include a class-like MMKV constructor
  const MmkvClase =
  mmkvModule?.MMKV ?? mmkvModule?.default ?? mmkvModule?.Mmkv ?? null;

  const mmkv =
  crearMmkv?.({ id: 'linealila' }) ?? (
  typeof MmkvClase === 'function' ? new MmkvClase() : null);

  if (!mmkv) {
    throw new Error(
      `MMKV export not found. Keys: ${Object.keys(mmkvModule || {}).join(', ')}`
    );
  }

  // Some builds/export styles expose slightly different method names.
  // Normalize to the minimal SyncStorage interface we need.
  const obtenerCadenaFuncion: any = mmkv.getString ?? mmkv.get ?? mmkv.getItem ?? null;
  const establecerFuncion: any = mmkv.set ?? mmkv.setString ?? mmkv.setItem ?? null;
  const eliminarFuncion: any =
  mmkv.delete ?? mmkv.remove ?? mmkv.removeItem ?? mmkv.del ?? null;

  if (
  typeof obtenerCadenaFuncion !== 'function' ||
  typeof establecerFuncion !== 'function' ||
  typeof eliminarFuncion !== 'function')
  {
    throw new Error('MMKV instance missing expected methods');
  }

  almacenamientoInstancia = {
    getString: (clave: string) => {
      const v = obtenerCadenaFuncion.call(mmkv, clave);
      return typeof v === 'string' ? v : undefined;
    },
    set: (clave: string, valor: string) => {
      establecerFuncion.call(mmkv, clave, valor);
    },
    delete: (clave: string) => {
      eliminarFuncion.call(mmkv, clave);
    }
  };
  console.log('✅ MMKV initialized successfully');
} catch (error) {
  console.warn('⚠️ [Storage] MMKV not available, using fallback:', error);
  almacenamientoInstancia = makeAsincronoAlmacenamientoBackedSincronizarAlmacenamiento();
}

const AlmacenamientoAuxiliar = {
  obtenerElemento: (clave: string): string | null => {
    try {
      const valor = almacenamientoInstancia?.getString(clave);
      if (VERBOSE_ALMACENAMIENTO_LOGS) {
        console.log(
          `[Storage] getItem(${clave}):`,
          valor ? 'found' : 'not found'
        );
      }
      return valor || null;
    } catch (error) {
      console.error(`[Storage] Error reading ${clave}:`, error);
      return null;
    }
  },

  establecerElemento: (clave: string, valor: string): void => {
    try {
      if (VERBOSE_ALMACENAMIENTO_LOGS) {
        console.log(
          `[Storage] setItem(${clave}):`,
          valor ? 'saving...' : 'empty value'
        );
      }
      almacenamientoInstancia?.set(clave, valor);
      if (VERBOSE_ALMACENAMIENTO_LOGS) {
        // Verify it was saved
        const verificar = almacenamientoInstancia?.getString(clave);
        console.log(
          `[Storage] setItem(${clave}) verified:`,
          verificar ? 'success' : 'FAILED'
        );
      }
    } catch (error) {
      console.error(`[Storage] Error writing ${clave}:`, error);
    }
  },

  quitarElemento: (clave: string): void => {
    try {
      if (VERBOSE_ALMACENAMIENTO_LOGS) {
        console.log(`[Storage] removeItem(${clave})`);
      }
      almacenamientoInstancia?.delete(clave);
    } catch (error) {
      console.error(`[Storage] Error removing ${clave}:`, error);
    }
  }
};export { AlmacenamientoAuxiliar };

export default AlmacenamientoAuxiliar;
