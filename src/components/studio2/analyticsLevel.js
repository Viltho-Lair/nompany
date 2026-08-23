"use client";

// THE STUDIO'S ANALYTICS RUNG, provided once by the shell and read by any
// dashboard — without a per-request read that would add a Redis hop to every
// module API (Gate A pins those). The studio route already resolves the plan to
// draw the package/tier tags, so the rung rides down with it, through context.
//
// Defaults to "basic" (the free floor) when no provider is present — so a
// dashboard rendered outside the shell still shows its free widgets rather than
// throwing.
import { createContext, useContext } from "react";

const AnalyticsLevelContext = createContext("basic");

export function AnalyticsLevelProvider({ level, children }) {
  return <AnalyticsLevelContext.Provider value={level || "basic"}>{children}</AnalyticsLevelContext.Provider>;
}

export function useAnalyticsLevel() {
  return useContext(AnalyticsLevelContext);
}
