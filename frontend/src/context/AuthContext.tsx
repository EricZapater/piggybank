import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as authApi from '@/api/auth';

export type AuthUser = authApi.User;

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  initialized: boolean;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const TOKEN_KEY = '@piggybank/token';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type ProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider: React.FC<ProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ token: null, user: null, initialized: false });

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (!storedToken) {
          return;
        }

        const profile = await authApi.me(storedToken);
        setState({ token: storedToken, user: profile, initialized: true });
      } catch (error) {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setState({ token: null, user: null, initialized: true });
      } finally {
        setState((prev: AuthState) => ({ ...prev, initialized: true }));
      }
    };

    bootstrap();
  }, []);

  const persistSession = useCallback(async (token: string, user: AuthUser) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setState({ token, user, initialized: true });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    await persistSession(result.token, result.user);
  }, [persistSession]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const result = await authApi.register({ name, email, password });
    await persistSession(result.token, result.user);
  }, [persistSession]);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setState({ token: null, user: null, initialized: true });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.token) {
      return;
    }
    const profile = await authApi.me(state.token);
    setState((prev: AuthState) => ({ ...prev, user: profile }));
  }, [state.token]);

  const value = useMemo<AuthContextValue>(() => ({
    token: state.token,
    user: state.user,
    initialized: state.initialized,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }), [state.token, state.user, state.initialized, signIn, signUp, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

