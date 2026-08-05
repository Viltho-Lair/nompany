"use client";

// Tiny per-user localStorage helper for UI presets (column choices, saved
// filters). Keyed by `${key}:${userId}` so different users on one browser stay
// isolated. All access is guarded for SSR + private-mode failures.
export function loadUserPref(key, userId, fallback) {
  if (typeof window === "undefined" || !userId) return fallback;
  try {
    const raw = localStorage.getItem(`${key}:${userId}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

export function saveUserPref(key, userId, value) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(`${key}:${userId}`, JSON.stringify(value));
  } catch {}
}
