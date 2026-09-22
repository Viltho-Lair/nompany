// MARKETING FORMS — built in the studio, answered by the public (the owner's
// approved shape, 19/09/2026). docs/functionality/forms.md is the file.
//
// TWO DOORS, AND THEY NEVER MEET. The studio's door is the ordinary one — a
// member, a context, `marketing.forms.*` — and it builds, opens, closes and
// reads. The PUBLIC door (`publicForm`, `submitForm`) has no member at all: it
// is addressed by the studio's slug (a public address by design, invariant 2)
// and a form's unguessable code, it serves only what the form ASKS, and it
// writes only an answer. It reads with the studio's authority because there is
// nobody else's to read with, which is exactly why it reads so little.
//
// AN ANSWER CAN BECOME A SALES LEAD, through Sales' own `raiseLead` — the same
// door a campaign card uses — so a lead from a form is exactly a lead from a
// campaign: unassigned, waiting for a manager, carrying its campaign and its
// deadline (modules/sales/leads).
import { requirePermission, type PermissionKey } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { listSections } from "@/platform/db/sections";
import { getStudioBySlug } from "@/modules/main/studios";
import { raiseLead } from "@/modules/sales/sales";
import { log } from "@/platform/http/observability";
import { recordFormConsent } from "./audiences";
import { listCollaborators } from "@/platform/auth/collaborators";
import { putMedia, getMedia, deleteMedia } from "@/lib/media";
import { cleanAnswers } from "@/lib/questionnaire";
import { summariseResponses, responsesToCsv } from "@/lib/questionnaireSummary";
import {
  cleanDefinition, cleanSettings, openProblems, accepting, fromTemplate, newFormCode, answerProblem,
  leadFromAnswers, takesAnswer, isFile, fileKindAllowed, actionFor,
  FORM_STATUSES, FORM_LOCALES, TEMPLATES,
  type FormDefinition, type FormSettings, type FormQuestion, type FormAction,
} from "./formsModel";
import { askedQuestions, askedRecord, prune, pagesForReport, fileQuestionIds } from "./formsFlow";
import type { Campaign, MarketingForm, FormResponse } from "./schema";
import type { MarketingContext } from "./types";
import type { Section } from "@/platform/db/sections";

const Forms = repo<MarketingForm>("marketingForms");
const Responses = repo<FormResponse>("marketingFormResponses");
const Campaigns = repo<Campaign>("marketingCampaigns");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const scope = (ctx: MarketingContext) => ({ studio: ctx.studio, section: ctx.formsSection });
const may = (ctx: MarketingContext, key: PermissionKey) => !requirePermission(ctx.access, key);
const defOf = (f: MarketingForm) => f.definition as unknown as FormDefinition;

