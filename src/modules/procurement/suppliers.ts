// THE SUPPLIER REGISTER — who the studio may buy from, and how they have
// actually performed.
//
// GUARDED BY `procurement.suppliers`, whose `qualify` verb is an extra:
// correcting a supplier's phone number and saying the company may commit money
// to them are different powers. Rating is NOT a second right — see the note on
// the area in the catalogue.
//
// THE ARITHMETIC IS IN ./supplierModel and nothing is decided here. In
// particular the qualification state is never STORED: only what a person
// decided is written, and what that amounts to today is computed at `asOf`,
// because a trade licence expires with no business event to notice.
//
// THE SUPPLIER RECORD IS INVENTORY'S `inventoryVendors`, unmoved. Its CRUD
// stays in modules/inventory/inventory.ts and is not duplicated here — this
// file writes the assessment fields and owns the scorecards, and reads the rest.
// The register would otherwise be a second create path for the same row, which
// is how two shapes of one record start disagreeing.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import {
  supplierPosition, assessmentProblem, documentProblem, scorecardProblem,
  APPROVAL_STATUSES, SCORE_AXES,
} from "./supplierModel";
import type { SupplierScorecard } from "./supplierSchema";
import type { ProcurementContext } from "./types";
import type { Vendor, Order } from "@/modules/inventory/schema";

const Vendors = repo<Vendor>("inventoryVendors");
const Scorecards = repo<SupplierScorecard>("supplierScorecards");
const Orders = repo<Order>("materialOrders");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => str(v, 10);
const now = () => new Date().toISOString();

/** 1-5, or "" where nobody scored that axis. A blank and a one are different answers. */
const score = (v: unknown): number | "" => {
  if (v === "" || v === null || v === undefined) return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
};

type StoredDocument = {
  kind: string; reference: string; issuedAt: string; expiresAt: string; mediaId: string;
};

function cleanDocuments(raw: unknown): StoredDocument[] {
  return (Array.isArray(raw) ? raw : [])
    .slice(0, 50)
    .map((d) => ({
      kind: str((d as StoredDocument)?.kind, 80),
      reference: str((d as StoredDocument)?.reference, 120),
      issuedAt: day((d as StoredDocument)?.issuedAt),
      expiresAt: day((d as StoredDocument)?.expiresAt),
      mediaId: str((d as StoredDocument)?.mediaId, 120),
    }))
    // A DOCUMENT WITH NO KIND IS NOT ONE. Dropped rather than stored as a blank
    // row with an expiry date that would quietly lapse a supplier.
    .filter((d) => Boolean(d.kind));
}

export async function listSuppliers(ctx: ProcurementContext) {
  const denied = requirePermission(ctx.access, "procurement.suppliers.view");
  if (denied) return denied;

  const { studio, suppliersSection, ordersSection } = ctx;
  const [rows, scorecards, orders, people] = await Promise.all([
    Vendors.find({ studio, section: suppliersSection }),
    Scorecards.find({ studio, section: suppliersSection }),
    // A STUDIO WITH NO INVENTORY SECTION HAS NO ORDERS, and that is a real
    // answer rather than an error: the register still shows qualification, and
    // on-time reads null the way it does for a supplier nobody has bought from.
    ordersSection ? Orders.find({ studio, section: ordersSection }) : Promise.resolve([]),
    listCollaborators(studio.id),
  ]);
  const aliasOf = new Map(
    (people as { id?: unknown; alias?: unknown }[])
      .map((c) => [String(c?.id ?? ""), String(c?.alias ?? "")] as const),
  );

  // WHEN THIS ANSWER WAS TRUE. Every expiry comparison is against this instant
  // and not the browser's, so the screen never reads its own clock — the same
  // rule the expediting and subcontract registers follow.
  const asOf = now();
  const today = asOf.slice(0, 10);

  const suppliers = [...rows]
    .map((v) => ({
      ...v,
      approvedByAlias: aliasOf.get(String(v.approvedByCollaboratorId || "")) || "",
      position: supplierPosition(v, orders, scorecards, today),
      scorecards: scorecards
        .filter((s) => s.vendorId === v.id)
        .sort((a, b) => String(b.periodEnd || "").localeCompare(String(a.periodEnd || "")))
        .map((s) => ({ ...s, byAlias: aliasOf.get(String(s.byCollaboratorId || "")) || "" })),
    }))
    // BLOCKED AND LAPSED FIRST, then by name. A register sorted alphabetically
    // hides the two states that stop an order behind whatever happens to begin
    // with A, and those are the only rows anybody has to act on.
    .sort((a, b) => {
      const rank = (u: boolean) => (u ? 1 : 0);
      const d = rank(a.position.qualification.usable) - rank(b.position.qualification.usable);
      return d || (a.name || "").localeCompare(b.name || "");
    });

  return {
    suppliers,
    asOf,
    statuses: APPROVAL_STATUSES,
    axes: SCORE_AXES,
    canCreate: !requirePermission(ctx.access, "procurement.suppliers.create"),
    canEdit: !requirePermission(ctx.access, "procurement.suppliers.edit"),
    canDelete: !requirePermission(ctx.access, "procurement.suppliers.delete"),
    canQualify: !requirePermission(ctx.access, "procurement.suppliers.qualify"),
  };
}

