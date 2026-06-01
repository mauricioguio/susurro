import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/api';

interface User { id: string; alias: string }

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  login: async (token, user) => {
    await AsyncStorage.multiSet([['token', token], ['user', JSON.stringify(user)]]);
    setAuthToken(token);
    set({ token, user });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setAuthToken(null);
    set({ token: null, user: null });
  },

  loadFromStorage: async () => {
    try {
      const [[, token], [, userStr]] = await AsyncStorage.multiGet(['token', 'user']);
      if (token && userStr) {
        setAuthToken(token);
        set({ token, user: JSON.parse(userStr), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
