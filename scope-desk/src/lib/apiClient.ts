"use client";

async function handle(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json();
}

export function apiGet(url: string) {
  return fetch(url, { cache: "no-store" }).then(handle);
}

export function apiPost(url: string, body?: unknown) {
  return fetch(url, {
    method: "POST",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then(handle);
}

export function apiPatch(url: string, body: unknown) {
  return fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handle);
}

export function apiDelete(url: string) {
  return fetch(url, { method: "DELETE" }).then(handle);
}

export function apiUpload(url: string, formData: FormData) {
  return fetch(url, { method: "POST", body: formData }).then(handle);
}
