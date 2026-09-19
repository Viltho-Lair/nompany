// MARKETING FORMS' RULES, purely — the owner's approved shape, 19/09/2026.
//
// A form a studio builds and the public answers: an enquiry that becomes a Sales
// lead, an event registration, a customer survey. It is the questionnaire
// builder's data shape — pages of questions, `reveals` for branching, answers
// keyed by `fieldOf` — so lib/questionnaireLogic's branching and
// lib/questionnaireSummary's reports read it unchanged. What is new is who owns
// it (a studio, not nompany), who answers it (anybody, without signing in, as
// many times as they like) and what an answer can become (a Sales lead).
//
// The screen and the server both read this file, so a form the editor shows as
// ready is a form the server will publish. tests/forms-model.mjs asserts it.

/**
 * THE QUESTION TYPES A STUDIO FORM OFFERS — the questionnaire catalogue's, minus
 * what the public page cannot yet take in safely or at all: a file upload and a
 * signature (an anonymous upload is a storage bill anybody can run up), picture
 * choice, ranking and matrix (no answering control yet), and the registration
 * form's screens. A type added here must be one PublicForm renders.
 */
export const FORM_TYPES = [
  "short-text", "long-text", "email", "phone", "number", "date", "website",
  "multiple-choice", "dropdown", "yes-no", "legal", "rating", "opinion-scale", "nps", "statement",
] as const;
export type FormType = (typeof FORM_TYPES)[number];
export const isFormType = (t: unknown): t is FormType => (FORM_TYPES as readonly string[]).includes(String(t));

/** Types that carry a list of choices the author edits. */
export const CHOICE_TYPES = ["multiple-choice", "dropdown", "yes-no", "legal"] as const;
export const hasChoices = (t: unknown) => (CHOICE_TYPES as readonly string[]).includes(String(t));
/** A statement is text on the page, not a question: it takes no answer. */
export const takesAnswer = (t: unknown) => String(t) !== "statement";

