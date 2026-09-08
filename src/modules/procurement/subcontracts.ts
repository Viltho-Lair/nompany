// SUBCONTRACTS AND PAYMENT CERTIFICATES — what a trade package is worth, what
// has been valued, what is held back and what is deducted.
//
// GUARDED BY `procurement.subcontracts`, whose `certify` verb is an extra:
// writing a valuation is administration and AGREEING it creates a debt, which
// is the same separation `procurement.requisitions.approve` draws.
//
// THE ARITHMETIC IS IN ./subcontractModel, which reuses `retentionOn` from
// modules/projects/billing rather than restating what a percentage means.
import { requirePermission } from "@/platform/access";
import { seriesSetting } from "@/modules/administration/numbering";
import { repo } from "@/platform/db/repo";
import { nextReference } from "@/modules/main/references";
import { listCollaborators } from "@/platform/auth/collaborators";
import {
  subcontractPosition, certificateProblem, isCounted,
  SUBCONTRACT_STATUSES, backChargeIsReal,
} from "./subcontractModel";
import type { Subcontract, PaymentCertificate, BackCharge } from "./subcontractSchema";
import type { ProcurementContext } from "./types";

const Subcontracts = repo<Subcontract>("subcontracts");
const Certificates = repo<PaymentCertificate>("paymentCertificates");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => str(v, 10);
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const pct = (v: unknown) => Math.min(100, Math.max(0, num(v)));
const now = () => new Date().toISOString();

function cleanBackCharges(raw: unknown): BackCharge[] {
  return (Array.isArray(raw) ? raw : [])
    // A DEDUCTION WITH NO REASON IS NOT ONE ANYBODY CAN ANSWER, so a row with
    // no description is dropped rather than stored as an unexplained number
    // against a subcontractor's money.
    .filter(backChargeIsReal)
    .map((b) => ({
      description: str((b as BackCharge).description, 400),
      amount: num((b as BackCharge).amount),
    }));
}

/** The last COUNTED certificate's cumulative — what a new one must not go below. */
function lastCounted(certificates: readonly PaymentCertificate[]): number {
  const counted = [...certificates]
    .filter(isCounted)
    .sort((a, b) => String(a.periodEnd || "").localeCompare(String(b.periodEnd || "")));
  return counted.length ? num(counted[counted.length - 1].cumulativeValue) : 0;
}

export async function listSubcontracts(ctx: ProcurementContext) {
  const denied = requirePermission(ctx.access, "procurement.subcontracts.view");
  if (denied) return denied;

  const { studio, subcontractsSection } = ctx;
  const [rows, certificates, people] = await Promise.all([
    Subcontracts.find({ studio, section: subcontractsSection }),
    Certificates.find({ studio, section: subcontractsSection }),
    listCollaborators(studio.id),
  ]);
  const aliasOf = new Map(
    (people as { id?: unknown; alias?: unknown }[])
      .map((c) => [String(c?.id ?? ""), String(c?.alias ?? "")] as const),
  );

  // WHEN THIS ANSWER WAS TRUE. Retention release is a comparison against an
  // instant and it is this one, so the screen never reads its own clock.
  const asOf = now();
  const byContract = new Map<string, PaymentCertificate[]>();
  for (const c of certificates) {
    const list = byContract.get(c.subcontractId) || [];
    list.push(c);
    byContract.set(c.subcontractId, list);
  }

  const subcontracts = [...rows]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .map((s) => {
      const mine = byContract.get(s.id) || [];
      return {
        ...s,
        certificates: mine.map((c) => ({
          ...c,
          certifiedByAlias: aliasOf.get(String(c.certifiedByCollaboratorId || "")) || "",
        })),
        position: subcontractPosition(s, mine, asOf.slice(0, 10)),
        createdByAlias: aliasOf.get(String(s.createdByCollaboratorId || "")) || "",
      };
    });

  return {
    subcontracts,
    asOf,
    canCreate: !requirePermission(ctx.access, "procurement.subcontracts.create"),
    canEdit: !requirePermission(ctx.access, "procurement.subcontracts.edit"),
    canDelete: !requirePermission(ctx.access, "procurement.subcontracts.delete"),
    canCertify: !requirePermission(ctx.access, "procurement.subcontracts.certify"),
  };
}

