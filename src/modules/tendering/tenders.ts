// THE TENDER REGISTER — what the studio is bidding, and what became of each.
//
// The section was declared at the fifteen-section restructure and rendered
// nothing: `tendering` sat in NO_SCREEN_YET and held no permission area, because
// a right nothing can exercise is a bug (invariant 16). This is its first screen
// and its first right.
//
// WHAT A REGISTER IS FOR. Most tenders do not become deals — a studio declines
// some, loses most of the rest, and the ones it wins are the minority that
// eventually reach CRM & Sales. Recording only those is how a studio loses the
// ability to answer "what are we bidding, what do we keep losing, and what did
// we decide not to touch". So a tender is its own record from the day it is
// noticed, and it is NOT a deal until one is opened from it (that handover is a
// later slice — see the functionality file).
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { moduleContext } from "../context";
import { nextReference } from "@/modules/main/references";
import { DEFAULT_TENDER_STAGE, TENDER_STAGES, tenderProblem, tenderPatch } from "./stages";
import type { Tender, TenderingContext } from "./types";

const TENDERS = "tenders";
const Tenders = repo<Tender>(TENDERS);
const Clients = repo<{ id: string; name?: string }>("salesClients");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};
const now = () => new Date().toISOString();

export const tenderingContext = moduleContext<TenderingContext>({
  root: "tendering",
  sub: { register: "tendering-register", rates: "tendering-rates" },
  // THE SALES CLIENTS, READ-ONLY AND WITHOUT A GRANT ON THAT DEPARTMENT. A
  // tender's issuer is often already a client, and showing which one is the
  // tender's own story rather than a window into somebody else's queue — the
  // same reasoning Sales uses for the RFQ column it draws without a Technical
  // right. A studio with no CRM & Sales section simply gets no name resolved.
  foreign: { salesClients: ["crm-sales-clients", "crm-sales"] },
  flags: ["register", "rates"],
});

/**
 * The register, newest deadline first — because the question a register answers
 * is "what is closing", not "what did we enter most recently".
 *
 * The issuer's name is RESOLVED off the client record when there is one, never
 * copied onto the tender: a client renamed after a tender was entered should
 * read correctly on that tender, which a stored copy cannot do (Law 4).
 */
export async function listTenders(ctx: TenderingContext) {
  const denied = requirePermission(ctx.access, "tendering.tenders.view");
  if (denied) return denied;

  const { studio, registerSection, salesClientsSection } = ctx;
  const [tenders, clients] = await Promise.all([
    Tenders.find({ studio, section: registerSection }),
    salesClientsSection ? Clients.find({ studio, section: salesClientsSection }) : [],
  ]);
  const nameById = new Map(clients.map((c) => [c.id, String(c.name || "")] as const));

  return {
    // WHEN THIS ANSWER WAS TRUE. Every "days left" on the register is measured
    // from one instant, and it is this one — the screen does not read its own
    // clock. Two rows a day apart cannot then read the same because a render
    // happened to straddle midnight, and `daysToDeadline` stays a function of
    // its arguments, which is what makes the register assertable at all.
    //
    // AN ISO STRING, NOT AN EPOCH NUMBER, and that is not cosmetic: the golden
    // normaliser scrubs ISO timestamps to a stable placeholder and cannot see a
    // bare integer, so a raw `Date.now()` pinned a value that changed every run
    // and no recorded response could ever match. It is also what every other
    // time in these records already is.
    asOf: now(),
    tenders: [...tenders]
      .map((t) => ({
        ...t,
        // The typed issuer stands when there is no client behind it, which is
        // the ordinary case for a body the studio has never worked for.
        issuer: (t.clientId && nameById.get(t.clientId)) || t.issuer || "",
      }))
      .sort((a, b) => {
        // Undated last rather than first: a tender with no deadline is not
        // urgent, it is incomplete, and sorting it to the top would push the
        // ones that are actually closing off the screen.
        if (!a.submissionDeadline) return b.submissionDeadline ? 1 : 0;
        if (!b.submissionDeadline) return -1;
        return a.submissionDeadline.localeCompare(b.submissionDeadline);
      }),
  };
}

