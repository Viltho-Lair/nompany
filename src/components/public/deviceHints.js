"use client";

import { useEffect } from "react";
import { DEVICE_HINTS_COOKIE, encodeHints } from "@/shared/deviceClass";
import { identifyDevice } from "./deviceIntel";

// WHAT THE SERVER CANNOT SEE FOR ITSELF: how many touch points this screen has
// and its short side. Written into a short-lived cookie on every sign-in page,
// so whichever route mints the session — the password, the emailed code, a
// Google or Microsoft callback — reads the same two facts off the request.
// `shared/deviceClass` says why the user agent alone got tablets wrong.
export function writeDeviceHints() {
  if (typeof window === "undefined") return;
  try {
    const value = encodeHints({
      touchPoints: navigator.maxTouchPoints || 0,
      shortSide: Math.min(window.screen?.width || 0, window.screen?.height || 0),
    });
    // Ten minutes: long enough to finish signing in, short enough to go stale
    // on a shared machine rather than describe it for ever.
    document.cookie = `${DEVICE_HINTS_COOKIE}=${value}; Path=/; Max-Age=600; SameSite=Lax`;
  } catch { /* a cookie the browser refuses only costs the hint */ }
}

/**
 * Mount on a sign-in surface; renders nothing. Also starts Fingerprint
 * (./deviceIntel), so its event is usually ready by the time the form is sent —
 * and ready for a Google or Microsoft button, which navigates away and cannot
 * wait for anything.
 */
export function useDeviceHints() {
  useEffect(() => { writeDeviceHints(); identifyDevice(); }, []);
}