export async function createSubcontract(ctx: ProcurementContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "procurement.subcontracts.create");
  if (denied) return denied;

  const { studio, subcontractsSection, collaborator } = ctx;
  const title = str(body?.title, 200);
  if (!title) return { error: "title" };
  const vendorId = str(body?.vendorId, 60);
  if (!vendorId) return { error: "vendor" };

  const rows = await Subcontracts.find({ studio, section: subcontractsSection });
  const at = now();
  return {
    subcontract: await Subcontracts.create({ studio, section: subcontractsSection }, {
      reference: await nextReference(studio.id, { rows, field: "reference", ...seriesSetting("subcontract", studio.numbering) }),
      title,
      scope: str(body?.scope, 4000),
      vendorId,
      projectId: str(body?.projectId, 60),
      costCodeId: str(body?.costCodeId, 60),
      value: num(body?.value),
      retentionPercent: pct(body?.retentionPercent),
      retentionReleaseDate: day(body?.retentionReleaseDate),
      startDate: day(body?.startDate),
      endDate: day(body?.endDate),
      // BORN A DRAFT. A subcontract nobody has signed should not be accepting
      // valuations, which is what `certificateProblem` refuses on.
      status: "Draft",
      notes: str(body?.notes, 2000),
      createdByCollaboratorId: collaborator.id,
      createdAt: at,
      updatedAt: at,
    }),
  };
}

export async function editSubcontract(
  ctx: ProcurementContext, id: string, body: Record<string, unknown>,
) {
  const denied = requirePermission(ctx.access, "procurement.subcontracts.edit");
  if (denied) return denied;

  const { studio, subcontractsSection } = ctx;
  const current = await Subcontracts.byId({ studio, section: subcontractsSection }, id);
  if (!current) return { error: "notfound" };

  const patch: Record<string, unknown> = {};
  if (body?.title !== undefined) {
    const v = str(body.title, 200);
    if (!v) return { error: "title" };
    patch.title = v;
  }
  if (body?.scope !== undefined) patch.scope = str(body.scope, 4000);
  if (body?.vendorId !== undefined) patch.vendorId = str(body.vendorId, 60);
  if (body?.projectId !== undefined) patch.projectId = str(body.projectId, 60);
  if (body?.costCodeId !== undefined) patch.costCodeId = str(body.costCodeId, 60);
  if (body?.value !== undefined) patch.value = num(body.value);
  if (body?.startDate !== undefined) patch.startDate = day(body.startDate);
  if (body?.endDate !== undefined) patch.endDate = day(body.endDate);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 2000);

  // THE RETENTION TERMS FREEZE ONCE ANYTHING HAS BEEN CERTIFIED. Every
  // certificate already written withheld a percentage; changing it afterwards
  // would silently re-price money the studio has already told a subcontractor
  // it was holding, and the certificates would no longer sum to the position.
  if (body?.retentionPercent !== undefined || body?.retentionReleaseDate !== undefined) {
    const certificates = await Certificates.find(
      { studio, section: subcontractsSection }, { where: { subcontractId: id } });
    if (certificates.some(isCounted)) return { error: "retention-locked" };
    if (body?.retentionPercent !== undefined) patch.retentionPercent = pct(body.retentionPercent);
    if (body?.retentionReleaseDate !== undefined) {
      patch.retentionReleaseDate = day(body.retentionReleaseDate);
    }
  }

  if (body?.status !== undefined) {
    const v = str(body.status, 20);
    if (!(SUBCONTRACT_STATUSES as readonly string[]).includes(v)) return { error: "status" };
    patch.status = v;
  }
  patch.updatedAt = now();

  const subcontract = await Subcontracts.update({ studio, section: subcontractsSection }, id, patch);
  return subcontract ? { subcontract } : { error: "notfound" };
}

export async function removeSubcontract(ctx: ProcurementContext, id: string) {
  const denied = requirePermission(ctx.access, "procurement.subcontracts.delete");
  if (denied) return denied;

  const { studio, subcontractsSection } = ctx;
  const certificates = await Certificates.find(
    { studio, section: subcontractsSection }, { where: { subcontractId: id } });
  // A SUBCONTRACT THAT HAS BEEN VALUED IS A RECORD OF MONEY OWED. Deleting it
  // would orphan every certificate written against it — Terminated is the state
  // it HAS, and it keeps the history readable.
  if (certificates.length) return { error: "has-certificates" };

  const gone = await Subcontracts.remove({ studio, section: subcontractsSection }, id);
  return gone ? { ok: true } : { error: "notfound" };
}

