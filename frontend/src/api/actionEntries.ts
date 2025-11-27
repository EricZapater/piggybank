import { apiFetch } from "@/api/client";

export type ActionEntry = {
  id: string;
  voucherTemplateId: string;
  giverUserId: string;
  occurredAt: string;
  notes: string | null;
  createdAt: string;
};

export type ActionEntryGroup = {
  voucherTemplateId: string;
  voucherTemplate: {
    id: string;
    title: string;
    description: string | null;
    amountCents: number;
  };
  entries: ActionEntrySummary[];
};

export type ActionEntrySummary = {
  id: string;
  occurredAt: string;
  notes: string | null;
  createdAt: string;
};

export type PiggyBankStats = {
  totalActions: number;
  totalValue: number;
};

export type CreateActionEntryRequest = {
  voucherTemplateId: string;
  occurredAt: string;
  notes?: string;
};

export const createActionEntry = (
  token: string,
  actionEntry: CreateActionEntryRequest
) =>
  apiFetch<ActionEntry>({
    path: "/action-entries",
    method: "POST",
    token,
    body: JSON.stringify(actionEntry),
  });

export const getActionEntries = (token: string, piggyBankId: string) =>
  apiFetch<ActionEntryGroup[]>({
    path: `/piggybanks/${piggyBankId}/action-entries`,
    method: "GET",
    token,
  });

export const getPiggyBankStats = (token: string, piggyBankId: string) =>
  apiFetch<PiggyBankStats>({
    path: `/piggybanks/${piggyBankId}/stats`,
    method: "GET",
    token,
  });
