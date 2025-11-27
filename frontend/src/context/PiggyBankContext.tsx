import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Toast from "react-native-toast-message";

import * as actionEntryApi from "@/api/actionEntries";
import * as piggybankApi from "@/api/piggybanks";
import * as voucherTemplateApi from "@/api/voucherTemplates";
import { useAuth } from "@/hooks/useAuth";

type PiggyBankState = {
  piggyBanks: piggybankApi.PiggyBank[];
  loading: boolean;
  initialized: boolean;
};

type ContextValue = {
  state: PiggyBankState;
  refresh: () => Promise<void>;
  createPiggyBank: (
    piggyBank: piggybankApi.CreatePiggyBankRequest
  ) => Promise<void>;
  getPiggyBank: (id: string) => Promise<piggybankApi.PiggyBank | null>;
  getVoucherTemplates: (
    piggyBankId: string
  ) => Promise<voucherTemplateApi.VoucherTemplate[]>;
  createVoucherTemplate: (
    voucherTemplate: voucherTemplateApi.CreateVoucherTemplateRequest
  ) => Promise<void>;
  createActionEntry: (
    actionEntry: actionEntryApi.CreateActionEntryRequest
  ) => Promise<void>;
  getActionEntries: (
    piggyBankId: string
  ) => Promise<actionEntryApi.ActionEntryGroup[]>;
  getPiggyBankStats: (
    piggyBankId: string
  ) => Promise<actionEntryApi.PiggyBankStats | null>;
  closePiggyBank: (id: string) => Promise<void>;
};

const initialState: PiggyBankState = {
  piggyBanks: [],
  loading: false,
  initialized: false,
};

export const PiggyBankContext = createContext<ContextValue | undefined>(
  undefined
);

type Props = {
  children: React.ReactNode;
};

export const PiggyBankProvider: React.FC<Props> = ({ children }) => {
  const { token } = useAuth();

  const [state, setState] = useState<PiggyBankState>(initialState);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const loadPiggyBanks = useCallback(async () => {
    if (!token) {
      reset();
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    try {
      const piggyBanks = await piggybankApi.getPiggyBanks(token);
      setState((prev) => ({
        ...prev,
        piggyBanks,
        loading: false,
        initialized: true,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load piggybanks";
      Toast.show({ type: "error", text1: "PiggyBanks", text2: message });
      setState((prev) => ({ ...prev, loading: false, initialized: true }));
    }
  }, [token, reset]);

  useEffect(() => {
    if (!token) {
      reset();
      return;
    }
    loadPiggyBanks();
  }, [token, loadPiggyBanks, reset]);

  const refresh = useCallback(async () => {
    await loadPiggyBanks();
  }, [loadPiggyBanks]);

  const createPiggyBank = useCallback(
    async (piggyBank: piggybankApi.CreatePiggyBankRequest) => {
      if (!token) return;
      setState((prev) => ({ ...prev, loading: true }));
      try {
        await piggybankApi.createPiggyBank(token, piggyBank);
        Toast.show({ type: "success", text1: "PiggyBank created" });
        await loadPiggyBanks();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to create piggybank";
        Toast.show({ type: "error", text1: "Create failed", text2: message });
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [token, loadPiggyBanks]
  );

  const getPiggyBank = useCallback(
    async (id: string): Promise<piggybankApi.PiggyBank | null> => {
      if (!token) return null;
      try {
        return await piggybankApi.getPiggyBank(token, id);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load piggybank";
        Toast.show({ type: "error", text1: "PiggyBank", text2: message });
        return null;
      }
    },
    [token]
  );

  const getVoucherTemplates = useCallback(
    async (
      piggyBankId: string
    ): Promise<voucherTemplateApi.VoucherTemplate[]> => {
      if (!token) return [];
      try {
        return await voucherTemplateApi.getVoucherTemplates(token, piggyBankId);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load voucher templates";
        Toast.show({
          type: "error",
          text1: "Voucher Templates",
          text2: message,
        });
        return [];
      }
    },
    [token]
  );

  const createVoucherTemplate = useCallback(
    async (
      voucherTemplate: voucherTemplateApi.CreateVoucherTemplateRequest
    ) => {
      if (!token) return;
      setState((prev) => ({ ...prev, loading: true }));
      try {
        await voucherTemplateApi.createVoucherTemplate(token, voucherTemplate);
        Toast.show({ type: "success", text1: "Voucher template created" });
        await loadPiggyBanks(); // Refresh to update counts
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to create voucher template";
        Toast.show({ type: "error", text1: "Create failed", text2: message });
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [token, loadPiggyBanks]
  );

  const createActionEntry = useCallback(
    async (actionEntry: actionEntryApi.CreateActionEntryRequest) => {
      if (!token) return;
      setState((prev) => ({ ...prev, loading: true }));
      try {
        await actionEntryApi.createActionEntry(token, actionEntry);
        Toast.show({ type: "success", text1: "Action recorded" });
        await loadPiggyBanks(); // Refresh to update counts
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to record action";
        Toast.show({ type: "error", text1: "Record failed", text2: message });
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [token, loadPiggyBanks]
  );

  const getActionEntries = useCallback(
    async (piggyBankId: string): Promise<actionEntryApi.ActionEntryGroup[]> => {
      if (!token) return [];
      try {
        return await actionEntryApi.getActionEntries(token, piggyBankId);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load action entries";
        Toast.show({
          type: "error",
          text1: "Action Entries",
          text2: message,
        });
        return [];
      }
    },
    [token]
  );

  const getPiggyBankStats = useCallback(
    async (
      piggyBankId: string
    ): Promise<actionEntryApi.PiggyBankStats | null> => {
      if (!token) return null;
      try {
        return await actionEntryApi.getPiggyBankStats(token, piggyBankId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load stats";
        Toast.show({ type: "error", text1: "Stats", text2: message });
        return null;
      }
    },
    [token]
  );

  const closePiggyBank = useCallback(
    async (id: string) => {
      if (!token) return;
      setState((prev) => ({ ...prev, loading: true }));
      try {
        await piggybankApi.closePiggyBank(token, id);
        Toast.show({ type: "success", text1: "PiggyBank closed" });
        await loadPiggyBanks();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to close piggybank";
        Toast.show({ type: "error", text1: "Close failed", text2: message });
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [token, loadPiggyBanks]
  );

  const value = useMemo<ContextValue>(
    () => ({
      state,
      refresh,
      createPiggyBank,
      getPiggyBank,
      getVoucherTemplates,
      createVoucherTemplate,
      createActionEntry,
      getActionEntries,
      getPiggyBankStats,
      closePiggyBank,
    }),
    [
      state,
      refresh,
      createPiggyBank,
      getPiggyBank,
      getVoucherTemplates,
      createVoucherTemplate,
      createActionEntry,
      getActionEntries,
      getActionEntries,
      getPiggyBankStats,
      closePiggyBank,
    ]
  );

  return (
    <PiggyBankContext.Provider value={value}>
      {children}
    </PiggyBankContext.Provider>
  );
};
