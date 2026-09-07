// THE TYPES EVERY STUDIO GETS, seeded at creation.
//
// PHASE 1 SHIPS ONE, deliberately. The engine's value is proven by a type that
// is real rather than by a demonstration: transmittals are named in the
// programme spec's P5 as engine-driven, and Engineering & Documents already
// exists as a section to plant under.
//
// `origin: "builtin"` is what stops a studio editing it. Tenant-declared types
// come in phase 3 and are not this.
import { repo } from "@/platform/db/repo";
import { getSectionByKey } from "@/platform/db/sections";
import { engineSectionKey } from "@/platform/access";
import { plantTypeSection } from "./sections";
import type { RecordType } from "./schema";

export const BUILTIN_TYPES = [
  {
    key: "transmittal",
    label: "Transmittals",
    parentSectionKey: "engineering-docs",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "recipient", label: "Recipient", kind: "text" },
      { key: "issuedOn", label: "Issued", kind: "date" },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["title", "recipient", "issuedOn"],
    statuses: ["Draft", "Issued", "Acknowledged"],
    transitions: [
      { from: "Draft", to: "Issued" },
      { from: "Issued", to: "Acknowledged" },
    ],
    version: 1,
  },
] as const;

const Types = repo<RecordType>("recordTypes");

/**
 * SEEDED, AND NEVER OVERWRITING. A studio that already has a type keeps it —
 * the same courtesy `nextPool` extends to service actions and the departments
 * register extends to a trade's chart.
 *
 * THE SECTION IS PLANTED FIRST and the type row written second. A type whose
 * section does not exist would serve records into a sub-section that falls back
 * to its root, where nothing reads them.
 *
 * A TYPE WHOSE PARENT SECTION IS ABSENT IS SKIPPED WHOLE, not planted at the
 * root: `plantTypeSection` answers null for exactly that case, and writing the
 * type row anyway would leave a type serving records into a section that does
 * not exist — the tender register's mistake, one layer up.
 *
 * The declaration is spread into fresh arrays because `BUILTIN_TYPES` is `as
 * const`: what is stored is a mutable copy of the seed, so a studio's row is
 * its own from the moment it is written rather than a view onto a frozen
 * literal shared by every tenant in the process.
 */
export async function seedBuiltinTypes(studioId: string): Promise<void> {
  const settings = await getSectionByKey(studioId, "administration-settings");
  if (!settings) return;
  const scope = { studio: { id: studioId }, section: settings };
  const existing = await Types.find(scope);

  for (const decl of BUILTIN_TYPES) {
    if (existing.some((t) => t.key === decl.key)) continue;
    const section = await plantTypeSection(studioId, decl);
    if (!section) continue;
    const at = new Date().toISOString();
    await Types.create(scope, {
      ...decl,
      fields: decl.fields.map((f) => ({ ...f })),
      columns: [...decl.columns],
      statuses: [...decl.statuses],
      transitions: decl.transitions.map((t) => ({ ...t })),
      sectionKey: engineSectionKey(decl.key),
      origin: "builtin",
      createdAt: at,
      updatedAt: at,
    });
  }
}
