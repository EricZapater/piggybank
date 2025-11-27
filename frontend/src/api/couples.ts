import { apiFetch } from "@/api/client";

export type CouplePartner = {
  id: string;
  email: string;
  name: string;
};

export type CoupleInfo = {
  id: string;
  partner: CouplePartner;
  createdAt: string;
};

export type CoupleRequest = {
  id: string;
  direction: "incoming" | "outgoing";
  status: "pending" | "accepted" | "rejected";
  partner: CouplePartner;
  createdAt: string;
};

export type CoupleStatus = {
  couple: CoupleInfo | null;
  incoming: CoupleRequest[];
  outgoing: CoupleRequest[];
};

export const getCoupleStatus = (token: string) =>
  apiFetch<CoupleStatus>({
    path: "/couples/me",
    method: "GET",
    token,
  });

export const requestCouple = (token: string, partnerEmail: string) =>
  apiFetch<CoupleRequest>({
    path: "/couples/request",
    method: "POST",
    token,
    body: JSON.stringify({ partnerEmail }),
  });

export const acceptCouple = (token: string, requestId: string) =>
  apiFetch<CoupleInfo>({
    path: "/couples/accept",
    method: "POST",
    token,
    body: JSON.stringify({ requestId }),
  });

export const resendCouple = (token: string, requestId: string) =>
  apiFetch<{ message: string }>({
    path: "/couples/resend",
    method: "POST",
    token,
    body: JSON.stringify({ requestId }),
  });
