import { fetch as expoFetch } from "expo/fetch";

type TokenGetter = () => Promise<string | null>;
let tokenGetter: TokenGetter | null = null;

export function setApiTokenGetter(fn: TokenGetter) {
  tokenGetter = fn;
}

export async function getApiToken(): Promise<string | null> {
  return tokenGetter ? tokenGetter() : null;
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getApiToken();
  const headers: Record<string, string> = {};
  if (options.headers) {
    const existing = options.headers as Record<string, string>;
    Object.assign(headers, existing);
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return expoFetch(url, { ...options, headers });
}
