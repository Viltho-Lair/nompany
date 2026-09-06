// QUALITY'S TYPES — the department's context, and the shapes only its screens
// use. Stored records live in `schema.ts`; see the note there.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { QualityDocument, QualityRevision } from "./schema";

// QUALITY HAS NO SUB-SECTIONS AND NO FLAGS. Its parent renders the generic
// section dashboard rather than a module screen of its own, so the factory call
// carries a root and one foreign section: Master data, whose register names the
// department that owns a controlled document.
export type QualityContext = ModuleContext & {
  /** Master data, read to name a document's owning department. Nullable, like every foreign section. */
  masterSection: Section | null;
};
