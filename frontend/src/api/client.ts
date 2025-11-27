import Constants from "expo-constants";
import { Platform } from "react-native";

const getDefaultUrl = () => {
  if (__DEV__) {
    // En desenvolupament, usar localhost amb la IP correcta
    if (Platform.OS === "android") {
      return "http://192.168.68.106:8080"; // Emulador Android
    }
    return "http://localhost:8080"; // iOS simulator o web
  }
  // En producció, la teva API real
  return "https://api.piggybank.zenith.ovh";
};

const resolveBaseUrl = () => {
  // First check environment variable
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // Fallback to expo config
  const extra = Constants.expoConfig?.extra ?? {};
  return (extra.apiUrl as string) ?? getDefaultUrl();
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

export const apiFetch = async <T>({
  path,
  token,
  ...init
}: FetchOptions): Promise<T> => {
  const headers = buildHeaders(init.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
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
