"use client";

import { useSyncExternalStore } from "react";

import type { FontEntry } from "@/app/api/fonts/route";

type CatalogState = {
  status: "idle" | "loading" | "ready" | "error";
  fonts: FontEntry[];
};

/**
 * The catalogue is fetched once per page load and cached at module scope: it is
 * ~1,950 entries and identical for every picker on the page. Exposed as an
 * external store so components read it without mirroring it into state.
 */
let state: CatalogState = { status: "idle", fonts: [] };
const listeners = new Set<() => void>();

function emit(next: CatalogState) {
  state = next;
  for (const listener of listeners) listener();
}

/**
 * Starts the one-time fetch. Call it from an event (opening the picker), never
 * during render — the synchronous "loading" transition would be a setState in
 * the middle of another component rendering.
 */
export function ensureFontCatalog() {
  if (state.status !== "idle") return;
  emit({ status: "loading", fonts: [] });

  fetch("/api/fonts")
    .then(async (response) => {
      if (!response.ok) throw new Error(`fonts: ${response.status}`);
      return (await response.json()) as { fonts: FontEntry[] };
    })
    .then((body) => emit({ status: "ready", fonts: body.fonts }))
    .catch(() => emit({ status: "error", fonts: [] }));
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot(): CatalogState {
  return { status: "idle", fonts: [] };
}

/** Subscribes to the catalogue. Loading is started by `ensureFontCatalog`. */
export function useFontCatalog(): CatalogState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
