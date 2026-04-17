"use client";

/**
 * Thin fetch wrapper for the FastAPI backend.
 *
 * Every request routes through the Next.js proxy at /api/backend, which
 * forwards to localhost:8000. This matches the Vectorscope pattern.
 */

export async function backendGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api/backend${path}`);
  if (!res.ok) {
    throw new Error(await formatError(res));
  }
  return (await res.json()) as T;
}

export async function backendPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/backend${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    throw new Error(await formatError(res));
  }
  return (await res.json()) as T;
}

async function formatError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data === "object" && "detail" in data) {
      return String((data as { detail: unknown }).detail);
    }
    return JSON.stringify(data);
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}
