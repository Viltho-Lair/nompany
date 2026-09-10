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
import { listCollaborators } from "@/platform/auth/collaborators";
import { resolveValue, valuesFor } from "@/modules/administration/taxonomy";
import { resolveClientFor } from "@/modules/sales/salesClients";
import { seriesSetting } from "@/modules/administration/numbering";
import { repo } from "@/platform/db/repo";
import { moduleContext } from "../context";
import { nextReference } from "@/modules/main/references";
import { DEFAULT_TENDER_STAGE, TENDER_STAGES, tenderProblem, tenderPatch, tenderStage } from "./stages";
import { bidApproved } from "./bid";
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

// A NEW CUSTOMER ADDED FROM A TENDER KNOWS NOTHING BUT ITS NAME. The resolver
// folds a contact and a site into the client and treats blank ones as nothing
// to fold, so these write nothing — a tender notice rarely names a person.
const NO_CONTACT = { name: "", email: "", phone: "", position: "" };
const NO_SITE = { name: "", country: "", city: "", url: "" };

type Parties = { clientId?: string; clientName?: string; assignee?: string };

/**
 * WHO THE TENDER IS FOR AND WHO IS CHASING IT, checked before anything is written.
 *
 * THE CUSTOMER IS PICKED OR ADDED, never typed into an id. The dialog's hint
 * used to say "link it to a customer" while nothing on it could — the link was
 * made only at handover. A picked id must name a client that exists; adding one
 * answers to `crmSales.clients.create`, because that is Sales' record and a
 * tendering right does not stretch to creating it. It goes through
 * `resolveClientFor`, the door every deal-starting path uses, which MATCHES BY
 * NAME FIRST — so "add as new" for a body already on file reuses that client
 * rather than filing it twice.
 *
 * THE OWNER MUST BE SOMEBODY IN THE STUDIO. `assignedToCollaboratorId` has been
 * on the record since the register shipped and nothing set it; an id naming
 * nobody would read as "unassigned" on every screen and be a person on none.
 *
 * A key the body does not carry is left out of the answer, so an edit that does
 * not touch the customer or the owner does not clear them.
 */
async function resolveParties(ctx: TenderingContext, body: Record<string, unknown>): Promise<{ error: string } | Parties> {
  const { studio, salesClientsSection, access, collaborator } = ctx;
  const out: Parties = {};

  const newClient = str(body?.newClient, 160);
  if (newClient) {
    if (!salesClientsSection || requirePermission(access, "crmSales.clients.create")) return { error: "client-create" };
    const client = await resolveClientFor(
      { studio, section: salesClientsSection },
      { clientName: newClient, contact: NO_CONTACT, site: NO_SITE, collaboratorId: collaborator?.id || "" },
    );
    if (!client) return { error: "client" };
    out.clientId = client.id;
    out.clientName = String(client.name || "");
  } else if (body?.clientId !== undefined) {
    const id = str(body.clientId, 60);
    if (id) {
      const client = salesClientsSection ? await Clients.byId({ studio, section: salesClientsSection }, id) : null;
      if (!client) return { error: "client" };
      out.clientName = String(client.name || "");
    }
    out.clientId = id;
  }

  if (body?.assignedToCollaboratorId !== undefined) {
    const id = str(body.assignedToCollaboratorId, 60);
    const people = (await listCollaborators(studio.id)) as { id: string }[];
    if (id && !people.some((c) => c.id === id)) return { error: "assignee" };
    out.assignee = id;
  }
  return out;
}

// THE STUDIO'S SPELLING WHEN THE SOURCE IS ON ITS LIST, the typed text when it
// is not. A widening, not a refusal: tenders written while this was free text,
// and an API caller still sending it, keep saving.
const sourceOf = (taxonomies: unknown, v: unknown) => resolveValue("tenderSources", taxonomies, v, str(v, 120));

