"use client";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

// What every piece of the site needs to know and nothing should be handed as a
// prop five levels down: the language, which way it reads, and whether the
// page has been counted in yet (the intro holds the hero until it has).
export type SiteValue = { locale: string; rtl: boolean; ready: boolean };
const SiteContext = createContext<SiteValue>({ locale: "en", rtl: false, ready: true });

export function SiteProvider({ value, children }: { value: SiteValue; children?: ReactNode }) {
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext);
}
