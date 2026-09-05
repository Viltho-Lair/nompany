// TENDERING'S TYPES — the department's context, and the shapes only its screens
// use. Stored records live in `schema.ts`.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { Tender, TenderStageEntry, BoqItem, TenderRate } from "./schema";

/**
 * A SUB-SECTION FALLS BACK TO THE ROOT and is therefore always present; a
 * FOREIGN one never does, so it is nullable — "this studio has no CRM & Sales
 * section" is a real answer, and a tender whose issuer is not a client of this
 * studio is the ordinary case rather than an error.
 */
export type TenderingContext = ModuleContext & {
  registerSection: Section;
  ratesSection: Section;
  salesClientsSection: Section | null;
  canViewRegister: boolean;
  canManageRegister: boolean;
  canViewRates: boolean;
  canManageRates: boolean;
};