/** The campaigns a form may feed — open ones, by name. */
async function campaignChoices(ctx: MarketingContext) {
  return (await Campaigns.find({ studio: ctx.studio, section: ctx.campaignsSection }))
    .filter((c) => c.status !== "Completed" && c.status !== "Cancelled")
    .map((c) => ({ id: c.id, label: `${c.reference} · ${c.name}` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Where the public answers a form — the path; the screen puts the host in front. */
const publicPath = (ctx: MarketingContext, f: MarketingForm) => `/f/${ctx.studio.slug}/${f.code}`;

// ---- the studio's door ---------------------------------------------------------

export async function listForms(ctx: MarketingContext) {
  const denied = requirePermission(ctx.access, "marketing.forms.view");
  if (denied) return denied;
  const [forms, responses] = await Promise.all([Forms.find(scope(ctx)), Responses.find(scope(ctx))]);
  const counts = new Map<string, number>();
  for (const r of responses) counts.set(r.formId, (counts.get(r.formId) || 0) + 1);
  const at = today();
  return {
    forms: forms.map((f) => ({
      id: f.id, name: f.name, status: f.status, locale: f.locale, template: f.template,
      campaignId: f.settings.campaignId, createLead: f.settings.createLead,
      responses: counts.get(f.id) || 0,
      accepting: accepting(f.status, f.settings, at),
      path: publicPath(ctx, f),
      updatedAt: f.updatedAt,
    })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    templates: TEMPLATES,
    canCreate: may(ctx, "marketing.forms.create"),
    canEdit: may(ctx, "marketing.forms.edit"),
    canDelete: may(ctx, "marketing.forms.delete"),
  };
}

export async function getForm(ctx: MarketingContext, id: string) {
  const denied = requirePermission(ctx.access, "marketing.forms.view");
  if (denied) return denied;
  const form = await Forms.byId(scope(ctx), id);
  if (!form) return { error: "notfound" };
  const [campaigns, responses, people] = await Promise.all([
    campaignChoices(ctx),
    Responses.find(scope(ctx), { where: { formId: id } }),
    listCollaborators(ctx.studio.id),
  ]);
  const settings = cleanSettings(form.settings, defOf(form));
  return {
    form: { ...form, settings },
    path: publicPath(ctx, form),
    problems: openProblems(defOf(form), settings),
    responses: responses.length,
    campaigns,
    // WHO A RULE MAY HAND A LEAD TO — offered only to somebody who could hand
    // one over themselves. A picker that lists people the saver will then be
    // refused for choosing is a screen that lies.
    assignees: may(ctx, "crmSales.tickets.assign")
      ? people.map((c) => ({ id: String(c.id), label: String(c.name || c.email || c.id) })).sort((a, b) => a.label.localeCompare(b.label))
      : [],
    canAssign: may(ctx, "crmSales.tickets.assign"),
    // A LEAD NEEDS SOMEWHERE TO GO: the editor says so rather than offering a
    // switch that would do nothing.
    salesOn: ctx.on("crm-sales"),
    canEdit: may(ctx, "marketing.forms.edit"),
    canDelete: may(ctx, "marketing.forms.delete"),
  };
}

export async function createForm(ctx: MarketingContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.forms.create");
  if (denied) return denied;
  const name = str(body?.name, 200);
  if (!name) return { error: "name" };
  const template = (TEMPLATES as readonly string[]).includes(String(body?.template)) ? String(body.template) : "blank";
  const locale = (FORM_LOCALES as readonly string[]).includes(String(body?.locale)) ? String(body.locale) : "en";
  const { definition, settings } = fromTemplate(template, locale);
  const at = now();
  const form = await Forms.create(scope(ctx), {
    name, status: "Draft", locale, code: newFormCode(), template,
    definition, settings,
    createdByCollaboratorId: ctx.collaborator.id, createdAt: at, updatedAt: at,
  });
  return { form };
}

/**
 * SAVE WHAT THE EDITOR HOLDS. The definition and the settings are cleaned
 * against each other, and a form that is OPEN must stay openable: an edit that
 * would leave the public a form with no consent question, or a lead form with no
 * way to reach anybody, is refused rather than published by accident.
 */
export async function saveForm(ctx: MarketingContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "marketing.forms.edit");
  if (denied) return denied;
  const current = await Forms.byId(scope(ctx), id);
  if (!current) return { error: "notfound" };
  const definition = body?.definition !== undefined ? cleanDefinition(body.definition) : defOf(current);
  const settings = cleanSettings(body?.settings !== undefined ? body.settings : current.settings, definition);
  // WHAT THE FORM HOLDS IS COUNTED BY THE UPLOAD DOOR, NOT SENT BY THE EDITOR.
  // The editor round-trips the whole settings object, so a stale save would put
  // the figure back an hour, and a hand-written one would zero it — either way
  // the cap stops meaning anything.
  settings.storedBytes = cleanSettings(current.settings, definition).storedBytes;
  const campaignProblem = await badCampaign(ctx, settings.campaignId);
  if (campaignProblem) return { error: campaignProblem };
  // NOBODY HANDS OUT WORK THEY COULD NOT HAND OUT THEMSELVES (invariant 5).
  // The rule fires later, with the studio's authority and nobody watching, so
  // the only honest place to ask is here, of the person writing it.
  if (settings.actions.some((a) => a.assignTo) && !may(ctx, "crmSales.tickets.assign")) return { error: "assign-right" };
  const knownPeople = settings.actions.some((a) => a.assignTo)
    ? new Set((await listCollaborators(ctx.studio.id)).map((c) => String(c.id))) : null;
  if (knownPeople && settings.actions.some((a) => a.assignTo && !knownPeople.has(a.assignTo))) return { error: "assignee" };
  if (current.status === "Open") {
    const problems = openProblems(definition, settings);
    if (problems.length) return { error: problems[0], problems };
  }
  const patch: Partial<MarketingForm> = { definition, settings, updatedAt: now() };
  if (body?.name !== undefined) {
    const name = str(body.name, 200);
    if (!name) return { error: "name" };
    patch.name = name;
  }
  if (body?.locale !== undefined && (FORM_LOCALES as readonly string[]).includes(String(body.locale))) patch.locale = String(body.locale);
  const form = await Forms.update(scope(ctx), id, patch);
  return form ? { form } : { error: "notfound" };
}

async function badCampaign(ctx: MarketingContext, campaignId: string): Promise<string> {
  if (!campaignId) return "";
  const campaign = await Campaigns.byId({ studio: ctx.studio, section: ctx.campaignsSection }, campaignId);
  return campaign ? "" : "campaign";
}

/** OPEN IT TO THE PUBLIC, OR CLOSE IT. Opening is refused while anything would stop it working. */
export async function setFormStatus(ctx: MarketingContext, id: string, status: string) {
  const denied = requirePermission(ctx.access, "marketing.forms.edit");
  if (denied) return denied;
  if (!(FORM_STATUSES as readonly string[]).includes(status)) return { error: "status" };
  const current = await Forms.byId(scope(ctx), id);
  if (!current) return { error: "notfound" };
  if (status === "Open") {
    const problems = openProblems(defOf(current), cleanSettings(current.settings, defOf(current)));
    if (problems.length) return { error: problems[0], problems };
  }
  const form = await Forms.update(scope(ctx), id, { status, updatedAt: now() });
  return form ? { form } : { error: "notfound" };
}

/**
 * DELETE A FORM NOBODY HAS ANSWERED. Answers are people's own words, sometimes
 * the only record of an enquiry, so a form that has any is closed instead.
 */
export async function removeForm(ctx: MarketingContext, id: string) {
  const denied = requirePermission(ctx.access, "marketing.forms.delete");
  if (denied) return denied;
  const answered = await Responses.find(scope(ctx), { where: { formId: id } });
  if (answered.length) return { error: "has-responses" };
  const gone = await Forms.remove(scope(ctx), id);
  return gone ? { ok: true } : { error: "notfound" };
}

/** WHAT PEOPLE ANSWERED — a summary per question, every reply, or the CSV of them. */
export async function formResponses(ctx: MarketingContext, id: string) {
  const denied = requirePermission(ctx.access, "marketing.forms.view");
  if (denied) return denied;
  const form = await Forms.byId(scope(ctx), id);
  if (!form) return { error: "notfound" };
  const rows = (await Responses.find(scope(ctx), { where: { formId: id } }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // THE FORM AS A REPORT READS IT: a grid counted row by row, which is the one
  // shape the summary and the CSV cannot work out for themselves (./formsFlow).
  const pages = pagesForReport(defOf(form).pages);
  const files = await fileNames(defOf(form), rows);
  return {
    form: { id: form.id, name: form.name },
    summary: summariseResponses(rows as never, pages as never),
    responses: rows.map((r) => ({ id: r.id, createdAt: r.createdAt, answers: r.answers, ticketId: r.ticketId || "" })),
    // WHAT EACH UPLOAD IS CALLED, against its media id. The answer stores ids,
    // because an id is what the upload door hands back and a name a stranger
    // typed is not a handle; the screen needs both to draw a link worth
    // clicking.
    files,
    csv: () => responsesToCsv(rows as never, pages as never),
  };
}

/** The filename and size behind every uploaded media id in these responses. */
async function fileNames(def: FormDefinition, rows: readonly FormResponse[]) {
  const ids = new Set<string>();
  for (const questionId of fileQuestionIds(def.pages)) {
    for (const row of rows) {
      const v = (row.answers as Record<string, unknown>)[questionId];
      for (const mediaId of Array.isArray(v) ? v.map(String) : []) ids.add(mediaId);
    }
  }
  const out: Record<string, { name: string; size: number }> = {};
  // A busy form is a lot of round trips, so it is bounded: past this the screen
  // shows the ids it has names for and a plain link for the rest.
  for (const mediaId of [...ids].slice(0, 500)) {
    const record = await getMedia(mediaId).catch(() => null);
    if (record) out[mediaId] = { name: record.filename, size: record.size };
  }
  return out;
}

// ---- the public door ---------------------------------------------------------------

type Found = { studio: { id: string; slug?: string; name?: string; logo?: string } & Record<string, unknown>; sections: Section[]; form: MarketingForm };

/**
 * THE FORM A PUBLIC ADDRESS NAMES, or null — for every reason alike: no such
 * studio, no such code, Marketing or Forms switched off. A stranger learns
 * whether there is a form at this address and nothing else (invariant 2).
 */
async function findPublic(slug: string, code: string): Promise<Found | null> {
  if (!/^[a-z0-9]{8,40}$/.test(code)) return null;
  const studio = await getStudioBySlug(slug);
  if (!studio) return null;
  const sections = await listSections(studio.id);
  const root = sections.find((s) => s.key === "marketing");
  const section = sections.find((s) => s.key === "marketing-forms");
  if (!root || !section || root.enabled === false || section.enabled === false) return null;
  const [form] = await Forms.find({ studio, section }, { where: { code } });
  return form ? { studio: studio as Found["studio"], sections, form } : null;
}

/** What the public page shows: the form's questions and the studio's name and logo, nothing more. */
export async function publicForm(slug: string, code: string) {
  const found = await findPublic(slug, code);
  if (!found || found.form.status === "Draft") return null;
  const { form, studio } = found;
  return {
    name: form.name,
    locale: form.locale,
    pages: defOf(form).pages,
    accepting: accepting(form.status, form.settings, today()),
    studio: { name: String(studio.name || ""), logo: String(studio.logo || "") },
  };
}

/**
 * ONE PERSON'S ANSWERS ARRIVE. Refused unless the form is open; judged only on
 * the questions this person's answers actually led them to (the branching's own
 * rule — an answer to a question they were not asked is dropped, not kept). A
 * lead form then raises its Sales lead; failing to raise it never loses the
 * answer, which is stored first.
 */
export async function submitForm(slug: string, code: string, body: Record<string, unknown>) {
  const found = await findPublic(slug, code);
  if (!found) return { error: "notfound" };
  const { form, studio, sections } = found;
  if (!accepting(form.status, form.settings, today())) return { error: "closed" };
  const def = defOf(form);
  const settings = cleanSettings(form.settings, def);
  const answers = cleanAnswers(body?.answers);
  // THE SAME WALK THE PAGE DREW. asked → judged → kept, in that order: a form
  // must never refuse an answer to a question it did not put, nor keep one to a
  // question this person never saw (modules/marketing/formsFlow).
  const asked = askedQuestions(def.pages, answers);
  const kept = prune(def.pages, answers, asked);
  const problem = answerProblem(asked, kept);
  if (problem) return { error: problem.error, questionId: problem.questionId };

  const section = sections.find((s) => s.key === "marketing-forms") as Section;
  const at = now();
  const response = await Responses.create({ studio, section }, {
    formId: form.id,
    answers: kept,
    asked: askedRecord(asked),
    createdAt: at, updatedAt: at,
  });

  // A FILE UPLOADED INTO A BRANCH SOMEBODY THEN LEFT is not part of this answer
  // and nothing will ever read it, so it goes — and the form's allowance goes
  // back with it. (An upload abandoned before submitting keeps its space; there
  // is no submission to notice it, which is the cap's own job.)
  await releaseAbandoned({ studio, section, form, answers, kept });

  // THE TICK IS RECORDED WHETHER OR NOT A LEAD IS RAISED (21/09/2026). A survey
  // that makes no lead still asked for permission to hold somebody's address,
  // and a consent recorded only where Sales happened to be switched on would be
  // a ledger with holes in exactly the places nobody looks.
  await consentFor({ studio, sections, form, settings, def, answers: kept, responseId: response.id });

  const action = actionFor(settings, kept);
  if (action) {
    try {
      const ticketId = await leadFor({ studio, sections, form, settings, action, answers: kept });
      if (ticketId) await Responses.update({ studio, section }, response.id, { ticketId });
    } catch { /* the answer is stored; a lead that failed to raise is visible as a response with no ticket */ }
  }
  return { ok: true, confirmation: settings.confirmation };
}

/** Media the walk left behind: uploaded, then branched away from. */
async function releaseAbandoned(
  { studio, section, form, answers, kept }:
  { studio: Found["studio"]; section: Section; form: MarketingForm; answers: Record<string, unknown>; kept: Record<string, unknown> },
) {
  const dropped: string[] = [];
  for (const id of fileQuestionIds(defOf(form).pages)) {
    if (kept[id] !== undefined) continue;
    for (const mediaId of Array.isArray(answers[id]) ? (answers[id] as unknown[]).map(String) : []) dropped.push(mediaId);
  }
  if (!dropped.length) return;
  let freed = 0;
  for (const mediaId of dropped) {
    const record = await getMedia(mediaId).catch(() => null);
    if (!record || record.studioId !== studio.id) continue;
    freed += record.size || 0;
    await deleteMedia(mediaId).catch(() => {});
  }
  if (freed) await countStorage({ studio, section }, form.id, -freed);
}

/**
 * WHAT THE PUBLIC AGREED TO, from the form's own consent question.
 *
 * THE EVIDENCE IS THE QUESTION'S TEXT AS IT STOOD WHEN THEY ANSWERED, copied
 * rather than pointed at: a studio rewording its form next year must not
 * silently rewrite what somebody consented to.
 *
 * NOTHING IS RECORDED WITHOUT A TICK. A form may carry a consent question that
 * this person never reached (a branch), or left alone where it was optional —
 * `answerProblem` has already refused a REQUIRED one that was skipped, so what
 * arrives here unticked was genuinely optional and genuinely declined.
 */
async function consentFor(
  { studio, sections, form, settings, def, answers, responseId }:
  { studio: Found["studio"]; sections: Section[]; form: MarketingForm; settings: FormSettings;
    def: FormDefinition; answers: Record<string, unknown>; responseId: string },
) {
  const audiences = sections.find((s) => s.key === "marketing-audiences");
  if (!audiences || audiences.enabled === false) return;
  const ticked = def.pages.flatMap((p) => p.questions).find((q) => q.type === "legal"
    && String(answers[q.id] ?? "") === String((q.options || [])[0] ?? ""))
    ;
  if (!ticked) return;
  const at = (id: string) => (id ? String(answers[id] ?? "").trim() : "");
  const email = at(settings.leadFields.email);
  const phone = at(settings.leadFields.phone);
  if (!email && !phone) return;
  try {
    await recordFormConsent({ studio, section: audiences }, {
      evidence: String(ticked.label || ""),
      formId: form.id,
      responseId,
      email,
      phone,
    });
  } catch (e) {
    // The answer is stored and the consent is on it; a ledger row that failed
    // to write is a gap somebody can close by hand, and a silent catch would
    // hide that it ever happened.
    log.error("[forms] consent not recorded", { formId: form.id, responseId, error: String(e) });
  }
}

async function leadFor(
  { studio, sections, form, settings, action, answers }:
  Omit<Found, "form"> & { form: MarketingForm; settings: FormSettings; action: FormAction; answers: Record<string, unknown> },
) {
  const by = (key: string) => sections.find((s) => s.key === key) || null;
  const salesRoot = by("crm-sales");
  if (!salesRoot || salesRoot.enabled === false) return "";
  const ticketsSection = by("crm-sales-tickets") || salesRoot;
  const clientsSection = by("crm-sales-clients") || salesRoot;
  const lead = leadFromAnswers(defOf(form), settings, answers, form.name);
  if (!lead.clientName || (!lead.contactPhone && !lead.contactEmail)) return "";
  const campaignsSection = by("marketing-campaigns");
  const campaign = settings.campaignId && campaignsSection
    ? await Campaigns.byId({ studio, section: campaignsSection }, settings.campaignId) : null;
  const result = await raiseLead({ studio: studio as never, ticketsSection, clientsSection }, {
    ...lead,
    campaignId: campaign?.id || "",
    leadDeadlineHours: campaign?.leadDeadlineHours ?? null,
    // RAISED BY WHOEVER BUILT THE FORM: somebody in the studio has to have
    // raised it, and the person who put the form in front of the public is the
    // one answerable for what it brings in.
    raisedBy: form.createdByCollaboratorId,
    // AND HANDED TO WHOEVER THE RULE NAMES. `saveForm` asked the right to
    // assign of the person who wrote the rule; by the time it fires there is
    // nobody to ask.
    assignTo: action.assignTo,
  });
  return "ticket" in result && result.ticket ? result.ticket.id : "";
}

// ---- the upload door ---------------------------------------------------------------

/**
 * MOVE THE FORM'S STORED TOTAL, under compare-and-set (invariant 8). Two people
 * uploading at once is the ordinary case at a registration desk, and a blind
 * write would lose one of them — which on a cap means the form quietly holds
 * more than it is allowed to.
 */
async function countStorage(scopeIn: { studio: Found["studio"]; section: Section }, formId: string, by: number) {
  await Forms.update(scopeIn as never, formId, (row: MarketingForm) => {
    const settings = cleanSettings(row.settings, row.definition as unknown as FormDefinition);
    return { settings: { ...settings, storedBytes: Math.max(0, settings.storedBytes + by) } };
  });
}

/**
 * A STRANGER SENDS A FILE. This is the only path in the product where somebody
 * with no account writes bytes, so every one of its refusals is load-bearing:
 *
 * - the form must be open and must ASK this question (a file question's id from
 *   this form's own definition, not "a file question somewhere");
 * - the content type must be one the question accepts, and the size under the
 *   question's own limit — which is itself under what `lib/media` will take;
 * - the form must not already hold its whole allowance. It stops taking files
 *   rather than spending without end, and says so, because an upload that
 *   silently vanished would be an application nobody could finish.
 *
 * The file is stored PRIVATE against the studio, so reading it back is the
 * ordinary membership check `/api/media/<id>` already makes. The id is all the
 * uploader is given, and the id is all the answer stores.
 */
export async function takeUpload(
  slug: string, code: string,
  { questionId, filename, contentType, buffer }: { questionId: string; filename: string; contentType: string; buffer: Buffer },
) {
  const found = await findPublic(slug, code);
  if (!found) return { error: "notfound" };
  const { form, studio, sections } = found;
  if (!accepting(form.status, form.settings, today())) return { error: "closed" };
  const def = defOf(form);
  const question = def.pages.flatMap((p) => p.questions).find((q) => q.id === questionId && isFile(q.type));
  if (!question) return { error: "notfound" };
  if (!buffer?.length) return { error: "empty" };
  if (!fileKindAllowed(question.fileKinds, contentType)) return { error: "file-kind" };
  if (buffer.length > (question.maxFileMb || 1) * 1024 * 1024) return { error: "too-large" };

  const settings = cleanSettings(form.settings, def);
  if (settings.storedBytes + buffer.length > settings.storageMb * 1024 * 1024) return { error: "form-full" };

  const stored = await putMedia({
    buffer, contentType, filename,
    // PRIVATE, AND THE STUDIO'S. The person who sent it is nobody we know, so
    // "who may read this" can only be answered as "whoever may read this
    // studio's files" — which is what the media route already enforces.
    visibility: "private", studioId: String(studio.id), owner: "",
  });
  if ("error" in stored) return { error: String(stored.error) };
  const section = sections.find((s) => s.key === "marketing-forms") as Section;
  await countStorage({ studio, section }, form.id, buffer.length);
  // THE ID, AND NOTHING ELSE. `stored.url` is the media route's path rather
  // than Blob's, but even that would hand a stranger a handle to a file they
  // have just lost the right to read — the studio's members read it, they do
  // not.
  return { id: stored.id, name: String(filename || "file").slice(0, 200), size: stored.size };
}
