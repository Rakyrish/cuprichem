import { appConfig } from "@/config/app";
/**
 * Django API client.
 *
 * Auth is a JWT in an HTTP-only cookie, so the browser attaches it
 * automatically and this module never sees, stores or forwards a token —
 * there is deliberately no localStorage anywhere in the admin. That means
 * every request must send credentials, and every unsafe method must echo the
 * CSRF token back as a header.
 *
 * The backend returns one error envelope for every failure, so callers only
 * ever handle `ApiError`.
 */

/**
 * The API origin comes from `API_BASE_URL` in the single repository-root
 * `.env`; see `appConfig` for the same-host requirement the auth cookie
 * imposes on it.
 */
export const API_BASE = appConfig.apiBaseUrl;

const ADMIN_PREFIX = "/api/admin";
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }

  /** Field-level messages from a DRF validation error, if present. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.details ?? {})) {
      if (Array.isArray(value)) out[key] = String(value[0]);
      else if (typeof value === "string") out[key] = value;
    }
    return out;
  }

  /** Publish-gate blockers, when the backend refused a publish. */
  get blockers(): string[] {
    const raw = this.details?.blockers;
    return Array.isArray(raw) ? raw.map(String) : [];
  }
}

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : "";
}

/** Seed the CSRF cookie. Called once before the first unsafe request. */
export async function ensureCsrf(): Promise<void> {
  if (readCookie("csrftoken")) return;
  await fetch(`${API_BASE}${ADMIN_PREFIX}/auth/csrf/`, {
    credentials: "include",
  });
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Sent as multipart instead of JSON (file uploads). */
  formData?: FormData;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();

  let url = `${API_BASE}${ADMIN_PREFIX}${path}`;
  if (options.query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {};
  if (UNSAFE.has(method)) {
    await ensureCsrf();
    headers["X-CSRFToken"] = readCookie("csrftoken");
  }

  let payload: BodyInit | undefined;
  if (options.formData) {
    payload = options.formData; // let the browser set the multipart boundary
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: payload,
      credentials: "include",
      signal: options.signal,
    });
  } catch (cause) {
    // Distinguish "the server is down" from "the server said no" — the two
    // need very different messages in the UI.
    throw new ApiError(0, {
      code: "network_error",
      message:
        "Could not reach the API. Check that the Django server is running.",
    });
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const envelope = (data as { error?: ApiErrorBody } | null)?.error;
    throw new ApiError(
      response.status,
      envelope ?? {
        code: `http_${response.status}`,
        message: response.statusText || "The request failed.",
      },
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) =>
    apiRequest<T>(path, { query }),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    apiRequest<T>(path, { method: "POST", formData }),
};
