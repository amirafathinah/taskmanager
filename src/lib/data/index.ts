import { localStore } from "@/lib/data/local";
import { serverStore } from "@/lib/data/server";
import type { Store } from "@/lib/data/types";

let activeStore: Store | null = null;

/**
 * Picks the data layer for the current environment:
 * - "server": the Next.js API routes backed by a local PostgreSQL database.
 * - "local":  a database that lives inside the browser (static GitHub Pages build).
 */
export async function getStore(): Promise<Store> {
  if (activeStore) return activeStore;
  if (typeof window === "undefined") {
    activeStore = serverStore;
    return activeStore;
  }
  if (process.env.NEXT_PUBLIC_STORAGE === "local") {
    activeStore = localStore;
    return activeStore;
  }
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    const contentType = response.headers.get("content-type") ?? "";
    if (response.ok && contentType.includes("application/json")) {
      const payload = await response.json().catch(() => null);
      if (payload?.ok) {
        activeStore = serverStore;
        return activeStore;
      }
    }
  } catch {
    // Static hosting has no API routes, fall through to the browser database.
  }
  activeStore = localStore;
  return activeStore;
}

export function assetUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${path}`;
}

export type { Store } from "@/lib/data/types";