/**
 * APPROVE, SUSPEND OR REJECT A SUPPLIER.
 *
 * Guarded by `qualify` alone and NOT by `edit` first: somebody who may assess a
 * supplier does not thereby get to rewrite their bank details, and requiring
 * both would make the extra a rung on the ladder, which is the thing it was
 * minted to avoid.
 */
export async function assessSupplier(ctx: ProcurementContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "procurement.suppliers.qualify");
  if (denied) return denied;

  const { studio, suppliersSection, collaborator } = ctx;
  const id = str(body?.id, 60);
  const status = str(body?.status, 20);
  const reason = str(body?.reason, 1000);

  const problem = assessmentProblem(status, reason);
  if (problem) return { error: problem };

  const rows = await Vendors.find({ studio, section: suppliersSection });
  const vendor = rows.find((v) => v.id === id);
  if (!vendor) return { error: "notfound" };

  const at = now();
  const supplier = await Vendors.update({ studio, section: suppliersSection }, id, (row) => ({
    ...row,
    approvalStatus: status,
    approvalReason: reason,
    // STAMPED ON EVERY DECISION, INCLUDING UNASSESSED. Sending a supplier back
    // to unassessed is itself a decision somebody made, and clearing the stamp
    // would leave a record that reads as though nobody ever looked.
    approvedAt: at,
    approvedByCollaboratorId: collaborator.id,
  }));

  return { supplier };
}

/**
 * THE SUPPLIER'S PAPERWORK. The whole list is replaced rather than patched a
 * row at a time: there are a handful of these, they are edited in one dialog,
 * and a per-row endpoint would need an id on a shape that has never had one.
 */
export async function saveSupplierDocuments(ctx: ProcurementContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "procurement.suppliers.qualify");
  if (denied) return denied;

  const { studio, suppliersSection } = ctx;
  const id = str(body?.id, 60);
  const documents = cleanDocuments(body?.documents);
  for (const doc of documents) {
    const problem = documentProblem(doc);
    if (problem) return { error: problem };
  }

  const rows = await Vendors.find({ studio, section: suppliersSection });
  if (!rows.some((v) => v.id === id)) return { error: "notfound" };

  const supplier = await Vendors.update({ studio, section: suppliersSection }, id, (row) => ({
    ...row,
    documents,
  }));
  return { supplier };
}

/**
 * A PERIOD'S OPINION. Guarded by `edit` rather than `qualify`: the person who
 * can say a delivery was poor is whoever received it, and putting that behind
 * the governance right would mean the only people able to write a scorecard are
 * the ones who never see the goods.
 */
export async function addScorecard(ctx: ProcurementContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "procurement.suppliers.edit");
  if (denied) return denied;

  const { studio, suppliersSection, collaborator } = ctx;
  const vendorId = str(body?.vendorId, 60);
  const card = {
    vendorId,
    periodEnd: day(body?.periodEnd),
    workmanship: score(body?.workmanship),
    hse: score(body?.hse),
    responsiveness: score(body?.responsiveness),
    note: str(body?.note, 2000),
    projectId: str(body?.projectId, 60),
  };
  const problem = scorecardProblem(card);
  if (problem) return { error: problem };

  const rows = await Vendors.find({ studio, section: suppliersSection });
  if (!rows.some((v) => v.id === vendorId)) return { error: "notfound" };

  return {
    scorecard: await Scorecards.create({ studio, section: suppliersSection }, {
      ...card,
      byCollaboratorId: collaborator.id,
      createdAt: now(),
    }),
  };
}

export async function editScorecard(ctx: ProcurementContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "procurement.suppliers.edit");
  if (denied) return denied;

  const { studio, suppliersSection } = ctx;
  const id = str(body?.id, 60);
  const rows = await Scorecards.find({ studio, section: suppliersSection });
  const existing = rows.find((s) => s.id === id);
  if (!existing) return { error: "notfound" };

  const merged = {
    ...existing,
    periodEnd: body?.periodEnd === undefined ? existing.periodEnd : day(body.periodEnd),
    workmanship: body?.workmanship === undefined ? existing.workmanship : score(body.workmanship),
    hse: body?.hse === undefined ? existing.hse : score(body.hse),
    responsiveness: body?.responsiveness === undefined
      ? existing.responsiveness : score(body.responsiveness),
    note: body?.note === undefined ? existing.note : str(body.note, 2000),
  };
  const problem = scorecardProblem(merged);
  if (problem) return { error: problem };

  return {
    scorecard: await Scorecards.update({ studio, section: suppliersSection }, id, (row) => ({
      ...row,
      periodEnd: merged.periodEnd,
      workmanship: merged.workmanship,
      hse: merged.hse,
      responsiveness: merged.responsiveness,
      note: merged.note,
    })),
  };
}

export async function removeScorecard(ctx: ProcurementContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "procurement.suppliers.edit");
  if (denied) return denied;

  const { studio, suppliersSection } = ctx;
  const id = str(body?.id, 60);
  const rows = await Scorecards.find({ studio, section: suppliersSection });
  if (!rows.some((s) => s.id === id)) return { error: "notfound" };

  await Scorecards.remove({ studio, section: suppliersSection }, id);
  return { removed: id };
}