export async function createTender(ctx: TenderingContext, body: Record<string, unknown>) {
  // THE GUARD, BEFORE ANYTHING IS READ OR WRITTEN. Not in the route: routes get
  // added and forgotten, and the function that does the work cannot be reached
  // around.
  const denied = requirePermission(ctx.access, "tendering.tenders.create");
  if (denied) return denied;

  const { studio, registerSection, collaborator } = ctx;
  const title = str(body?.title, 200);
  if (!title) return { error: "title" };
  // THE ONE FIELD A REGISTER CANNOT DO WITHOUT. Everything else about a tender
  // can be filled in as it is learned; a tender with no closing date cannot be
  // chased, cannot be sorted and cannot be missed on purpose.
  const submissionDeadline = str(body?.submissionDeadline, 10);
  if (!submissionDeadline) return { error: "deadline" };

  const rows = await Tenders.find({ studio, section: registerSection });
  // FROM THE COUNTER, not from a count: this record has a delete path, and
  // nextUniqueRef's own note says anything with one must number this way or a
  // deletion hands the next tender a reference somebody already quoted.
  const ref = await nextReference(studio.id, { rows, field: "ref", prefix: "TND" });

  const tender = await Tenders.create({ studio, section: registerSection }, {
    ref,
    title,
    issuer: str(body?.issuer, 160),
    clientId: str(body?.clientId, 60),
    source: str(body?.source, 120),
    issueDate: str(body?.issueDate, 10),
    submissionDeadline,
    estimatedValue: money(body?.estimatedValue),
    currency: str(body?.currency, 8) || String(studio.currency || ""),
    // AUTOMATED, never taken from input — a tender is noticed before it is
    // worked on, and one born "Submitted" would carry a submission date that
    // never happened.
    status: DEFAULT_TENDER_STAGE,
    notes: str(body?.notes, 4000),
    // Who is chasing it. From the payload rather than the session: a register
    // is usually entered by one person on behalf of whoever will bid it.
    assignedToCollaboratorId: str(body?.assignedToCollaboratorId, 60),
    createdByCollaboratorId: collaborator?.id || "",
    createdAt: now(),
    updatedAt: now(),
  });
  return { tender };
}

export async function editTender(ctx: TenderingContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "tendering.tenders.edit");
  if (denied) return denied;

  const { studio, registerSection, collaborator } = ctx;
  const patch: Record<string, unknown> = {};

  if (body?.title !== undefined) { const v = str(body.title, 200); if (!v) return { error: "title" }; patch.title = v; }
  if (body?.submissionDeadline !== undefined) {
    const v = str(body.submissionDeadline, 10);
    if (!v) return { error: "deadline" };
    patch.submissionDeadline = v;
  }
  if (body?.issuer !== undefined) patch.issuer = str(body.issuer, 160);
  if (body?.clientId !== undefined) patch.clientId = str(body.clientId, 60);
  if (body?.source !== undefined) patch.source = str(body.source, 120);
  if (body?.issueDate !== undefined) patch.issueDate = str(body.issueDate, 10);
  if (body?.estimatedValue !== undefined) patch.estimatedValue = money(body.estimatedValue);
  if (body?.currency !== undefined) patch.currency = str(body.currency, 8);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 4000);
  if (body?.assignedToCollaboratorId !== undefined) {
    patch.assignedToCollaboratorId = str(body.assignedToCollaboratorId, 60);
  }

  // A STAGE MOVE IS A TRANSITION, decided below once the tender has been read —
  // `tenderProblem` needs to know where it is NOW, and that is not in the
  // payload. `submittedAt` and `decidedAt` are stamped by the move rather than
  // typed, so they cannot disagree with the status they belong to.
  const move = body?.status !== undefined && TENDER_STAGES.includes(String(body.status))
    ? { to: String(body.status), reason: str(body.decisionReason, 400) }
    : null;

  if (move) {
    const existing = await Tenders.byId({ studio, section: registerSection }, id);
    if (!existing) return { error: "notfound" };
    const problem = tenderProblem({ from: existing.status, to: move.to, reason: move.reason });
    if (problem) return { error: problem };
  }

  patch.updatedAt = now();

  // A FUNCTION PATCH WHEN THE STAGE MOVES (invariant 8), so the history is
  // appended to the row as it stands at write time rather than to the copy read
  // a moment ago for the refusal.
  const tender = await Tenders.update({ studio, section: registerSection }, id, move
    ? (row: Tender) => ({
      ...patch,
      ...tenderPatch({
        from: row.status,
        to: move.to,
        at: String(patch.updatedAt),
        byCollaboratorId: collaborator?.id || "",
        reason: move.reason,
        history: row.stageHistory,
      }),
    })
    : patch);
  return tender ? { tender } : { error: "notfound" };
}

/**
 * DELETING A TENDER IS FOR A MISTAKE, not for a decision.
 *
 * Before it is submitted a tender is only a note that something exists, and a
 * duplicate or a misread notice should be removable. Once the bid has gone in,
 * the tender is a thing the studio DID: it is in a win rate, it may be in a
 * report, and the client on the other side has it. Declining it after the fact
 * is `Withdrawn`, which says so; erasing it is a different claim entirely.
 */
export async function removeTender(ctx: TenderingContext, id: string) {
  const denied = requirePermission(ctx.access, "tendering.tenders.delete");
  if (denied) return denied;

  const { studio, registerSection } = ctx;
  const existing = await Tenders.byId({ studio, section: registerSection }, id);
  if (!existing) return { error: "notfound" };
  if (existing.submittedAt) return { error: "already-submitted" };

  const gone = await Tenders.remove({ studio, section: registerSection }, id);
  return gone ? { ok: true } : { error: "notfound" };
}
