// QUALITY'S TYPES — the department's context, and the shapes only its screens
// use. Stored records live in `schema.ts`; see the note there.

import type { ModuleContext } from "../context";

export type { QualityDocument, QualityRevision } from "./schema";

// QUALITY HAS NO SUB-SECTIONS AND NO FLAGS. Its parent renders the generic
// section dashboard rather than a module screen of its own, so the factory
// call carries only a root — which is why this type adds nothing to the base
// and exists anyway, so the service reads like its nine siblings.
export type QualityContext = ModuleContext;
