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

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const base = getApiBase();
  if (!base) {
    throw new ApiError("API URL not configured (set NEXT_PUBLIC_API_URL)", 0);
  }
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers = new Headers(options.headers);
  const body = options.body;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  if (body != null && typeof body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!isFormData && body != null && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  const res = await fetch(url, {
    ...options,
    headers,
    body:
      body != null && typeof body !== "string" && !isFormData
        ? JSON.stringify(body)
        : (body as BodyInit | null | undefined),
  });
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
