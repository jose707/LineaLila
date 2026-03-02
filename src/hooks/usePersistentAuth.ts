import { useEffect, useState } from 'react';
import * as StorageService from '../services/storage.service';

interface PersistedAuthData {
  token: string | null;
  firebaseUid: string | null;
  phoneNumber: string | null;
  lastLogin: string | null;
  isLoading: boolean;
}

export const usePersistentAuth = () => {
  const [authData, setAuthData] = useState<PersistedAuthData>({
    token: null,
    firebaseUid: null,
    phoneNumber: null,
    lastLogin: null,
    isLoading: true,
  });

  // Load auth data on app start
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const token = await StorageService.getAuthToken();
        const firebaseUid = await StorageService.getFirebaseUid();
        const phoneNumber = await StorageService.getPhoneNumber();
        const lastLogin = await StorageService.getLastLogin();

        setAuthData({
          token,
          firebaseUid,
          phoneNumber,
          lastLogin,
          isLoading: false,
        });

        console.log('✅ Auth data loaded from storage');
      } catch (error) {
        console.error('❌ Error loading persisted auth data:', error);
        setAuthData(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadPersistedData();
  }, []);

  const saveAuthData = async (data: Partial<PersistedAuthData>) => {
    try {
      if (data.token) {
        await StorageService.storeAuthToken(data.token);
      }
      if (data.firebaseUid) {
        await StorageService.storeFirebaseUid(data.firebaseUid);
      }
      if (data.phoneNumber) {
        await StorageService.storePhoneNumber(data.phoneNumber);
      }
      if (data.lastLogin) {
        await StorageService.storeLastLogin();
      }

      setAuthData(prev => ({ ...prev, ...data }));
      console.log('✅ Auth data saved');
    } catch (error) {
      console.error('❌ Error saving auth data:', error);
    }
  };

  const clearAuthData = async () => {
    try {
      await StorageService.clearAuthData();
      setAuthData({
        token: null,
        firebaseUid: null,
        phoneNumber: null,
        lastLogin: null,
        isLoading: false,
      });
      console.log('✅ Auth data cleared');
    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
    }
  };

  return {
    ...authData,
    saveAuthData,
    clearAuthData,
  };
};
