import { apiFetch } from "@/api/client";

export type VoucherTemplate = {
  id: string;
  piggyBankId: string;
  title: string;
  description: string | null;
  amountCents: number;
  createdAt: string;
};

export type CreateVoucherTemplateRequest = {
  piggyBankId: string;
  title: string;
  description?: string;
  amountCents: number;
};

export const getVoucherTemplates = (token: string, piggyBankId: string) =>
  apiFetch<VoucherTemplate[]>({
    path: `/piggybanks/${piggyBankId}/voucher-templates`,
    method: "GET",
    token,
  });

export const createVoucherTemplate = (
  token: string,
  voucherTemplate: CreateVoucherTemplateRequest
) =>
  apiFetch<VoucherTemplate>({
    path: "/voucher-templates",
    method: "POST",
    token,
    body: JSON.stringify(voucherTemplate),
  });
