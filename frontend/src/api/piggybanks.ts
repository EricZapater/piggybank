import { apiFetch } from "@/api/client";

export type PiggyBank = {
  id: string;
  coupleId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  voucherTemplatesCount: number;
  totalActions: number;
  totalValue: number;
};

export type CreatePiggyBankRequest = {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
};

export const getPiggyBanks = (token: string) =>
  apiFetch<PiggyBank[]>({
    path: "/piggybanks",
    method: "GET",
    token,
  });

export const createPiggyBank = (
  token: string,
  piggyBank: CreatePiggyBankRequest
) =>
  apiFetch<PiggyBank>({
    path: "/piggybanks",
    method: "POST",
    token,
    body: JSON.stringify(piggyBank),
  });

export const getPiggyBank = (token: string, id: string) =>
  apiFetch<PiggyBank>({
    path: `/piggybanks/${id}`,
    method: "GET",
    token,
  });

export const closePiggyBank = (token: string, id: string) =>
  apiFetch<void>({
    path: `/piggybanks/${id}/close`,
    method: "POST",
    token,
  });
