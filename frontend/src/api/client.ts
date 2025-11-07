import Constants from 'expo-constants';

const DEFAULT_API_URL = 'http://localhost:8080';

const resolveBaseUrl = () => {
  const expoConfig = Constants.expoConfig ?? Constants.manifest;
  const extra = (expoConfig && 'extra' in expoConfig ? (expoConfig as any).extra : {}) as Record<string, unknown>;

  const envUrl = process.env.EXPO_PUBLIC_API_URL as string | undefined;
  const configUrl = (extra?.apiUrl as string | undefined) ?? envUrl;

  return configUrl ?? DEFAULT_API_URL;
};

export const API_URL = resolveBaseUrl();

type FetchOptions = RequestInit & {
  path: string;
  token?: string;
};

const buildHeaders = (headers?: HeadersInit) => {
  if (headers instanceof Headers) {
    return new Headers(headers);
  }

  if (Array.isArray(headers)) {
    return new Headers(headers);
  }

  return new Headers(headers ?? {});
};

export const apiFetch = async <T>({ path, token, ...init }: FetchOptions): Promise<T> => {
  const headers = buildHeaders(init.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

