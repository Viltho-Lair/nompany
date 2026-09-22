// AUDIENCES & CONSENT — the ledger of who this studio may contact, and on what
// evidence (21/09/2026). The rules are ./consent, pure and shared with the
// screen; this file reads and appends.
//
// NOTHING IS SENT FROM NOMPANY (the owner, 19/09/2026), so this is the RECORD
// rather than the gate. It is built before the sending layer rather than with
// it because consent nobody wrote down at the time cannot be reconstructed
// afterwards: a studio that starts sending next year needs a ledger that
// already covers the people who ticked the box this year.
//
// APPEND-ONLY, AND THE SERVICE ENFORCES IT. There is no update and no delete —
// a withdrawal is a new row, and a consent somebody could erase is not evidence
// of anything. That is also why `remove` is absent rather than guarded: a
// function nobody can call correctly should not exist to be called.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import type { Section } from "@/platform/db/sections";
import {
  ledger, consentTotals, consentProblem, subjectKey, channelFor, consentState,
  CONSENT_CHANNELS, type ConsentChannel,
} from "./consent";
import type { MarketingContext } from "./types";
import type { Consent } from "./schema";

const Consents = repo<Consent>("marketingConsents");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();

/** The whole ledger, grouped by address, with the search the screen asks for. */
export async function audienceView(ctx: MarketingContext, q: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.audiences.view");
  if (denied) return denied;

  const rows = await Consents.find({ studio: ctx.studio, section: ctx.audiencesSection });
  const entries = ledger(rows);
  const search = str(q?.q, 120).toLowerCase();
  const channel = str(q?.channel, 10);
  const state = str(q?.state, 10);
  const shown = entries.filter((e) => (!search || e.value.includes(search))
    // A CHANNEL FILTER WITHOUT A STATE means "anything recorded on it", which is
    // what somebody picking only a channel is asking for.
    && (!channel || Boolean(e.channels[channel]))
    && (!state || CONSENT_CHANNELS.some((c) => (!channel || c === channel) && e.channels[c]?.state === state)));

  return {
    asOf: now().slice(0, 10),
    channels: CONSENT_CHANNELS,
    entries: shown.slice(0, 500),
    shown: shown.length,
    // THE TOTALS ARE THE WHOLE LEDGER'S, never the filtered view's: a figure
    // that moved when somebody typed in a search box would be read as the
    // studio's audience shrinking.
    totals: consentTotals(entries),
    truncated: shown.length > 500,
    can: { edit: !requirePermission(ctx.access, "marketing.audiences.edit") },
  };
}

/**
 * RECORD A CONSENT OR A WITHDRAWAL BY HAND — somebody who wrote in, telephoned,
 * signed a sheet at a stand, or asked to be left alone. The date may be
 * BACKDATED because those things happen away from the screen, but never into
 * the future: a consent that has not happened yet is not one.
 */
export async function recordConsent(ctx: MarketingContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.audiences.edit");
  if (denied) return denied;

  const kind = str(body?.kind, 10).toLowerCase();
  const value = str(body?.value, 200);
  const channel = str(body?.channel, 10);
  const state = str(body?.state, 10);
  const problem = consentProblem({ kind, value, channel, state });
  if (problem) return { error: problem };

  // A DATE IN THE FUTURE IS REFUSED, NOT QUIETLY REPLACED. This took today's
  // date instead and said nothing, so somebody recording 2027 by mistake was
  // told it had worked and got a row dated now — a wrong date nobody can see.
  const at = str(body?.at, 30);
  const when = at ? (at.length === 10 ? `${at}T00:00:00.000Z` : at) : now();
  if (at && when > now()) return { error: "consent-future" };
  const subject = subjectKey(kind, value);
  const consent = await Consents.create({ studio: ctx.studio, section: ctx.audiencesSection }, {
    kind,
    // STORED NORMALISED, exactly as the ledger matches it. Keeping what somebody
    // typed would mean a withdrawal against "Ali@Firm.com" that a send checking
    // "ali@firm.com" walks straight past.
    value: subject.slice(subject.indexOf(":") + 1),
    channel,
    state,
    at: when,
    source: str(body?.source, 10) === "import" ? "import" : "manual",
    evidence: str(body?.evidence, 500),
    byCollaboratorId: ctx.collaborator.id,
    note: str(body?.note, 500),
    createdAt: now(),
  });
  // WHAT THE LEDGER SAYS NOW, handed back so the screen can say it.
  //
  // A BACKDATED ROW MAY CHANGE NOTHING, and that is the honest outcome rather
  // than a bug: the latest decision wins, so a withdrawal dated last week does
  // not undo a consent given yesterday. Measured in the sandbox — a withdrawal
  // recorded against an address that had consented the same morning left the
  // state "given", and the screen said only "added". Somebody would have
  // believed they had stopped the contact. The row is still kept: it happened,
  // and a ledger that refuses inconvenient history is not evidence.
  const after = [...(await Consents.find({ studio: ctx.studio, section: ctx.audiencesSection }))];
  return { consent, stateNow: consentState(after, subject, channel as ConsentChannel) };
}

/**
 * THE PUBLIC TICKED THE BOX — called by `submitForm` with the studio's own
 * authority, because the person answering a form is not a member of the studio
 * and holds no right at all. The same shape `raiseLead` takes, and for the same
 * reason.
 *
 * ONE TICK, THE ADDRESSES IT WAS GIVEN WITH. A single consent question cannot
 * mean four channels, so an email earns `email` and a telephone number earns
 * `phone`; a form that asks per channel is not built (audiences.md).
 *
 * BEST-EFFORT, LIKE THE LEAD BESIDE IT: the response is the record and is
 * already stored. A consent row that fails to write must not lose somebody's
 * answer — but it is logged rather than swallowed silently, because a ledger
 * that is quietly incomplete is worse than one that is visibly short.
 */
export async function recordFormConsent(
  { studio, section }: { studio: MarketingContext["studio"]; section: Section },
  input: {
    evidence: string;
    formId: string;
    responseId: string;
    email?: string;
    phone?: string;
  },
) {
  const at = now();
  const written: string[] = [];
  for (const [kind, value] of [["email", input.email], ["phone", input.phone]] as const) {
    if (!value) continue;
    const subject = subjectKey(kind, value);
    const channel = channelFor(kind) as ConsentChannel;
    if (!subject || !channel) continue;
    await Consents.create({ studio, section }, {
      kind,
      value: subject.slice(subject.indexOf(":") + 1),
      channel,
      state: "given",
      at,
      source: "form",
      evidence: input.evidence.slice(0, 500),
      formId: input.formId,
      responseId: input.responseId,
      createdAt: at,
    });
    written.push(channel);
  }
  return written;
}
