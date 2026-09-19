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
import { cleanAnswers } from "@/lib/questionnaire";
import { visiblePages, visibleQuestions, prunedAnswers } from "@/lib/questionnaireLogic";
import { summariseResponses, responsesToCsv } from "@/lib/questionnaireSummary";
import {
  cleanDefinition, cleanSettings, openProblems, accepting, fromTemplate, newFormCode, answerProblem,
  leadFromAnswers, takesAnswer, FORM_STATUSES, FORM_LOCALES, TEMPLATES,
  type FormDefinition, type FormSettings, type FormQuestion,
} from "./formsModel";
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
  const [campaigns, responses] = await Promise.all([
    campaignChoices(ctx),
    Responses.find(scope(ctx), { where: { formId: id } }),
  ]);
  return {
    form,
    path: publicPath(ctx, form),
    problems: openProblems(defOf(form), form.settings),
    responses: responses.length,
    campaigns,
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
  const campaignProblem = await badCampaign(ctx, settings.campaignId);
  if (campaignProblem) return { error: campaignProblem };
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
    const problems = openProblems(defOf(current), current.settings);
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
  const pages = defOf(form).pages;
  return {
    form: { id: form.id, name: form.name },
    summary: summariseResponses(rows as never, pages as never),
    responses: rows.map((r) => ({ id: r.id, createdAt: r.createdAt, answers: r.answers, ticketId: r.ticketId || "" })),
    csv: () => responsesToCsv(rows as never, pages as never),
  };
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
  const answers = cleanAnswers(body?.answers);
  const shown = visiblePages(def.pages as never, answers)
    .flatMap((p) => visibleQuestions(p as never, def.pages as never, answers)) as unknown as FormQuestion[];
  const kept = prunedAnswers(def.pages as never, answers) as Record<string, unknown>;
  const problem = answerProblem(shown, kept);
  if (problem) return { error: problem.error, questionId: problem.questionId };

  const section = sections.find((s) => s.key === "marketing-forms") as Section;
  const at = now();
  const response = await Responses.create({ studio, section }, {
    formId: form.id,
    answers: kept,
    asked: shown.filter((q) => takesAnswer(q.type)).map((q) => ({ field: q.id, label: q.label, type: q.type })),
    createdAt: at, updatedAt: at,
  });

  if (form.settings.createLead) {
    try {
      const ticketId = await leadFor({ studio, sections, form, answers: kept });
      if (ticketId) await Responses.update({ studio, section }, response.id, { ticketId });
    } catch { /* the answer is stored; a lead that failed to raise is visible as a response with no ticket */ }
  }
  return { ok: true, confirmation: form.settings.confirmation };
}

async function leadFor({ studio, sections, form, answers }: Omit<Found, "form"> & { form: MarketingForm; answers: Record<string, unknown> }) {
  const by = (key: string) => sections.find((s) => s.key === key) || null;
  const salesRoot = by("crm-sales");
  if (!salesRoot || salesRoot.enabled === false) return "";
  const ticketsSection = by("crm-sales-tickets") || salesRoot;
  const clientsSection = by("crm-sales-clients") || salesRoot;
  const settings: FormSettings = form.settings;
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
  });
  return "ticket" in result && result.ticket ? result.ticket.id : "";
}
