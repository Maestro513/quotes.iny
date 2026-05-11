"use client";

import { useState, useEffect } from "react";

/**
 * Tracks the last few plan-detail pages a user has visited via localStorage.
 * Surfaces a "Recently viewed" quick-filter preset on the medicare results page.
 *
 * Design choices:
 * - Module-level `recordRecentlyViewed(id)` so plan cards can fire it without
 *   each becoming a stateful component (saves a useState+useEffect per card).
 * - Synthetic StorageEvent dispatched on write so the same-window listener
 *   on the results page picks up the change immediately (the native
 *   "storage" event only fires for OTHER windows by default).
 * - Cap at 6 entries — enough to be useful, small enough to avoid clutter
 *   in the filter row when rendered as a pill chip count.
 */
const KEY = "med:recentlyViewed";
const MAX = 6;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Quota exceeded / private-browsing — silent fail is fine, this is a UX nicety
  }
}

/** Record a plan-detail visit. Idempotent: re-visits move the id to the front. */
export function recordRecentlyViewed(id: string): void {
  if (typeof window === "undefined") return;
  const prev = read();
  const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX);
  write(next);
  // Notify same-window listeners (StorageEvent only fires cross-window natively)
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
}

/** Reactive list of recently-viewed plan IDs. Re-reads on cross-tab + same-window writes. */
export function useRecentlyViewed(): string[] {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read());
    function onStorage(e: StorageEvent) {
      if (e.key === KEY || e.key === null) setIds(read());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return ids;
}
