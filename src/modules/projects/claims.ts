// ONE PROJECT'S PROGRESS CLAIMS — the store half of `./progressClaims`.
//
// GUARDED BY `projects.billing`, the payment schedule's area: a claim is a way
// of billing the same project, and a second right over it would be a second
// answer to "who asks this client for money".
//
// THE INVOICE IS FINANCE'S. Certifying a claim does not bill anybody; the
// screen raises the invoice through Finance's own route with `claimId` on it,
// the door every invoice goes through. Whether a claim has been invoiced is then
// DERIVED from the invoices naming it — never a flag here, the milestone's rule.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { invoiceTotals } from "@/modules/finance/finance";
import { isClaimed } from "./billing";
import {
  sourceFromBoq, sourceFromQuotation, linesOf, nextClaimNumber, certifiedBefore, newClaimLines,
  withQuantities, claimValuation, openProblem, moveProblem, editProblem, type SourceLine,
} from "./progressClaims";
import type { Invoice } from "@/modules/finance/schema";
import type { ProgressClaim, Project } from "./schema";
import type { ProjectsContext } from "./types";

const Claims = repo<ProgressClaim>("progressClaims");
const Projects = repo<Project>("projects");
const BoqItems = repo<Record<string, unknown> & { id: string }>("boqItems");
const Quotations = repo<Record<string, unknown> & { id: string; items?: unknown }>("quotations");
const Invoices = repo<Invoice>("invoices");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(str(v, 10)) ? str(v, 10) : "");
const now = () => new Date().toISOString();

/**
 * WHAT THIS PROJECT IS MEASURED AGAINST: the tender's bill when it was handed
 * over, else the quotation it opened from. A direct project has neither and is
 * billed by its payment schedule instead.
 */
async function sourceFor(ctx: ProjectsContext, project: Project): Promise<{ basis: "boq" | "quotation" | "none"; lines: SourceLine[] }> {
  const { studio, tenderRegisterSection, quotationsSection } = ctx;
  const tenderId = String((project as { tenderId?: unknown }).tenderId || "");
  if (tenderId && tenderRegisterSection) {
    const items = await BoqItems.find({ studio, section: tenderRegisterSection }, { where: { tenderId } });
    return { basis: "boq", lines: sourceFromBoq(items) };
  }
  const quotationId = String(project.quotationId || "");
  if (quotationId && quotationsSection) {
    const quote = await Quotations.byId({ studio, section: quotationsSection }, quotationId);
    const items = Array.isArray(quote?.items) ? quote.items as Record<string, unknown>[] : [];
    return { basis: "quotation", lines: sourceFromQuotation(items) };
  }
  return { basis: "none", lines: [] };
}

async function claimsOf(ctx: ProjectsContext, projectId: string) {
  return Claims.find({ studio: ctx.studio, section: ctx.listSection }, { where: { projectId } });
}

/** Every claim on a project, valued, with what has been invoiced against each. */
export async function listClaims(ctx: ProjectsContext, projectId: string) {
  const denied = requirePermission(ctx.access, "projects.billing.view");
  if (denied) return denied;
  if (!projectId) return { error: "missing" };

  const { studio, listSection, cashSection } = ctx;
  const project = await Projects.byId({ studio, section: listSection }, projectId);
  if (!project) return { error: "notfound" };
  const [claims, source, invoices] = await Promise.all([
    claimsOf(ctx, projectId),
    sourceFor(ctx, project),
    cashSection ? Invoices.find({ studio, section: cashSection }, { where: { projectId } }) : Promise.resolve([]),
  ]);

  const retention = (project as { retentionPercent?: unknown }).retentionPercent;
  const ordered = [...claims].sort((a, b) => Number(String(a.number).replace(/\D/g, "")) - Number(String(b.number).replace(/\D/g, "")));
  return {
    project: { id: project.id, clientName: project.clientName || "", retentionPercent: Number(retention) || 0 },
    basis: source.basis,
    sourceLines: source.lines.length,
    claims: ordered.map((c) => {
      const previous = certifiedBefore(claims, c.number);
      // INVOICED AGAINST THIS CLAIM, net of VAT so it compares with what was
      // certified; a draft invoice counts as raised (so nobody raises a second)
      // but not as claimed from the client.
      const named = invoices.filter((i) => (i as { claimId?: unknown }).claimId === c.id && i.status !== "Cancelled");
      return {
        ...c,
        lines: linesOf(c),
        previousQty: Object.fromEntries(previous),
        valuation: claimValuation(c, previous, retention),
        invoiced: Math.round(named.filter((i) => isClaimed(i)).reduce((t, i) => t + invoiceTotals(i).subtotal, 0) * 100) / 100,
        invoiceRaised: named.length > 0,
      };
    }),
  };
}

