// Thin fetch wrapper around the codetrek-api accounts endpoints (server/src/
// app.ts). Always same-origin '/api/...' — a reverse proxy (nginx in
// production, Vite's dev server proxy locally, see vite.config.ts) routes
// this to the backend container, so this module never hardcodes a host.

const API_BASE = '/api/auth';

export interface Account {
  id: string;
  username: string;
}

export interface AuthResult {
  account: Account;
  sessionToken: string;
}

export class AuthApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function postJson<T>(path: string, body: unknown, sessionToken?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionToken) headers['x-session-token'] = sessionToken;

  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // Response wasn't JSON — keep the generic message.
    }
    throw new AuthApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function register(username: string, password: string): Promise<AuthResult> {
  return postJson<AuthResult>('/register', { username, password });
}

export function login(username: string, password: string): Promise<AuthResult> {
  return postJson<AuthResult>('/login', { username, password });
}

export function logout(sessionToken: string): Promise<void> {
  return postJson<void>('/logout', {}, sessionToken);
}

/** Validates a stored session token against the server. Throws AuthApiError
 * with status 401 for an invalid/expired session — callers should
 * distinguish that from a network failure (offline), which throws a plain
 * TypeError from fetch() itself and should NOT force a re-login. */
export async function me(sessionToken: string): Promise<Account> {
  const res = await fetch(`${API_BASE}/me`, { headers: { 'x-session-token': sessionToken } });
  if (!res.ok) throw new AuthApiError('session invalid', res.status);
  const data = (await res.json()) as { account: Account };
  return data.account;
}

export function changePassword(sessionToken: string, currentPassword: string, newPassword: string): Promise<void> {
  return postJson<void>('/change-password', { currentPassword, newPassword }, sessionToken);
}

export async function deleteAccount(sessionToken: string): Promise<void> {
  const res = await fetch(`${API_BASE}/account`, { method: 'DELETE', headers: { 'x-session-token': sessionToken } });
  if (!res.ok) throw new AuthApiError(`Request failed (${res.status})`, res.status);
}
