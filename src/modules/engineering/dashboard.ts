// THE ENGINEERING & DOCUMENTS DASHBOARD — the department's six registers, at once.
//
// It opens at `/<slug>/engineering-docs`, the root that showed the presales
// dashboard until Quotations became its own department (13/09/2026).
//
// NO RIGHT OF ITS OWN, deliberately, and the reason is the gating below rather
// than an omission. `engineeringDocs.dashboard` is the key every role holding
// the old root already has, and it opens the Quotations dashboard now; minting a
// second dashboard right would be a right nobody holds on the day it ships, and
// hiding a page whose every block is gated by the reader's own register rights
// would withhold nothing they cannot already open. The root is reachable by
// anybody who may open one of its registers, which is the heading rule
// `sectionViewable` already applies.
//
// EVERY BLOCK IS GATED BY THE RIGHT OVER ITS OWN RECORDS, and a register the
// reader may not open is NEVER READ — customer 360's rule, Procurement's and
// Maintenance's. `may` travels with the answer so the screen draws a block only
// where it is true, and an absent block reads as "not yours" rather than "none".
import { requirePermission, engineSectionKey, type PermissionKey } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import type { EngineRecord } from "@/platform/engine/schema";
import type { QualityDocument, QualityRevision } from "@/modules/quality/types";
import { moduleContext, type ModuleContext } from "../context";
import type { Section } from "@/platform/db/sections";
import {
  documentFigures, rfiFigures, submittalFigures, countStatus, attention,
} from "./model";

const Docs = repo<QualityDocument>("qualityDocuments");
const Revisions = repo<QualityRevision>("qualityRevisions");
const Records = repo<EngineRecord>("engineRecords");

/** The five built-in registers this dashboard reads, by type key. */
export const ENGINEERING_TYPES = ["transmittal", "rfi", "submittal", "ebom", "techlib"] as const;
type EngineeringType = (typeof ENGINEERING_TYPES)[number];

export type EngineeringContext = ModuleContext & {
  registerSection: Section;
} & Record<`${EngineeringType}Section`, Section>;

// THE REGISTERS ARE `sub`, so the view guard asks about them: somebody holding
// only `engine.rfi.view` reaches the root, which a prefix search from
// `engineering-docs` would not find (an engine section's key starts `engine-`).
export const engineeringContext = moduleContext<EngineeringContext>({
  root: "engineering-docs",
  sub: {
    register: "engineering-docs-register",
    ...Object.fromEntries(ENGINEERING_TYPES.map((t) => [t, engineSectionKey(t)])),
  },
});

const monthsBack = (n: number, asOf: string) => {
  const d = new Date(`${asOf}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (n - 1 - i), 1)).toISOString().slice(0, 7));
};

export async function engineeringDashboard(ctx: EngineeringContext) {
  const may = (key: string) => !requirePermission(ctx.access, key as PermissionKey);
  // A SUB-SECTION FALLS BACK TO THE ROOT WHEN IT IS ABSENT, which is what keeps
  // every module context safe — and would make "read the RFI register" read the
  // root's rows here. A register counts only when its own row exists.
  const own = (name: string, key: string): Section | null => {
    const s = (ctx as unknown as Record<string, Section | undefined>)[`${name}Section`];
    return s && s.key === key ? s : null;
  };
  const register = own("register", "engineering-docs-register");
  const sectionOf = Object.fromEntries(ENGINEERING_TYPES.map((t) => [t, own(t, engineSectionKey(t))])) as
    Record<EngineeringType, Section | null>;

  const blocks = {
    documents: Boolean(register) && may("engineeringDocs.register.view"),
    ...Object.fromEntries(ENGINEERING_TYPES.map((t) => [t, Boolean(sectionOf[t]) && may(`engine.${t}.view`)])),
  } as { documents: boolean } & Record<EngineeringType, boolean>;

  const asOf = new Date().toISOString().slice(0, 10);
  const months = monthsBack(6, asOf);
  const readType = (t: EngineeringType) => (blocks[t] && sectionOf[t]
    ? Records.find({ studio: ctx.studio, section: sectionOf[t] as Section }, { where: { typeKey: t } })
    : Promise.resolve([] as EngineRecord[]));

  const [docs, revisions, transmittals, rfis, submittals, eboms, library] = await Promise.all([
    blocks.documents && register ? Docs.find({ studio: ctx.studio, section: register }) : Promise.resolve([] as QualityDocument[]),
    blocks.documents && register ? Revisions.find({ studio: ctx.studio, section: register }) : Promise.resolve([] as QualityRevision[]),
    readType("transmittal"),
    readType("rfi"),
    readType("submittal"),
    readType("ebom"),
    readType("techlib"),
  ]);

  const documents = documentFigures(docs, revisions, asOf, ctx.collaborator.id);
  const rfi = rfiFigures(rfis, asOf, months);
  const submittal = submittalFigures(submittals, asOf);

  return {
    asOf,
    months,
    may: blocks,
    documents: blocks.documents ? documents : null,
    rfi: blocks.rfi ? { ...rfi, late: undefined } : null,
    submittal: blocks.submittal ? { ...submittal, late: undefined } : null,
    transmittal: blocks.transmittal
      ? { total: transmittals.length, awaitingAcknowledgement: countStatus(transmittals, "Issued"), draft: countStatus(transmittals, "Draft") }
      : null,
    ebom: blocks.ebom
      ? { total: eboms.length, inReview: countStatus(eboms, "In review"), released: countStatus(eboms, "Released") }
      : null,
    library: blocks.techlib
      ? { total: library.length, current: countStatus(library, "Current"), withdrawn: countStatus(library, "Withdrawn") }
      : null,
    // THE LATE ITEMS BY NAME, only from the registers the reader may open: each
    // list was built from rows that were read only because the right is held.
    attention: attention(blocks.rfi ? rfi.late : [], blocks.submittal ? submittal.late : []),
  };
}
