// MARKETING'S TYPES — the department's context. Stored records live in
// `schema.ts`.

import type { ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";

export type { Campaign } from "./schema";

// Generated from the spec in ./campaigns: `sub` becomes `<name>Section`, `flags`
// become `canView<Name>`/`canManage<Name>`. A SUB-SECTION FALLS BACK TO THE ROOT
// and is always present.
export type MarketingContext = ModuleContext & {
  campaignsSection: Section;
  canViewCampaigns: boolean;
  canManageCampaigns: boolean;
};
