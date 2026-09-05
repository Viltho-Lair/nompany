// ONE TENDER'S BILL OF QUANTITIES — the lines, and what they add up to.
//
// GUARDED BY `tendering.tenders`, not by a right of its own, and that is a
// decision rather than an omission. The bill IS the tender's content: somebody
// who may read a tender may read what it is made of, and somebody who may edit
// one may price it. A separate right would be a second answer to "who works on
// this tender", free to disagree with the first — and a right that gates
// nothing a person can reach without the tender right is one nobody could
// exercise on its own anyway.
//
// The arithmetic lives in ./boq, which is pure, so the grid totals with the
// same function the server does.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { boqTotals } from "./boq";
import type { BoqItem, Tender } from "./schema";
import type { TenderingContext } from "./types";

const Items = repo<BoqItem>("boqItems");
const Tenders = repo<Tender>("tenders");

/** Only the field the freeze reads. Projects holds a great deal more. */
const Projects = repo<{ id: string; tenderId?: string }>("projects");

/**
 * A BILL IS FROZEN ONCE ITS TENDER HAS BEEN HANDED OVER.
 *
 * WHY, and it is the defect `handover.md` recorded rather than a new rule: the
 * project's `value` is COPIED at handover and its sheets follow the bill LIVE.
 * So a line edited afterwards moves the sheet the buyers work from and leaves
 * the project's headline figure where it was — two numbers for one job, with
 * nothing saying they had ever agreed. Freezing is the answer that needs no
 * second number to keep in step.
 *
 * DERIVED FROM THE PROJECTS, not from a flag on the tender, for the reason
 * `handover.ts` states at length: a flag would be a second answer free to
 * disagree with the projects it describes, and deriving it means deleting the
 * project genuinely thaws the bill rather than leaving it locked forever
 * against work nobody is doing.
 *
 * THE COST IS ONE NARROWED READ PER WRITE, and it is paid deliberately. The
 * grid saves a cell at a time, so this is the busiest write in the section —
 * but `where` narrows to one tender's projects rather than fetching the list,
 * and a wrong number carried into a project is not something a round trip is
 * worth saving.
 *
 * A STUDIO WITH NO PROJECTS SECTION CANNOT HAVE HANDED ANYTHING OVER, so it
 * pays nothing at all.
 */
async function handedOver(ctx: TenderingContext, tenderId: string): Promise<boolean> {
  const { studio, projectsListSection } = ctx;
  if (!projectsListSection || !tenderId) return false;
  const rows = await Projects.find({ studio, section: projectsListSection }, { where: { tenderId } });
  return rows.length > 0;
}

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10000) / 10000 : 0;
};
const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};
const now = () => new Date().toISOString();

/** The bill for one tender, in the document's own order. */
export async function listBoq(ctx: TenderingContext, tenderId: string) {
  const denied = requirePermission(ctx.access, "tendering.tenders.view");
  if (denied) return denied;
  if (!tenderId) return { error: "missing" };

  const { studio, registerSection } = ctx;
  const [tender, rows] = await Promise.all([
    Tenders.byId({ studio, section: registerSection }, tenderId),
    // WHERE IS DATA, NOT A PREDICATE — repo's declared vocabulary, so this
    // narrows to one tender's lines the way a SQL WHERE will.
    Items.find({ studio, section: registerSection }, { where: { tenderId } }),
  ]);
  if (!tender) return { error: "notfound" };

  const lines = [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return {
    tender,
    lines,
    // SO THE GRID CAN GO READ-ONLY rather than offering edits the server will
    // refuse. Read here, on the one call the screen already makes, instead of
    // the screen inferring it from the handover block beside it — which would
    // be the screen deciding a rule the server owns.
    frozen: await handedOver(ctx, tenderId),
    // TOTALS FROM THE SERVER TOO, not only from the grid. The bid figure is
    // read by things that are not this screen — and `complete` is the half that
    // matters: a total over a part-priced bill is a number, not the bid.
    totals: boqTotals(lines),
  };
}

export async function addBoqLine(ctx: TenderingContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "tendering.tenders.edit");
  if (denied) return denied;

  const { studio, registerSection } = ctx;
  const tenderId = str(body?.tenderId, 60);
  if (!tenderId) return { error: "missing" };
  const description = str(body?.description, 1000);
  if (!description) return { error: "description" };

  // THE LINE MUST BELONG TO A TENDER THAT EXISTS. Without this a crafted
  // request mints orphan lines that no screen shows and no cascade removes.
  const tender = await Tenders.byId({ studio, section: registerSection }, tenderId);
  if (!tender) return { error: "notfound" };

  // ADDING A LINE AFTER THE HANDOVER changes the baseline as much as editing
  // one: it puts work on the sheet the buyers read that the project was never
  // opened at.
  if (await handedOver(ctx, tenderId)) return { error: "handed-over" };

  const existing = await Items.find({ studio, section: registerSection }, { where: { tenderId } });
  const item = await Items.create({ studio, section: registerSection }, {
    tenderId,
    group: str(body?.group, 120),
    code: str(body?.code, 40),
    description,
    unit: str(body?.unit, 24),
    qty: num(body?.qty),
    rate: money(body?.rate),
    rateId: str(body?.rateId, 60),
    notes: str(body?.notes, 1000),
    // APPENDED AT THE END of the bill as it stands. A bill is issued in an
    // order and read against the client's own document, so a new line goes
    // where it was added rather than being sorted into place.
    sortOrder: existing.length,
    createdAt: now(),
    updatedAt: now(),
  });
  return { item };
}

