// THE RATE LIBRARY — what the studio charges for a unit of work.
//
// WHY IT IS THE STUDIO'S AND NOT A TENDER'S. The point of keeping a library is
// that the next bid does not re-invent a number somebody already worked out,
// and does not quietly disagree with the last one. A rate that lived on a
// tender would be a rate used once.
//
// APPLIED BY COPY, NEVER BY REFERENCE. Putting a library rate on a BOQ line
// copies the number onto the line and keeps `rateId` beside it for provenance
// only. A bill is a document somebody was given; re-reading it from today's
// library would rewrite what was bid last month, which is the same rule a
// quotation line already follows.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import type { TenderRate } from "./schema";
import type { TenderingContext } from "./types";

const Rates = repo<TenderRate>("tenderRates");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};
const now = () => new Date().toISOString();

/** Case-insensitive, so "EX-01" and "ex-01" are one code rather than two rates. */
const sameCode = (a: unknown, b: unknown) =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

export async function listRates(ctx: TenderingContext) {
  const denied = requirePermission(ctx.access, "tendering.rates.view");
  if (denied) return denied;

  const { studio, ratesSection } = ctx;
  const rows = await Rates.find({ studio, section: ratesSection });
  return {
    rates: [...rows].sort((a, b) =>
      (a.category || "").localeCompare(b.category || "")
      || (a.code || "").localeCompare(b.code || "")),
  };
}

export async function createRate(ctx: TenderingContext, body: Record<string, unknown>) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN — routes get added and
  // forgotten; the function that does the work cannot be reached around.
  const denied = requirePermission(ctx.access, "tendering.rates.create");
  if (denied) return denied;

  const { studio, ratesSection, collaborator } = ctx;
  const code = str(body?.code, 40);
  if (!code) return { error: "code" };
  const description = str(body?.description, 500);
  if (!description) return { error: "description" };

  // A LIBRARY WITH TWO ROWS FOR ONE CODE IS NOT A LIBRARY. The code is how an
  // estimator finds a rate and how a bill records which one it used, so a
  // duplicate makes both ambiguous.
  const rows = await Rates.find({ studio, section: ratesSection });
  if (rows.some((r) => sameCode(r.code, code))) return { error: "duplicate" };

  const rate = await Rates.create({ studio, section: ratesSection }, {
    code,
    description,
    unit: str(body?.unit, 24),
    rate: money(body?.rate),
    category: str(body?.category, 120),
    notes: str(body?.notes, 1000),
    createdByCollaboratorId: collaborator?.id || "",
    createdAt: now(),
    updatedAt: now(),
  });
  return { rate };
}

export async function editRate(ctx: TenderingContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "tendering.rates.edit");
  if (denied) return denied;

  const { studio, ratesSection } = ctx;
  const patch: Record<string, unknown> = {};

  if (body?.code !== undefined) {
    const code = str(body.code, 40);
    if (!code) return { error: "code" };
    const rows = await Rates.find({ studio, section: ratesSection });
    if (rows.some((r) => r.id !== id && sameCode(r.code, code))) return { error: "duplicate" };
    patch.code = code;
  }
  if (body?.description !== undefined) {
    const v = str(body.description, 500);
    if (!v) return { error: "description" };
    patch.description = v;
  }
  if (body?.unit !== undefined) patch.unit = str(body.unit, 24);
  // EDITING A RATE DOES NOT REPRICE ANYTHING. Every bill that used it copied the
  // number at the time, so this changes what the NEXT bid starts from and
  // touches no document already written.
  if (body?.rate !== undefined) patch.rate = money(body.rate);
  if (body?.category !== undefined) patch.category = str(body.category, 120);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 1000);
  patch.updatedAt = now();

  const rate = await Rates.update({ studio, section: ratesSection }, id, patch);
  return rate ? { rate } : { error: "notfound" };
}

/**
 * A LIBRARY ROW IS A REFERENCE, AND DELETING ONE BREAKS NOTHING.
 *
 * Bills that used it kept the number, not a pointer — so a deleted rate leaves
 * `rateId` on old lines naming something that no longer exists, and those lines
 * still read and total correctly. That is the point of copying: the library is
 * a starting place, not a dependency.
 */
export async function removeRate(ctx: TenderingContext, id: string) {
  const denied = requirePermission(ctx.access, "tendering.rates.delete");
  if (denied) return denied;

  const { studio, ratesSection } = ctx;
  const gone = await Rates.remove({ studio, section: ratesSection }, id);
  return gone ? { ok: true } : { error: "notfound" };
}