/** Write a valuation. Agreeing it is a different act and a different right. */
export async function createCertificate(ctx: ProcurementContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "procurement.subcontracts.edit");
  if (denied) return denied;

  const { studio, subcontractsSection, collaborator } = ctx;
  const subcontractId = str(body?.subcontractId, 60);
  const subcontract = await Subcontracts.byId(
    { studio, section: subcontractsSection }, subcontractId);
  if (!subcontract) return { error: "notfound" };

  const existing = await Certificates.find(
    { studio, section: subcontractsSection }, { where: { subcontractId } });
  const problem = certificateProblem(
    subcontract, body?.cumulativeValue, lastCounted(existing));
  if (problem) return { error: problem };

  const at = now();
  return {
    certificate: await Certificates.create({ studio, section: subcontractsSection }, {
      subcontractId,
      // NUMBERED WITHIN THE SUBCONTRACT rather than across the studio: a
      // subcontractor talks about "certificate 3 on the drylining", and a
      // studio-wide sequence would make that number meaningless to them.
      number: String(existing.length + 1),
      periodEnd: day(body?.periodEnd),
      cumulativeValue: num(body?.cumulativeValue),
      backCharges: cleanBackCharges(body?.backCharges),
      status: "Draft",
      notes: str(body?.notes, 2000),
      createdByCollaboratorId: collaborator.id,
      createdAt: at,
      updatedAt: at,
    }),
  };
}

export async function editCertificate(
  ctx: ProcurementContext, id: string, body: Record<string, unknown>,
) {
  const denied = requirePermission(ctx.access, "procurement.subcontracts.edit");
  if (denied) return denied;

  const { studio, subcontractsSection } = ctx;
  const current = await Certificates.byId({ studio, section: subcontractsSection }, id);
  if (!current) return { error: "notfound" };
  // A DRAFT IS THE ONLY THING THAT EDITS. Once certified it is a statement of
  // what somebody agreed was owed; correcting it afterwards is what the NEXT
  // cumulative certificate is for, and that correction is visible where a
  // silent edit would not be.
  if (isCounted(current)) return { error: "certified" };

  const patch: Record<string, unknown> = {};
  if (body?.periodEnd !== undefined) patch.periodEnd = day(body.periodEnd);
  if (body?.backCharges !== undefined) patch.backCharges = cleanBackCharges(body.backCharges);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 2000);
  if (body?.cumulativeValue !== undefined) {
    const subcontract = await Subcontracts.byId(
      { studio, section: subcontractsSection }, current.subcontractId);
    const siblings = await Certificates.find(
      { studio, section: subcontractsSection }, { where: { subcontractId: current.subcontractId } });
    const problem = certificateProblem(
      subcontract, body.cumulativeValue, lastCounted(siblings));
    if (problem) return { error: problem };
    patch.cumulativeValue = num(body.cumulativeValue);
  }
  // STATUS IS NOT EDITABLE HERE. Certifying is its own act with its own right,
  // and a generic edit that could write `Certified` would route a signature
  // around it.
  if (body?.status !== undefined) return { error: "not-certifiable" };
  patch.updatedAt = now();

  const certificate = await Certificates.update({ studio, section: subcontractsSection }, id, patch);
  return certificate ? { certificate } : { error: "notfound" };
}

/**
 * AGREE A VALUATION.
 *
 * ITS OWN RIGHT — `certify` rather than `edit` — because writing the number is
 * administration and agreeing it creates a debt. On the archetypes it sits with
 * the project manager rather than the buyer: the person who can say the work
 * happened is the one running the job, not the one who placed the order.
 */
export async function certifyCertificate(ctx: ProcurementContext, id: string) {
  // NO BLANKET GUARD FIRST, deliberately: the right that opens this door is
  // `certify`, and an `edit` check here would let whoever wrote the valuation
  // agree it, which is the separation the verb exists for.
  const denied = requirePermission(ctx.access, "procurement.subcontracts.certify");
  if (denied) return denied;

  const { studio, subcontractsSection, collaborator } = ctx;
  const current = await Certificates.byId({ studio, section: subcontractsSection }, id);
  if (!current) return { error: "notfound" };
  if (isCounted(current)) return { error: "already-certified" };

  const subcontract = await Subcontracts.byId(
    { studio, section: subcontractsSection }, current.subcontractId);
  const siblings = await Certificates.find(
    { studio, section: subcontractsSection }, { where: { subcontractId: current.subcontractId } });
  // RE-CHECKED AT THE TRANSITION, not only when it was written: the valuation
  // may have been drafted before an earlier period was certified, and a
  // certificate that is now below the last agreed one would pay backwards.
  const problem = certificateProblem(
    subcontract, current.cumulativeValue, lastCounted(siblings.filter((c) => c.id !== id)));
  if (problem) return { error: problem };

  const at = now();
  const certificate = await Certificates.update({ studio, section: subcontractsSection }, id, {
    status: "Certified",
    certifiedByCollaboratorId: collaborator.id,
    certifiedAt: at,
    updatedAt: at,
  });
  return certificate ? { certificate } : { error: "notfound" };
}
