export function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:4100";
  }
  return "";
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function mergeAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  const c = new AbortController();
  const onAbort = () => c.abort(a.reason ?? b.reason);
  if (a.aborted || b.aborted) {
    onAbort();
    return c.signal;
  }
  a.addEventListener("abort", onAbort);
  b.addEventListener("abort", onAbort);
  return c.signal;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null; timeoutMs?: number } = {},
): Promise<T> {
  const {
    token,
    timeoutMs: explicitTimeoutMs,
    signal: callerSignal,
    headers: optionHeaders,
    body,
    ...restFetch
  } = options;

  const base = getApiBase();
  if (!base) {
    throw new ApiError("API URL not configured (set NEXT_PUBLIC_API_URL)", 0);
  }
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers = new Headers(optionHeaders);
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  if (body != null && typeof body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!isFormData && body != null && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const timeoutMs = explicitTimeoutMs ?? 35_000;
  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutCtrl.abort(new DOMException("Request timed out", "TimeoutError")),
    timeoutMs,
  );

  const signal =
    callerSignal != null ? mergeAbortSignals(callerSignal, timeoutCtrl.signal) : timeoutCtrl.signal;

  let res: Response;
  try {
    res = await fetch(url, {
      ...restFetch,
      signal,
      headers,
      body:
        body != null && typeof body !== "string" && !isFormData
          ? JSON.stringify(body)
          : (body as BodyInit | null | undefined),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError("Request timed out — is the API running and reachable?", 0);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();
  let parsed: unknown = text;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  } else {
    parsed = null;
  }
  if (!res.ok) {
    const msg =
      typeof parsed === "object" && parsed && "error" in parsed
        ? String((parsed as { error?: unknown }).error)
        : res.statusText;
    throw new ApiError(msg || `HTTP ${res.status}`, res.status, parsed);
  }
  return parsed as T;
}