export const FORM_STATUSES = ["Draft", "Open", "Closed"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export const FORM_LOCALES = ["en", "ar"] as const;

/** Which answers become which parts of a Sales lead. Each names a question id, or "". */
export type LeadFields = { name: string; company: string; phone: string; email: string };
export const LEAD_FIELD_KEYS = ["name", "company", "phone", "email"] as const;

export type FormQuestion = {
  id: string; type: string; label: string; description?: string; required?: boolean;
  options?: string[]; multiple?: boolean; other?: boolean; placeholder?: string;
  min?: number | null; max?: number | null; minLabel?: string; maxLabel?: string;
  reveals?: { op: string; value?: string; show: string[] }[];
};
export type FormPage = { id: string; title: string; lead?: string; questions: FormQuestion[] };
export type FormDefinition = { pages: FormPage[] };
export type FormSettings = {
  campaignId: string;
  createLead: boolean;
  leadFields: LeadFields;
  confirmation: string;
  closesOn: string;
};

const MAX_PAGES = 20;
const MAX_QUESTIONS = 60;
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const rid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

/**
 * A FORM'S DEFINITION AS THE SERVER WILL STORE IT. Everything is re-derived from
 * what was sent: an unknown type is dropped, a choice list is trimmed, a rule
 * pointing at nothing is dropped. Ids are kept (they bind the answers), and a
 * question missing one gets one, so nothing can be stored without an address.
 */
export function cleanDefinition(input: unknown): FormDefinition {
  const raw = input && typeof input === "object" ? (input as { pages?: unknown }).pages : [];
  const pages: FormPage[] = [];
  let questions = 0;
  for (const p of (Array.isArray(raw) ? raw : []).slice(0, MAX_PAGES)) {
    const page = (p || {}) as Record<string, unknown>;
    const qs: FormQuestion[] = [];
    for (const q of Array.isArray(page.questions) ? page.questions : []) {
      if (questions >= MAX_QUESTIONS) break;
      const src = (q || {}) as Record<string, unknown>;
      if (!isFormType(src.type)) continue;
      const out: FormQuestion = {
        id: /^[a-z0-9_]{3,40}$/i.test(String(src.id || "")) ? String(src.id) : rid("fq"),
        type: String(src.type),
        label: str(src.label, 300),
        description: str(src.description, 1000),
        required: takesAnswer(src.type) && src.required === true,
      };
      if (hasChoices(src.type)) {
        out.options = (Array.isArray(src.options) ? src.options : []).map((o) => str(o, 200)).filter(Boolean).slice(0, 40);
        if (!out.options.length) out.options = src.type === "legal" ? ["I agree"] : ["Choice 1"];
      }
      if (src.type === "multiple-choice") { out.multiple = src.multiple === true; out.other = src.other === true; }
      if (["short-text", "long-text", "email", "phone", "website"].includes(String(src.type))) out.placeholder = str(src.placeholder, 120);
      if (["rating", "opinion-scale", "nps"].includes(String(src.type))) {
        const [lo, hi] = src.type === "nps" ? [0, 10] : src.type === "rating" ? [1, 5] : [1, 5];
        const min = Number(src.min), max = Number(src.max);
        out.min = src.type === "opinion-scale" && Number.isFinite(min) ? Math.max(0, Math.min(1, min)) : lo;
        out.max = src.type === "opinion-scale" && Number.isFinite(max) ? Math.max(3, Math.min(10, max))
          : src.type === "rating" && Number.isFinite(max) ? Math.max(3, Math.min(10, max)) : hi;
        out.minLabel = str(src.minLabel, 60);
        out.maxLabel = str(src.maxLabel, 60);
      }
      if (Array.isArray(src.reveals)) {
        out.reveals = src.reveals.slice(0, 10).map((r) => {
          const rule = (r || {}) as Record<string, unknown>;
          return {
            op: str(rule.op, 20),
            value: str(rule.value, 200),
            show: (Array.isArray(rule.show) ? rule.show : []).map((s) => str(s, 40)).filter(Boolean).slice(0, 20),
          };
        }).filter((r) => r.op && r.show.length);
      }
      qs.push(out);
      questions += 1;
    }
    pages.push({
      id: /^[a-z0-9_]{3,40}$/i.test(String(page.id || "")) ? String(page.id) : rid("fp"),
      title: str(page.title, 200),
      lead: str(page.lead, 1000),
      questions: qs,
    });
  }
  // A RULE MAY ONLY SHOW A QUESTION THAT EXISTS. One naming a deleted question
  // would never fire and nobody would know why (the questionnaire builder's own
  // lesson, logicProblems).
  const ids = new Set(pages.flatMap((p) => p.questions.map((q) => q.id)));
  for (const p of pages) for (const q of p.questions) {
    if (q.reveals) q.reveals = q.reveals.map((r) => ({ ...r, show: r.show.filter((s) => ids.has(s) && s !== q.id) })).filter((r) => r.show.length);
  }
  return { pages };
}

const everyQuestion = (d: FormDefinition) => d.pages.flatMap((p) => p.questions);

/** Settings, cleaned against the definition they belong to. */
export function cleanSettings(input: unknown, def: FormDefinition): FormSettings {
  const s = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const lf = (s.leadFields && typeof s.leadFields === "object" ? s.leadFields : {}) as Record<string, unknown>;
  const ids = new Set(everyQuestion(def).map((q) => q.id));
  const pick = (k: string) => (ids.has(String(lf[k] || "")) ? String(lf[k]) : "");
  const closesOn = str(s.closesOn, 10);
  return {
    campaignId: str(s.campaignId, 60),
    createLead: s.createLead === true,
    leadFields: { name: pick("name"), company: pick("company"), phone: pick("phone"), email: pick("email") },
    confirmation: str(s.confirmation, 1000),
    closesOn: /^\d{4}-\d{2}-\d{2}$/.test(closesOn) ? closesOn : "",
  };
}

/**
 * WHAT STOPS A FORM BEING OPENED TO THE PUBLIC, as tokens the screen puts into
 * words. Checked when it is opened, never while it is being built: a draft is
 * allowed to be unfinished.
 *
 * - `no-questions`: nothing to answer;
 * - `lead-contact`: it makes Sales leads and no answer is a phone or an email
 *   (Sales cannot act on a lead it cannot reach);
 * - `lead-name`: it makes leads and names nobody;
 * - `consent`: it collects contact details and has no required consent
 *   question — the owner's rule, and the law in most of the countries a studio
 *   is in (docs/functionality/forms.md).
 */
export function openProblems(def: FormDefinition, settings: FormSettings): string[] {
  const qs = everyQuestion(def);
  const out: string[] = [];
  if (!qs.some((q) => takesAnswer(q.type))) out.push("no-questions");
  if (settings.createLead) {
    if (!settings.leadFields.phone && !settings.leadFields.email) out.push("lead-contact");
    if (!settings.leadFields.name && !settings.leadFields.company) out.push("lead-name");
  }
  const collectsContact = settings.createLead || qs.some((q) => q.type === "email" || q.type === "phone");
  if (collectsContact && !qs.some((q) => q.type === "legal" && q.required)) out.push("consent");
  return out;
}

/** Whether a form takes answers today — open, and not past its closing date. */
export function accepting(status: string, settings: Pick<FormSettings, "closesOn">, today: string): boolean {
  if (status !== "Open") return false;
  return !settings.closesOn || settings.closesOn >= today;
}

/** The first question of a type, for the lead mapping's defaults. */
const firstOf = (def: FormDefinition, type: string) => everyQuestion(def).find((q) => q.type === type)?.id || "";

/** Sensible lead mapping for a definition: the first name, phone and email questions. */
export function defaultLeadFields(def: FormDefinition): LeadFields {
  return { name: firstOf(def, "short-text"), company: "", phone: firstOf(def, "phone"), email: firstOf(def, "email") };
}

type Answers = Record<string, unknown>;
const text = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? "")).trim();