/** A new claim, its lines copied from the bill and started at what is already certified. */
export async function openClaim(ctx: ProjectsContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.billing.create");
  if (denied) return denied;

  const { studio, listSection, collaborator } = ctx;
  const projectId = str(body?.projectId, 60);
  if (!projectId) return { error: "missing" };
  const project = await Projects.byId({ studio, section: listSection }, projectId);
  if (!project) return { error: "notfound" };

  const [claims, source] = await Promise.all([claimsOf(ctx, projectId), sourceFor(ctx, project)]);
  if (!source.lines.length) return { error: "no-bill" };
  const open = openProblem(claims);
  if (open) return { error: open };

  const at = now();
  const claim = await Claims.create({ studio, section: listSection }, {
    projectId,
    number: nextClaimNumber(claims),
    periodEnd: day(body?.periodEnd) || at.slice(0, 10),
    // BORN A DRAFT, always — submitting is its own act.
    status: "Draft",
    basis: source.basis,
    lines: newClaimLines(source.lines, certifiedBefore(claims)),
    createdByCollaboratorId: collaborator.id,
    createdAt: at,
    updatedAt: at,
  });
  return { claim };
}

async function loadClaim(ctx: ProjectsContext, id: string) {
  const claim = await Claims.byId({ studio: ctx.studio, section: ctx.listSection }, id);
  if (!claim) return null;
  return { claim, siblings: await claimsOf(ctx, claim.projectId) };
}

/** The quantities applied for, and the period — a draft only. */
export async function editClaim(ctx: ProjectsContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.billing.edit");
  if (denied) return denied;

  const found = await loadClaim(ctx, id);
  if (!found) return { error: "notfound" };
  const { claim, siblings } = found;
  const lines = withQuantities(linesOf(claim), body?.lines, "claimedQty");
  const wrong = editProblem(claim, lines, certifiedBefore(siblings, claim.number));
  if (wrong) return { error: wrong };

  const updated = await Claims.update({ studio: ctx.studio, section: ctx.listSection }, id, {
    lines,
    ...(body?.periodEnd !== undefined && day(body.periodEnd) ? { periodEnd: day(body.periodEnd) } : {}),
    updatedAt: now(),
  });
  return updated ? { claim: updated } : { error: "notfound" };
}

/**
 * SUBMIT, SEND BACK, OR RECORD THE CERTIFICATE — one door for the moves, like
 * every other ladder here. Submitting may carry the last quantities typed;
 * certifying carries what the client's certificate accepts, and a line it does
 * not mention is certified as applied for.
 */
export async function moveClaim(ctx: ProjectsContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "projects.billing.edit");
  if (denied) return denied;

  const found = await loadClaim(ctx, id);
  if (!found) return { error: "notfound" };
  const { claim, siblings } = found;
  const to = str(body?.to, 20);
  const previous = certifiedBefore(siblings, claim.number);

  let lines = linesOf(claim);
  if (to === "Submitted") lines = withQuantities(lines, body?.lines, "claimedQty");
  if (to === "Certified") {
    lines = withQuantities(lines, body?.lines, "certifiedQty")
      .map((l) => ({ ...l, certifiedQty: l.certifiedQty ?? l.claimedQty }));
  }
  // SENT BACK FOR CORRECTION: whatever was typed as certified is not a certificate.
  if (to === "Draft") lines = lines.map((l) => ({ ...l, certifiedQty: null }));

  const wrong = moveProblem({ ...claim, lines }, to, previous);
  if (wrong) return { error: wrong, from: claim.status, to };

  const at = now();
  const updated = await Claims.update({ studio: ctx.studio, section: ctx.listSection }, id, {
    status: to,
    lines,
    ...(to === "Submitted" ? { submittedAt: at } : {}),
    ...(to === "Certified" ? { certifiedAt: at, certifiedByCollaboratorId: ctx.collaborator.id } : {}),
    updatedAt: at,
  });
  return updated ? { claim: updated } : { error: "notfound" };
}

/** A draft may be thrown away; anything the client has seen may not. Its number stays spent. */
export async function removeClaim(ctx: ProjectsContext, id: string) {
  const denied = requirePermission(ctx.access, "projects.billing.delete");
  if (denied) return denied;
  const claim = await Claims.byId({ studio: ctx.studio, section: ctx.listSection }, id);
  if (!claim) return { error: "notfound" };
  if (claim.status !== "Draft") return { error: "not-draft" };
  const gone = await Claims.remove({ studio: ctx.studio, section: ctx.listSection }, id);
  return gone ? { ok: true } : { error: "notfound" };
}
