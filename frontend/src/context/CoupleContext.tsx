import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import Toast from 'react-native-toast-message';

import * as coupleApi from '@/api/couples';
import { useAuth } from '@/hooks/useAuth';

type CoupleState = {
  couple: coupleApi.CoupleInfo | null;
  incoming: coupleApi.CoupleRequest[];
  outgoing: coupleApi.CoupleRequest[];
};

type ContextValue = {
  loading: boolean;
  initialized: boolean;
  state: CoupleState;
  refresh: () => Promise<void>;
  sendInvite: (email: string) => Promise<void>;
  acceptInvite: (requestId: string) => Promise<void>;
};

const initialState: CoupleState = {
  couple: null,
  incoming: [],
  outgoing: [],
};

export const CoupleContext = createContext<ContextValue | undefined>(undefined);

type Props = {
  children: React.ReactNode;
};

export const CoupleProvider: React.FC<Props> = ({ children }) => {
  const { token } = useAuth();

  const [state, setState] = useState<CoupleState>(initialState);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const reset = useCallback(() => {
    setState(initialState);
    setLoading(false);
    setInitialized(false);
  }, []);

  const loadStatus = useCallback(async () => {
    if (!token) {
      reset();
      return;
    }

    setLoading(true);
    try {
      const status = await coupleApi.getCoupleStatus(token);
      setState({
        couple: status.couple ?? null,
        incoming: status.incoming,
        outgoing: status.outgoing,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load couple status';
      Toast.show({ type: 'error', text1: 'Couple status', text2: message });
      setState(initialState);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [token, reset]);

  useEffect(() => {
    if (!token) {
      reset();
      return;
    }
    loadStatus();
  }, [token, loadStatus, reset]);

  const refresh = useCallback(async () => {
    await loadStatus();
  }, [loadStatus]);

  const sendInvite = useCallback(async (email: string) => {
    if (!token) return;
    setLoading(true);
    try {
      await coupleApi.requestCouple(token, email);
      Toast.show({ type: 'success', text1: 'Invite sent' });
      await loadStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send invite';
      Toast.show({ type: 'error', text1: 'Invite failed', text2: message });
    } finally {
      setLoading(false);
    }
  }, [token, loadStatus]);

  const acceptInvite = useCallback(async (requestId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      await coupleApi.acceptCouple(token, requestId);
      Toast.show({ type: 'success', text1: 'Couple confirmed' });
      await loadStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to accept invite';
      Toast.show({ type: 'error', text1: 'Accept failed', text2: message });
    } finally {
      setLoading(false);
    }
  }, [token, loadStatus]);

  const value = useMemo<ContextValue>(() => ({
    loading,
    initialized,
    state,
    refresh,
    sendInvite,
    acceptInvite,
  }), [loading, initialized, state, refresh, sendInvite, acceptInvite]);

  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>;
};

