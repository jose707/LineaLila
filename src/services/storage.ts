// src/services/storage.ts
// Centralized storage helper:
// - Prefer MMKV (sync, fast)
// - If MMKV is not available (common in mislinked/bridgeless-native issues), fall back to
//   an in-memory cache backed by AsyncStorage (persisted) while keeping a sync API.

type SyncStorage = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

let storageInstance: SyncStorage | null = null;
const VERBOSE_STORAGE_LOGS = false;

// Persistent fallback (sync reads from cache, async write-through to disk)
const fallbackCache = new Map<string, string>();
let fallbackHydrating = false;

const hydrateFallbackFromAsyncStorage = () => {
  if (fallbackHydrating) return;
  fallbackHydrating = true;
  try {
    const AsyncStorage =
      require('@react-native-async-storage/async-storage').default;

    AsyncStorage.getAllKeys()
      .then((keys: string[]) => (keys?.length ? AsyncStorage.multiGet(keys) : []))
      .then((entries: Array<[string, string | null]>) => {
        for (const [k, v] of entries) {
          if (typeof v === 'string') fallbackCache.set(k, v);
        }
        if (VERBOSE_STORAGE_LOGS) {
          console.log('✅ [Storage] AsyncStorage fallback hydrated');
        }
      })
      .catch((e: any) => {
        console.warn('⚠️ [Storage] AsyncStorage hydration failed:', e);
      });
  } catch (e) {
    console.warn('⚠️ [Storage] AsyncStorage not available:', e);
  }
};

const makeAsyncStorageBackedSyncStorage = (): SyncStorage => {
  hydrateFallbackFromAsyncStorage();

  let AsyncStorage: any = null;
  try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch {
    AsyncStorage = null;
  }

  return {
    getString: (key: string) => fallbackCache.get(key),
    set: (key: string, value: string) => {
      fallbackCache.set(key, value);
      if (AsyncStorage) {
        AsyncStorage.setItem(key, value).catch((e: any) =>
          console.warn('⚠️ [Storage] AsyncStorage setItem failed:', e),
        );
      }
    },
    delete: (key: string) => {
      fallbackCache.delete(key);
      if (AsyncStorage) {
        AsyncStorage.removeItem(key).catch((e: any) =>
          console.warn('⚠️ [Storage] AsyncStorage removeItem failed:', e),
        );
      }
    },
  };
};

try {
  const mmkvModule = require('react-native-mmkv');
  // Newer react-native-mmkv exports factory functions (e.g. createMMKV)
  const createMMKV =
    typeof mmkvModule?.createMMKV === 'function' ? mmkvModule.createMMKV : null;

  // Older exports may include a class-like MMKV constructor
  const MMKVClass =
    mmkvModule?.MMKV ?? mmkvModule?.default ?? mmkvModule?.Mmkv ?? null;

  const mmkv =
    createMMKV?.({ id: 'linealila' }) ??
    (typeof MMKVClass === 'function' ? new MMKVClass() : null);

  if (!mmkv) {
    throw new Error(
      `MMKV export not found. Keys: ${Object.keys(mmkvModule || {}).join(', ')}`,
    );
  }

  // Some builds/export styles expose slightly different method names.
  // Normalize to the minimal SyncStorage interface we need.
  const getStringFn: any = mmkv.getString ?? mmkv.get ?? mmkv.getItem ?? null;
  const setFn: any = mmkv.set ?? mmkv.setString ?? mmkv.setItem ?? null;
  const deleteFn: any =
    mmkv.delete ?? mmkv.remove ?? mmkv.removeItem ?? mmkv.del ?? null;

  if (
    typeof getStringFn !== 'function' ||
    typeof setFn !== 'function' ||
    typeof deleteFn !== 'function'
  ) {
    throw new Error('MMKV instance missing expected methods');
  }

  storageInstance = {
    getString: (key: string) => {
      const v = getStringFn.call(mmkv, key);
      return typeof v === 'string' ? v : undefined;
    },
    set: (key: string, value: string) => {
      setFn.call(mmkv, key, value);
    },
    delete: (key: string) => {
      deleteFn.call(mmkv, key);
    },
  };
  console.log('✅ MMKV initialized successfully');
} catch (error) {
  console.warn('⚠️ [Storage] MMKV not available, using fallback:', error);
  storageInstance = makeAsyncStorageBackedSyncStorage();
}

export const StorageHelper = {
  getItem: (key: string): string | null => {
    try {
      const value = storageInstance?.getString(key);
      if (VERBOSE_STORAGE_LOGS) {
        console.log(
          `[Storage] getItem(${key}):`,
          value ? 'found' : 'not found',
        );
      }
      return value || null;
    } catch (error) {
      console.error(`[Storage] Error reading ${key}:`, error);
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      if (VERBOSE_STORAGE_LOGS) {
        console.log(
          `[Storage] setItem(${key}):`,
          value ? 'saving...' : 'empty value',
        );
      }
      storageInstance?.set(key, value);
      if (VERBOSE_STORAGE_LOGS) {
        // Verify it was saved
        const verify = storageInstance?.getString(key);
        console.log(
          `[Storage] setItem(${key}) verified:`,
          verify ? 'success' : 'FAILED',
        );
      }
    } catch (error) {
      console.error(`[Storage] Error writing ${key}:`, error);
    }
  },

  removeItem: (key: string): void => {
    try {
      if (VERBOSE_STORAGE_LOGS) {
        console.log(`[Storage] removeItem(${key})`);
      }
      storageInstance?.delete(key);
    } catch (error) {
      console.error(`[Storage] Error removing ${key}:`, error);
    }
  },
};

export default StorageHelper;
