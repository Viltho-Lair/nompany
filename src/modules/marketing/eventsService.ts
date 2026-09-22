// EVENTS & WEBINARS — the register, its sign-ups and its door (22/09/2026).
//
// THE RULES ARE ./events, which is pure, so the screen refuses exactly what the
// server refuses.
//
// REGISTRATIONS ARE READ, NEVER WRITTEN. An event names a registration form and
// its sign-ups are that form's replies, counted where Forms keeps them. This is
// the same rule that keeps spend in Finance and the calendar's bars on the
// campaigns: one register per fact, or two that disagree.
//
// AND THE NAMES ARE NOT THIS RIGHT'S TO GIVE. A registrant's name is a sealed
// form ANSWER (invariant 18) and answers to `marketing.forms.view`, so
// `marketing.events.view` opens the event and the COUNTS while the list of who
// signed up is read only for somebody who could open that form anyway — the
// customer-360 rule, where a block the reader may not see is never read at all.
import { requirePermission, type PermissionKey } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listCollaborators } from "@/platform/auth/collaborators";
import { cleanSettings, leadFromAnswers, type FormDefinition } from "./formsModel";
import {
  EVENT_KINDS, eventProblem, eventState, seatsLeft, turnout, eventDeletable, attendedAmong,
  type EventKind,
} from "./events";
import { isFinal } from "./model";
import type { Campaign, MarketingEvent, MarketingForm, FormResponse } from "./schema";
import type { MarketingContext } from "./types";

const Events = repo<MarketingEvent>("marketingEvents");
const Forms = repo<MarketingForm>("marketingForms");
const Responses = repo<FormResponse>("marketingFormResponses");
const Campaigns = repo<Campaign>("marketingCampaigns");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();
const scope = (ctx: MarketingContext) => ({ studio: ctx.studio, section: ctx.eventsSection });
const may = (ctx: MarketingContext, key: PermissionKey) => !requirePermission(ctx.access, key);
// A STAMP, MINUTE PRECISION. Stored as given rather than re-zoned: the studio
// types a local time and every reader compares the same string.
const stamp = (v: unknown) => {
  const s = str(v, 25);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) ? s.slice(0, 16) : "";
};
/**
 * BLANK IS "NO LIMIT". A NUMBER THAT IS NOT ALLOWED STAYS A NUMBER, so the rule
 * can refuse it.
 *
 * THIS RETURNED `null` FOR ANYTHING NOT ABOVE NOUGHT, which made
 * `eventProblem`'s capacity refusal UNREACHABLE: a studio typing 0 had it
 * silently read as "no limit" and the create succeeded — found by opening the
 * API rather than by the model test, which asserts the rule the service was
 * stepping around. A field that quietly means the opposite of what was typed is
 * worse than one that refuses.
 */
const capacity = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, -1e7), 1e7);
};

type Person = { id: string; alias?: string };
const people = async (ctx: MarketingContext): Promise<Person[]> =>
  (await listCollaborators(ctx.studio.id) as Person[]).map((c) => ({ id: String(c.id), alias: c.alias || "" }));

/** Every field a write may set, coerced; only what the body named. */
function eventFields(body: Record<string, unknown>) {
  const out: Partial<MarketingEvent> = {};
  const has = (k: string) => body?.[k] !== undefined;
  if (has("name")) out.name = str(body.name, 200);
  if (has("description")) out.description = str(body.description, 4000);
  if (has("kind")) {
    out.kind = (EVENT_KINDS as readonly string[]).includes(String(body.kind))
      ? (String(body.kind) as EventKind) : "event";
  }
  if (has("startsAt")) out.startsAt = stamp(body.startsAt);
  if (has("endsAt")) out.endsAt = stamp(body.endsAt);
  if (has("location")) out.location = str(body.location, 500);
  if (has("capacity")) out.capacity = capacity(body.capacity);
  if (has("campaignId")) out.campaignId = str(body.campaignId, 60);
  if (has("formId")) out.formId = str(body.formId, 60);
  if (has("ownerCollaboratorId")) out.ownerCollaboratorId = str(body.ownerCollaboratorId, 60);
  return out;
}

/** Sign-ups per event: the replies to each event's own registration form. */
async function signUps(ctx: MarketingContext, events: readonly MarketingEvent[]) {
  const formIds = [...new Set(events.map((e) => String(e.formId || "")).filter(Boolean))];
  // NOT READ AT ALL when no event names a form, and not read when Forms is
  // switched off — a count nobody can produce is absent, not nought.
  if (!formIds.length || !ctx.formsSection || !ctx.on("marketing-forms")) return new Map<string, FormResponse[]>();
  const rows = await Responses.find({ studio: ctx.studio, section: ctx.formsSection });
  const by = new Map<string, FormResponse[]>();
  for (const r of rows) {
    const formId = String(r.formId || "");
    if (!formIds.includes(formId)) continue;
    const at = by.get(formId) || [];
    at.push(r);
    by.set(formId, at);
  }
  return by;
}

