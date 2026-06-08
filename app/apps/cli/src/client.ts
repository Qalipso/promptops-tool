/**
 * Thin HTTP client for the local PromptOps API.
 * Base URL: PROMPTOPS_API_URL (default http://localhost:3013).
 * Token: PROMPTOPS_API_TOKEN — only needed when the API runs with auth on.
 */

const BASE = (process.env.PROMPTOPS_API_URL ?? 'http://localhost:3013').replace(/\/$/, '');
const TOKEN = process.env.PROMPTOPS_API_TOKEN;
const PREFIX = '/api/v0';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Envelope<T> = { success: boolean; data?: T; error?: unknown };

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'content-type': 'application/json' };
  if (TOKEN) h.authorization = `Bearer ${TOKEN}`;
  return h;
}

async function unwrap<T>(res: Response, path: string): Promise<T> {
  const text = await res.text();
  let json: Envelope<T> | undefined;
  try {
    json = text ? (JSON.parse(text) as Envelope<T>) : undefined;
  } catch {
    json = undefined;
  }
  if (!res.ok) {
    const detail =
      json?.error && typeof json.error === 'object'
        ? JSON.stringify(json.error)
        : (json?.error ?? text ?? '');
    throw new ApiError(res.status, `${res.status} ${path} — ${detail}`);
  }
  return (json?.data ?? (json as unknown)) as T;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, headers: headers() };
  if (body !== undefined) init.body = JSON.stringify(body);
  let res: Response;
  try {
    res = await fetch(`${BASE}${PREFIX}${path}`, init);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ApiError(0, `Cannot reach API at ${BASE} — is it running? (${msg})`);
  }
  return unwrap<T>(res, path);
}

export const api = {
  base: BASE,
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
};

export async function health(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
