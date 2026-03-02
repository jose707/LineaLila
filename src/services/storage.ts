// src/services/storage.ts
// Centralized storage helper using react-native-mmkv
let MMKV: any;
let storageInstance: any;

try {
  ({ MMKV } = require('react-native-mmkv'));
  storageInstance = new MMKV.MMKV();
  console.log('✅ MMKV initialized successfully');
} catch (error) {
  console.warn('⚠️ MMKV not available, using Map fallback:', error);
  // Fallback storage
  storageInstance = new Map();
}

export const StorageHelper = {
  getItem: (key: string): string | null => {
    try {
      if (storageInstance instanceof Map) {
        const value = storageInstance.get(key);
        console.log(
          `[Storage] getItem(${key}):`,
          value ? 'found' : 'not found',
        );
        return value || null;
      }
      const value = storageInstance.getString(key);
      console.log(`[Storage] getItem(${key}):`, value ? 'found' : 'not found');
      return value || null;
    } catch (error) {
      console.error(`[Storage] Error reading ${key}:`, error);
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      console.log(
        `[Storage] setItem(${key}):`,
        value ? 'saving...' : 'empty value',
      );
      if (storageInstance instanceof Map) {
        storageInstance.set(key, value);
      } else {
        storageInstance.set(key, value);
      }
      // Verify it was saved
      const verify =
        storageInstance instanceof Map
          ? storageInstance.get(key)
          : storageInstance.getString(key);
      console.log(
        `[Storage] setItem(${key}) verified:`,
        verify ? 'success' : 'FAILED',
      );
    } catch (error) {
      console.error(`[Storage] Error writing ${key}:`, error);
    }
  },

  removeItem: (key: string): void => {
    try {
      console.log(`[Storage] removeItem(${key})`);
      if (storageInstance instanceof Map) {
        storageInstance.delete(key);
      } else {
        storageInstance.delete(key);
      }
    } catch (error) {
      console.error(`[Storage] Error removing ${key}:`, error);
    }
  },
};

export default StorageHelper;