/**
 * EVERY EVENT, soonest first, with what it holds and how it went.
 *
 * SOONEST FIRST AMONG THE ONES STILL TO COME, then the past ones newest first.
 * A register sorted by entry date buries tomorrow's event under one from March;
 * sorted by start date alone it buries it under every event that ever ran.
 */
export async function listEvents(ctx: MarketingContext) {
  const denied = requirePermission(ctx.access, "marketing.events.view");
  if (denied) return denied;

  const [events, team, campaigns, forms] = await Promise.all([
    Events.find(scope(ctx)),
    people(ctx),
    ctx.campaignsSection && ctx.on("marketing-campaigns")
      ? Campaigns.find({ studio: ctx.studio, section: ctx.campaignsSection }) : Promise.resolve([] as Campaign[]),
    ctx.formsSection && ctx.on("marketing-forms")
      ? Forms.find({ studio: ctx.studio, section: ctx.formsSection }) : Promise.resolve([] as MarketingForm[]),
  ]);
  const replies = await signUps(ctx, events);
  const aliasOf = new Map(team.map((p) => [p.id, p.alias || ""]));
  const campaignOf = new Map(campaigns.map((c) => [c.id, `${c.reference} · ${c.name}`]));
  const formOf = new Map(forms.map((f) => [f.id, f.name]));
  const at = now();

  const rows = events.map((e) => {
    const mine = replies.get(String(e.formId || "")) || [];
    // THE STORED LIST IS ALLOWED TO GO STALE AND THE COUNT NEVER IS: a reply
    // somebody deleted afterwards drops out here rather than being prevented
    // at the write, which no write-time check could cover.
    const came = attendedAmong(e.attended, mine);
    const state = eventState(e, at);
    return {
      ...e,
      // THE IDS AND THE COUNT ARE NAMED APART. `turnout` returns an `attended`
      // COUNT, and spreading it over an `attended` ARRAY silently replaced the
      // list with a number — caught by the compiler, which is the whole reason
      // the two have different names here.
      attendedIds: came,
      state,
      campaignName: e.campaignId ? campaignOf.get(e.campaignId) || "" : "",
      formName: e.formId ? formOf.get(e.formId) || "" : "",
      ownerAlias: aliasOf.get(e.ownerCollaboratorId) || "",
      seatsLeft: seatsLeft(e.capacity, mine.length),
      ...turnout(mine.length, came.length),
      deleteProblem: eventDeletable(state, came.length),
    };
  }).sort((a, b) => {
    const pastA = Number(a.state === "past");
    const pastB = Number(b.state === "past");
    if (pastA !== pastB) return pastA - pastB;
    return pastA
      ? (b.startsAt || "").localeCompare(a.startsAt || "")
      : (a.startsAt || "9999").localeCompare(b.startsAt || "9999");
  });

  return {
    events: rows,
    asOf: at,
    people: team,
    // OPEN CAMPAIGNS AND ANSWERABLE FORMS ONLY, the same courtesy the Finance
    // forms extend: a picker offering a finished campaign offers work nobody
    // is doing.
    campaigns: campaigns.filter((c) => !isFinal(c.status))
      .map((c) => ({ id: c.id, name: `${c.reference} · ${c.name}` })),
    forms: forms.filter((f) => f.status !== "Draft").map((f) => ({ id: f.id, name: f.name })),
    sources: { forms: Boolean(ctx.formsSection) && ctx.on("marketing-forms") },
    canCreate: may(ctx, "marketing.events.create"),
    canEdit: may(ctx, "marketing.events.edit"),
    canDelete: may(ctx, "marketing.events.delete"),
    /** Seeing WHO signed up is Forms' right, never this one. */
    canSeeRegistrants: may(ctx, "marketing.forms.view"),
  };
}

/**
 * WHO SIGNED UP FOR ONE EVENT, by name.
 *
 * GATED ON `marketing.forms.view`, NOT on the events right. These are sealed
 * answers a stranger gave a form, and resolving them for somebody who may not
 * open that form would leak the register the gate exists for. The counts on the
 * list above are not a leak — how many came to a talk is the event's own fact.
 */
export async function eventRegistrants(ctx: MarketingContext, id: string) {
  const denied = requirePermission(ctx.access, "marketing.events.view");
  if (denied) return denied;
  const forms = requirePermission(ctx.access, "marketing.forms.view");
  if (forms) return forms;

  const event = await Events.byId(scope(ctx), id);
  if (!event) return { error: "notfound" };
  if (!event.formId || !ctx.formsSection || !ctx.on("marketing-forms")) return { registrants: [], attended: [] };

  const form = await Forms.byId({ studio: ctx.studio, section: ctx.formsSection }, event.formId);
  if (!form) return { registrants: [], attended: [] };
  const rows = await Responses.find({ studio: ctx.studio, section: ctx.formsSection }, { where: { formId: event.formId } });
  const settings = cleanSettings(form.settings, form.definition as unknown as FormDefinition);
  const came = new Set(attendedAmong(event.attended, rows));

  return {
    // THE FORM'S OWN LEAD FIELDS NAME THE PERSON — the same three the form
    // already uses to raise a lead, so a studio that renamed its questions does
    // not have to tell this screen about it twice.
    registrants: rows.map((r) => {
      const who = leadFromAnswers(form.definition as unknown as FormDefinition, settings, r.answers as Record<string, unknown>, form.name);
      return {
        id: r.id,
        name: who.clientName || "",
        email: who.contactEmail || "",
        phone: who.contactPhone || "",
        at: r.createdAt,
        attended: came.has(r.id),
        ticketId: r.ticketId || "",
      };
    }).sort((a, b) => a.at.localeCompare(b.at)),
    attended: [...came],
    canMark: may(ctx, "marketing.events.edit"),
  };
}

