import { apiFetch } from '@/api/client';

export type User = {
  id: string;
  email: string;
  name: string;
};

type AuthResponse = {
  token: string;
  user: User;
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export const login = (payload: LoginPayload) =>
  apiFetch<AuthResponse>({
    path: '/auth/login',
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const register = (payload: RegisterPayload) =>
  apiFetch<AuthResponse>({
    path: '/auth/register',
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const me = (token: string) =>
  apiFetch<User>({
    path: '/auth/me',
    method: 'GET',
    token,
  });