export async function editBoqLine(ctx: TenderingContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "tendering.tenders.edit");
  if (denied) return denied;

  const { studio, registerSection } = ctx;

  // THE LINE IS READ TO LEARN WHOSE BILL IT IS. `editBoqLine` used to write
  // without reading anything; the freeze needs the tender, and only the line
  // knows it — taking `tenderId` off the body would be trusting the caller with
  // the guard that is supposed to refuse them.
  const current = await Items.byId({ studio, section: registerSection }, id);
  if (!current) return { error: "notfound" };
  if (await handedOver(ctx, String(current.tenderId || ""))) return { error: "handed-over" };

  const patch: Record<string, unknown> = {};

  if (body?.description !== undefined) {
    const v = str(body.description, 1000);
    if (!v) return { error: "description" };
    patch.description = v;
  }
  if (body?.group !== undefined) patch.group = str(body.group, 120);
  if (body?.code !== undefined) patch.code = str(body.code, 40);
  if (body?.unit !== undefined) patch.unit = str(body.unit, 24);
  if (body?.qty !== undefined) patch.qty = num(body.qty);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 1000);
  if (body?.sortOrder !== undefined) patch.sortOrder = num(body.sortOrder);

  // THE RATE AND WHERE IT CAME FROM MOVE TOGETHER. A rate typed over one taken
  // from the library is no longer that library rate, and leaving `rateId`
  // behind would claim a provenance the number no longer has.
  if (body?.rate !== undefined) {
    patch.rate = money(body.rate);
    patch.rateId = body?.rateId !== undefined ? str(body.rateId, 60) : "";
  } else if (body?.rateId !== undefined) {
    patch.rateId = str(body.rateId, 60);
  }
  patch.updatedAt = now();

  const item = await Items.update({ studio, section: registerSection }, id, patch);
  return item ? { item } : { error: "notfound" };
}

export async function removeBoqLine(ctx: TenderingContext, id: string) {
  const denied = requirePermission(ctx.access, "tendering.tenders.edit");
  if (denied) return denied;

  const { studio, registerSection } = ctx;
  // DELETE ANSWERS TO `edit`, NOT TO `tendering.tenders.delete`. Removing a
  // line is editing the bill; the delete verb is about erasing a TENDER, which
  // is a different act with a different rule (it is refused once the bid is in).
  const current = await Items.byId({ studio, section: registerSection }, id);
  if (!current) return { error: "notfound" };
  // AND REMOVING ONE AFTER THE HANDOVER takes work off the sheet the buyers
  // are working from, which is the same drift from the other direction.
  if (await handedOver(ctx, String(current.tenderId || ""))) return { error: "handed-over" };

  const gone = await Items.remove({ studio, section: registerSection }, id);
  return gone ? { ok: true } : { error: "notfound" };
}
