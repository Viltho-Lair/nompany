import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

// ---- Master data's context ---------------------------------------------------
//
// Generated from the spec in master.ts: `foreign` becomes `<name>Section`. A
// FOREIGN section never falls back to the root, so it is nullable — "this studio
// has no Field Operations section" is a real answer, and it means nothing can be
// pointing at a location.
export type MasterContext = ModuleContext & {
  /** Field Operations, read only to ask whether a shift or permit names a location. */
  fieldServiceSection: Section | null;
};