/**
 * WHAT A SUBMISSION TELLS SALES. The lead's name is the company when one was
 * asked for, else the person; the notes carry every answer as "question: answer"
 * so the executive reads the whole enquiry on the ticket.
 */
export function leadFromAnswers(def: FormDefinition, settings: FormSettings, answers: Answers, formName: string) {
  const at = (id: string) => (id ? text(answers[id]) : "");
  const name = at(settings.leadFields.name);
  const company = at(settings.leadFields.company);
  const lines = everyQuestion(def)
    .filter((q) => takesAnswer(q.type) && q.type !== "legal" && text(answers[q.id]))
    .map((q) => `${q.label || q.id}: ${text(answers[q.id])}`);
  return {
    clientName: (company || name).slice(0, 160),
    contactName: company ? name.slice(0, 120) : "",
    contactPhone: at(settings.leadFields.phone).slice(0, 60),
    contactEmail: at(settings.leadFields.email).slice(0, 200),
    title: formName.slice(0, 200),
    description: lines.join("\n").slice(0, 4000),
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * IS THIS ANSWER ACCEPTABLE, question by question, for the questions this person
 * was actually shown (the caller passes the visible ones). "" or a token naming
 * the first problem: `required`, `email`, `number`, `choice`, `consent`.
 */
export function answerProblem(questions: readonly FormQuestion[], answers: Answers): { questionId: string; error: string } | null {
  for (const q of questions) {
    if (!takesAnswer(q.type)) continue;
    const v = answers[q.id];
    const empty = Array.isArray(v) ? v.length === 0 : !String(v ?? "").trim();
    if (empty) {
      if (q.required) return { questionId: q.id, error: q.type === "legal" ? "consent" : "required" };
      continue;
    }
    if (q.type === "email" && !EMAIL.test(String(v).trim())) return { questionId: q.id, error: "email" };
    if (["number", "rating", "opinion-scale", "nps"].includes(q.type) && !Number.isFinite(Number(v))) return { questionId: q.id, error: "number" };
    if (q.type === "legal" && String(v) !== (q.options || [])[0]) return { questionId: q.id, error: "consent" };
    if (["dropdown", "yes-no"].includes(q.type) && !(q.options || []).includes(String(v))) return { questionId: q.id, error: "choice" };
    if (q.type === "multiple-choice" && !q.other) {
      const picked = Array.isArray(v) ? v : [v];
      if (!picked.every((x) => (q.options || []).includes(String(x)))) return { questionId: q.id, error: "choice" };
    }
  }
  return null;
}

// ---- templates ----------------------------------------------------------------

export const TEMPLATES = ["blank", "enquiry", "event", "feedback"] as const;
export type Template = (typeof TEMPLATES)[number];

type Words = Record<string, { en: string; ar: string }>;
const W: Words = {
  aboutYou: { en: "About you", ar: "معلوماتك" },
  name: { en: "Your name", ar: "اسمك" },
  company: { en: "Company", ar: "الشركة" },
  phone: { en: "Phone", ar: "الهاتف" },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  message: { en: "How can we help?", ar: "كيف يمكننا مساعدتك؟" },
  consent: { en: "Consent", ar: "الموافقة" },
  consentText: {
    en: "I agree to be contacted about my enquiry and for my details to be kept for that purpose.",
    ar: "أوافق على التواصل معي بخصوص طلبي والاحتفاظ ببياناتي لهذا الغرض.",
  },
  agree: { en: "I agree", ar: "أوافق" },
  register: { en: "Register", ar: "التسجيل" },
  attendees: { en: "How many people are coming?", ar: "كم عدد الحضور؟" },
  session: { en: "Which session will you attend?", ar: "أي جلسة ستحضر؟" },
  morning: { en: "Morning", ar: "الصباحية" },
  afternoon: { en: "Afternoon", ar: "المسائية" },
  feedback: { en: "Your feedback", ar: "رأيك" },
  recommend: { en: "How likely are you to recommend us to a friend or colleague?", ar: "ما مدى احتمال أن توصي بنا لصديق أو زميل؟" },
  notLikely: { en: "Not likely", ar: "غير محتمل" },
  veryLikely: { en: "Very likely", ar: "محتمل جدا" },
  rate: { en: "How would you rate our service?", ar: "كيف تقيم خدمتنا؟" },
  wentWell: { en: "What went well?", ar: "ما الذي أعجبك؟" },
  speed: { en: "Speed", ar: "السرعة" },
  workQuality: { en: "Quality", ar: "الجودة" },
  price: { en: "Price", ar: "السعر" },
  staff: { en: "Our people", ar: "فريق العمل" },
  anything: { en: "Anything else you would like to tell us?", ar: "هل هناك ما تود إضافته؟" },
  thanks: { en: "Thank you — we have received your answers.", ar: "شكرا لك — وصلتنا إجاباتك." },
  thanksEnquiry: { en: "Thank you — our team will be in touch shortly.", ar: "شكرا لك — سيتواصل معك فريقنا قريبا." },
  q1: { en: "Question 1", ar: "السؤال 1" },
  page1: { en: "Page 1", ar: "الصفحة 1" },
};

/** A new form from a template, in the form's own language, with fresh ids. */
export function fromTemplate(template: string, locale: string) {
  const l = locale === "ar" ? "ar" : "en";
  const w = (k: string) => W[k][l];
  const q = (type: string, label: string, extra: Partial<FormQuestion> = {}): FormQuestion =>
    ({ id: rid("fq"), type, label, description: "", required: false, ...extra });
  const consent = () => q("legal", w("consentText"), { required: true, options: [w("agree")] });
  let pages: FormPage[];
  let createLead = false;
  let confirmation = w("thanks");
  if (template === "enquiry") {
    pages = [{ id: rid("fp"), title: w("aboutYou"), lead: "", questions: [
      q("short-text", w("name"), { required: true }), q("short-text", w("company")),
      q("phone", w("phone")), q("email", w("email")),
      q("long-text", w("message")), consent(),
    ] }];
    createLead = true;
    confirmation = w("thanksEnquiry");
  } else if (template === "event") {
    pages = [{ id: rid("fp"), title: w("register"), lead: "", questions: [
      q("short-text", w("name"), { required: true }), q("email", w("email"), { required: true }),
      q("phone", w("phone")), q("short-text", w("company")),
      q("number", w("attendees"), { min: 1 }),
      q("multiple-choice", w("session"), { options: [w("morning"), w("afternoon")], multiple: false, other: false }),
      consent(),
    ] }];
  } else if (template === "feedback") {
    pages = [{ id: rid("fp"), title: w("feedback"), lead: "", questions: [
      q("nps", w("recommend"), { required: true, min: 0, max: 10, minLabel: w("notLikely"), maxLabel: w("veryLikely") }),
      q("rating", w("rate"), { min: 1, max: 5 }),
      q("multiple-choice", w("wentWell"), { options: [w("speed"), w("workQuality"), w("price"), w("staff")], multiple: true, other: false }),
      q("long-text", w("anything")),
    ] }];
  } else {
    pages = [{ id: rid("fp"), title: w("page1"), lead: "", questions: [q("short-text", w("q1"))] }];
  }
  // STORED AS A SAVE WOULD STORE IT, so a form fresh from a template and the
  // same form saved once without a change are the same document.
  const def = cleanDefinition({ pages });
  const settings: FormSettings = {
    campaignId: "", createLead, leadFields: defaultLeadFields(def), confirmation, closesOn: "",
  };
  if (template === "enquiry") settings.leadFields.company = def.pages[0].questions[1].id;
  return { definition: def, settings };
}

/** A code for the public address: letters and digits, long enough that nobody guesses one. */
export function newFormCode(): string {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  // THE PLATFORM'S RANDOMNESS, not Math.random: the code is the only thing
  // standing between a draft nobody opened and a stranger reading its answers.
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}