async function shapeProblem(ctx: MarketingContext, next: Partial<MarketingEvent>) {
  const problem = eventProblem(next);
  if (problem) return problem;
  if (next.ownerCollaboratorId && !(await people(ctx)).some((p) => p.id === next.ownerCollaboratorId)) return "owner";
  // BOTH LINKS ARE VALIDATED, because both ends are this studio's own and a
  // dangling one reads exactly like a typo. A form is checked only where Forms
  // is switched on; a studio that turned it off keeps whatever it stored.
  if (next.formId && ctx.formsSection && ctx.on("marketing-forms")
    && !(await Forms.byId({ studio: ctx.studio, section: ctx.formsSection }, next.formId))) return "form";
  if (next.campaignId && ctx.campaignsSection
    && !(await Campaigns.byId({ studio: ctx.studio, section: ctx.campaignsSection }, next.campaignId))) return "campaign";
  return "";
}

export async function createEvent(ctx: MarketingContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.events.create");
  if (denied) return denied;
  const fields = eventFields(body || {});
  const next = { name: "", kind: "event", startsAt: "", endsAt: "", capacity: null, ...fields };
  const problem = await shapeProblem(ctx, next);
  if (problem) return { error: problem };

  const at = now();
  const event = await Events.create(scope(ctx), {
    description: "",
    location: "",
    campaignId: "",
    formId: "",
    attended: [],
    // WHOEVER PUTS IT ON OWNS IT until somebody says otherwise.
    ownerCollaboratorId: ctx.collaborator.id,
    ...next,
    createdByCollaboratorId: ctx.collaborator.id,
    createdAt: at,
    updatedAt: at,
  });
  return { event };
}

export async function editEvent(ctx: MarketingContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.events.edit");
  if (denied) return denied;
  const current = await Events.byId(scope(ctx), id);
  if (!current) return { error: "notfound" };
  const patch = eventFields(body || {});
  const problem = await shapeProblem(ctx, { ...current, ...patch });
  if (problem) return { error: problem };
  const event = await Events.update(scope(ctx), id, (row) => ({ ...row, ...patch, updatedAt: now() }));
  return event ? { event } : { error: "notfound" };
}

/**
 * WHO CAME. Marking the door is an EDIT of the event: attendance is the event's
 * own content, and a second right over it would be free to disagree with the
 * first about who works the door.
 *
 * THE WHOLE LIST IS SENT, not a toggle, because a door is worked by several
 * people at once and a flip-this-one patch would lose whichever tick landed
 * second. `updateRow` takes a function (invariant 8), so the last complete list
 * wins rather than a half-applied merge.
 */
export async function markAttendance(ctx: MarketingContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.events.edit");
  if (denied) return denied;
  const event = await Events.byId(scope(ctx), id);
  if (!event) return { error: "notfound" };
  if (!event.formId) return { error: "no-form" };

  const wanted = Array.isArray(body?.attended) ? body.attended.map((v) => str(v, 60)).filter(Boolean) : [];
  const rows = ctx.formsSection && ctx.on("marketing-forms")
    ? await Responses.find({ studio: ctx.studio, section: ctx.formsSection }, { where: { formId: event.formId } })
    : [];
  // ONLY IDS THAT ARE REGISTRATIONS OF THIS EVENT'S OWN FORM. A body naming a
  // reply to another form would otherwise put a foreign id in the list, and the
  // reader would drop it silently — a tick that appeared to work and did not.
  const attended = attendedAmong(wanted, rows);
  if (wanted.length && !attended.length) return { error: "not-registered" };

  const saved = await Events.update(scope(ctx), id, (row) => ({ ...row, attended, updatedAt: now() }));
  return saved ? { event: saved, attended } : { error: "notfound" };
}

export async function deleteEvent(ctx: MarketingContext, id: string) {
  const denied = requirePermission(ctx.access, "marketing.events.delete");
  if (denied) return denied;
  const event = await Events.byId(scope(ctx), id);
  if (!event) return { error: "notfound" };
  const rows = ctx.formsSection && event.formId && ctx.on("marketing-forms")
    ? await Responses.find({ studio: ctx.studio, section: ctx.formsSection }, { where: { formId: event.formId } })
    : [];
  const problem = eventDeletable(eventState(event, now()), attendedAmong(event.attended, rows).length);
  if (problem) return { error: problem };
  await Events.remove(scope(ctx), id);
  return { ok: true };
}