export const tenderingContext = moduleContext<TenderingContext>({
  root: "tendering",
  sub: { register: "tendering-register", rates: "tendering-rates" },
  // THE SALES CLIENTS, READ-ONLY AND WITHOUT A GRANT ON THAT DEPARTMENT. A
  // tender's issuer is often already a client, and showing which one is the
  // tender's own story rather than a window into somebody else's queue — the
  // same reasoning Sales uses for the RFQ column it draws without a Technical
  // right. A studio with no CRM & Sales section simply gets no name resolved.
  foreign: {
    salesClients: ["crm-sales-clients", "crm-sales"],
    // Projects, for the handover. Read-only and without a grant on that
    // department, the same terms the clients read above takes: what a won
    // tender BECAME is the tender's own story. A studio with no Projects
    // section simply cannot hand anything over.
    projectsList: ["projects-list", "projects"],
  },
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
    // THE CUSTOMERS THE DIALOG MAY PICK FROM, names only — read here anyway for
    // the issuer column, so offering them costs no second read.
    clients: clients
      .map((c) => ({ id: c.id, name: String(c.name || "") }))
      .sort((a, b) => a.name.localeCompare(b.name)),
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

/**
 * THE REGISTER'S WHOLE PAYLOAD, COMPOSED ONCE.
 *
 * This assembly used to live in the route handler, which was fine while the
 * route was the only thing that produced it. The studio page server-renders the
 * screen's first payload now — see the design in
 * docs/superpowers/specs/2026-09-06-server-rendered-first-payload-design.md —
 * and two copies of "what the register answers" would be two answers free to
 * disagree, with only ONE of them pinned by a golden. The disagreement would not
 * be visible until a studio saw it.
 *
 * CALLED FROM EXACTLY TWO PLACES: this module's route, and the studio page. A
 * third caller is how the second composition path comes back.
 */
export async function tendersView(ctx: TenderingContext) {
  const result = await listTenders(ctx);
  // NOT `refused()` — that helper lives in platform/http/route, and a service
  // importing a route helper points the dependency backwards: modules know
  // nothing about HTTP. Same shape, asked here.
  if (result && typeof result === "object" && "error" in result) return result;
  return {
    ok: true as const,
    // THE CLOCK TRAVELS WITH THE ANSWER. Every "days left" on the register is
    // measured from this one instant and the screen never reads its own — so
    // leaving it behind here left `nowMs` at zero and made every deadline read
    // as missed by twenty thousand days.
    asOf: result.asOf,
    tenders: result.tenders,
    // THE RIGHTS TRAVEL WITH THE LIST, so the register draws a control only
    // where the service would accept the request behind it.
    canCreate: !requirePermission(ctx.access, "tendering.tenders.create"),
    canEdit: !requirePermission(ctx.access, "tendering.tenders.edit"),
    canDelete: !requirePermission(ctx.access, "tendering.tenders.delete"),
    // WHAT THE DIALOG OFFERS, so it can only send what the service accepts: the
    // customers, the studio's own source list, and the people who may own a bid.
    clients: result.clients,
    sources: valuesFor("tenderSources", ctx.studio.taxonomies),
    people: ((await listCollaborators(ctx.studio.id)) as { id: string; alias?: string }[])
      .map((c) => ({ id: c.id, alias: String(c.alias || "") }))
      .sort((a, b) => a.alias.localeCompare(b.alias)),
    canCreateClient: Boolean(ctx.salesClientsSection) && !requirePermission(ctx.access, "crmSales.clients.create"),
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

  const parties = await resolveParties(ctx, body);
  if ("error" in parties) return parties;

  const rows = await Tenders.find({ studio, section: registerSection });
  // FROM THE COUNTER, not from a count: this record has a delete path, and
  // nextUniqueRef's own note says anything with one must number this way or a
  // deletion hands the next tender a reference somebody already quoted.
  const ref = await nextReference(studio.id, { rows, field: "ref", ...seriesSetting("tender", studio.numbering) });

  const tender = await Tenders.create({ studio, section: registerSection }, {
    ref,
    title,
    // THE CUSTOMER'S NAME WHEN NOTHING WAS TYPED — the register shows the
    // client's current name anyway (see `listTenders`); this is what a tender
    // reads as if the client is later removed.
    issuer: str(body?.issuer, 160) || parties.clientName || "",
    clientId: parties.clientId || "",
    source: sourceOf(studio.taxonomies, body?.source),
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
    assignedToCollaboratorId: parties.assignee || "",
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
  if (body?.source !== undefined) patch.source = sourceOf(studio.taxonomies, body.source);
  if (body?.issueDate !== undefined) patch.issueDate = str(body.issueDate, 10);
  if (body?.estimatedValue !== undefined) patch.estimatedValue = money(body.estimatedValue);
  if (body?.currency !== undefined) patch.currency = str(body.currency, 8);
  if (body?.notes !== undefined) patch.notes = str(body.notes, 4000);

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
    // THE BID REVIEW IS ASKED ONLY WHEN A BID IS ABOUT TO GO OUT. Every other
    // move — Preparing, No Bid, Withdrawn, and the decisions that already
    // require having submitted — needs no plan, so it costs no read: resolving
    // one means a collection read for the bill and possibly an FX fetch, and a
    // studio moving a tender to Preparing should pay for neither.
    const approved = tenderStage(move.to)?.kind === "submitted"
      ? await bidApproved(ctx, existing)
      : undefined;
    const problem = tenderProblem({ from: existing.status, to: move.to, reason: move.reason, approved });
    if (problem) return { error: problem };
  }

  // AFTER THE MOVE IS JUDGED, because adding a customer is a write: a refused
  // stage move must not leave a new client behind it.
  const parties = await resolveParties(ctx, body);
  if ("error" in parties) return parties;
  if (parties.clientId !== undefined) patch.clientId = parties.clientId;
  if (parties.clientName && patch.issuer === "") patch.issuer = parties.clientName;
  if (parties.assignee !== undefined) patch.assignedToCollaboratorId = parties.assignee;

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
