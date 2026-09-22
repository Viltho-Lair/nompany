// CLIENT TAGS — how a studio groups the people it sells to (22/09/2026, the
// owner: "add a tags field to the client, but what type of tags will it have
// and where will they come from? i don't want it hardcoded, there can be
// default but can be changed/renamed").
//
// A REGISTER, NOT A TAXONOMY, AND THAT IS THE WHOLE DESIGN DECISION. A
// taxonomy (`./taxonomy`) is additions-only for a good reason: its values are
// stored BY NAME on the records that use them, so renaming "Annual" would
// strand every leave request naming it. A tag is stored BY ID — a client
// carries `tagIds`, an offer's eligibility carries `tagIds` — so the name is
// free to change and nothing follows it. That is what makes "changed/renamed"
// possible at all, and it is why this is a collection rather than a list in
// Studio settings.
//
// SEEDED ON READ, NEVER OVERWRITTEN. A new studio meets a handful of tags a
// shop actually uses rather than an empty box; renaming one keeps it, deleting
// one does not bring it back, and a studio that has deleted them all stays
// empty — the seed runs when the register has NEVER been written, not whenever
// it happens to be empty. `seededAt` on the section is what tells the two
// apart; without it a deleted register would resurrect itself on the next read.
//
// DELETING A TAG DOES NOT UNTAG ANYBODY. A client keeps the id, an offer keeps
// the id, and both simply stop resolving to a name — the same containment
// `projectBilling` uses for a deleted milestone: a reader that attributes only
// what it can see is safe against deletion in a way no write-time check is.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { updateSection } from "@/platform/db/sections";
import type { MasterContext } from "./types";

/** One tag: an id nothing may reuse, and a name the studio may change at will. */
export type ClientTag = {
  id: string;
  name: string;
  nameAr?: string;
  /** A hint for a chip's colour. Absent is the neutral one. */
  colour?: string;
  createdAt: string;
};

const Tags = repo<ClientTag>("clientTags");
const str = (v: unknown, max = 60) => String(v ?? "").trim().slice(0, max);

/**
 * WHAT A NEW STUDIO STARTS WITH. Six, chosen because a counter can act on each
 * of them — an offer for staff, an offer for a wholesale buyer, an offer for
 * somebody who has not been in for a year. None of them is a kind of business,
 * which is the owner's standing rule for wording a question a studio answers.
 */
export const SEED_TAGS: readonly { name: string; nameAr: string; colour: string }[] = [
  { name: "Regular", nameAr: "منتظم", colour: "emerald" },
  { name: "VIP", nameAr: "مميز", colour: "amber" },
  { name: "Wholesale", nameAr: "جملة", colour: "sky" },
  { name: "Staff", nameAr: "موظف", colour: "violet" },
  { name: "Lapsed", nameAr: "منقطع", colour: "slate" },
  { name: "Card only", nameAr: "بالبطاقة فقط", colour: "rose" },
];

/**
 * Every tag, named. Seeds the starter set the FIRST time the register is read
 * and never again — see the header on why "empty" is not the condition.
 */
export async function listClientTags(
  ctx: Pick<MasterContext, "studio" | "section">,
): Promise<ClientTag[]> {
  const { studio, section } = ctx;
  const rows = await Tags.find({ studio, section });
  const seeded = Boolean((section as { settings?: { clientTagsSeededAt?: unknown } }).settings?.clientTagsSeededAt);
  if (rows.length || seeded) return [...rows].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const at = new Date().toISOString();
  const made = await Tags.createMany({ studio, section }, SEED_TAGS.map((t) => ({
    name: t.name, nameAr: t.nameAr, colour: t.colour, createdAt: at,
  })) as unknown as Record<string, unknown>[]);
  // MARKED BEFORE ANYBODY CAN DELETE ONE. A studio that clears the register on
  // its first afternoon must not find it back the next morning.
  await updateSection(studio.id, section.id, {
    settings: { ...(section.settings || {}), clientTagsSeededAt: at },
  });
  return [...made].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function createClientTag(ctx: MasterContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "administration.master.create");
  if (denied) return denied;
  const name = str(body?.name);
  if (!name) return { error: "name" as const };
  const rows = await Tags.find({ studio: ctx.studio, section: ctx.section });
  // TWO TAGS WITH ONE NAME ARE TWO TAGS NOBODY CAN TELL APART on a picker, and
  // there is no unique index in this store to lean on, so this is the check.
  if (rows.some((t) => t.name.toLowerCase() === name.toLowerCase())) return { error: "duplicate" as const };
  const tag = await Tags.create({ studio: ctx.studio, section: ctx.section }, {
    name,
    nameAr: str(body?.nameAr),
    colour: str(body?.colour, 20),
    createdAt: new Date().toISOString(),
  } as unknown as ClientTag);
  return { tag };
}

/** Rename or recolour a tag. Its id does not move, so nothing carrying it changes. */
export async function editClientTag(ctx: MasterContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "administration.master.edit");
  if (denied) return denied;
  const name = body?.name === undefined ? undefined : str(body.name);
  if (name !== undefined && !name) return { error: "name" as const };
  if (name) {
    const rows = await Tags.find({ studio: ctx.studio, section: ctx.section });
    if (rows.some((t) => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) {
      return { error: "duplicate" as const };
    }
  }
  const updated = await Tags.update({ studio: ctx.studio, section: ctx.section }, String(id || ""), (row) => ({
    ...row,
    ...(name !== undefined ? { name } : {}),
    ...(body?.nameAr !== undefined ? { nameAr: str(body.nameAr) } : {}),
    ...(body?.colour !== undefined ? { colour: str(body.colour, 20) } : {}),
  }));
  return updated ? { tag: updated } : { error: "notfound" as const };
}

/**
 * Delete a tag. NOTHING IS UNTAGGED — see the header. A client and an offer
 * both keep the id and stop resolving it, which is deliberate: sweeping every
 * client on a delete would be a write across a collection this module does not
 * own, and a half-finished sweep is worse than an unresolved id.
 */
export async function removeClientTag(ctx: MasterContext, id: string) {
  const denied = requirePermission(ctx.access, "administration.master.delete");
  if (denied) return denied;
  const gone = await Tags.remove({ studio: ctx.studio, section: ctx.section }, String(id || ""));
  return gone ? { ok: true as const } : { error: "notfound" as const };
}
