// Questionnaire (post-signup) shared data: the registration questionnaire's
// seed, the rule that retires what moved out of it, and the ERP-systems option
// list, which studio creation asks from now.
//
// THE PACKAGE KEYS LEFT, 24/09/2026. This file carried `micro`, `small-1` …
// and a label for each, for a `?package=` that the pricing links sent and
// nothing on signup ever read. The choice is a signed cookie now, naming
// catalogue ids (platform/auth/purchaseIntent), so these names had nothing left
// to name.

// ERP systems for "Which ERPs does your company have already?" — asked in studio creation. A
// searchable multi-select. "None" is exclusive (locks the rest); "Not Listed"
// reveals a free-text field. Order preserved from the spec.
export const ERP_NONE = "None — We do not use an ERP system";
export const ERP_OTHER = "Not Listed";
export const ERP_SYSTEMS = [
  ERP_NONE,
  "SAP S/4HANA & SAP ERP",
  "Oracle Fusion Cloud ERP",
  "Microsoft Dynamics 365",
  "Workday",
  "Infor CloudSuite",
  "Oracle NetSuite",
  "Acumatica",
  "Sage (Intacct & X3)",
  "Epicor (Kinetic)",
  "Odoo ERP",
  "IFS Cloud",
  "SYSPRO",
  "Deltek (Costpoint)",
  "Exact (ExactOnline & Macola)",
  "Visma",
  "Yonyou",
  "Aptean",
  "TallyPrime",
  "Certinia",
  "abas ERP",
  "Apache OFBiz",
  "Local Application",
  ERP_OTHER,
];

// ---- the registration questionnaire ----------------------------------------
// This is the SEED for the questionnaire everyone answers after registering. It
// is written in the BUILDER'S OWN SHAPE — the same pages-and-elements a
// questionnaire authored in /super produces — so it is not a second format that
// has to be kept in step. On first use it is planted in the builder under the
// name below, attached to the route below, and from then on the live screen
// reads the builder's copy: edit it there and the change is what people see.
//
// `key` is what makes a question bind to a stored answer field. Without one an
// element is just a question; with one, what it collects lands on that field of
// the saved record. The five keys here are exactly the fields the record has
// always had, so wiring the screen to the builder changed no stored data.
//
// `source` binds an option list to a built-in list rather than typed choices —
// industries, countries, cities and ERPs are far too long to author by hand and
// two of them depend on other answers.
export const REGISTRATION_ROUTE = "/questionnaire";
export const REGISTRATION_NAME = "Registration questionnaire";
export const AVERAGE_MINUTES = 2;

// WHAT `intent` IS ALLOWED TO BE. Lives here rather than in identity.ts because
// two things now need it and they must not each keep a copy: the save that
// refuses anything else, and the readiness check that tells an author BEFORE
// they publish that their form can no longer produce one.
export const INTENTS = ["create", "join"];

// THE COMPANY LEFT THE QUESTIONNAIRE, 24/09/2026 — the owner: merge it into
// studio creation, except what is about the PERSON. Field, country, city and
// the ERPs in use describe a company, and a company is a studio: they are asked
// where the studio is made now, and they land ON it, where the country sets the
// currency and the rules the studio runs by. Here they were stored on the
// person and read by nothing at all.
//
// What stays is about the person — what brings them here — and anything an
// author adds in /super.
export const QUESTION_PAGES = [
  {
    id: "qpg_reg_goal",
    title: "What brings you to nompany?",
    lead: "This just shapes what we show you next — you can do both later.",
    hint: "No wrong answer here — you can create a studio and join others later.",
    questions: [
      {
        id: "qsn_reg_intent",
        type: "multiple-choice",
        key: "intent",
        label: "",
        description: "",
        required: true,
        vertical: true,
        multiple: false,
        options: ["Create a studio", "Join a studio"],
        // The record stores "create"/"join", not the wording on the card, so the
        // label can be reworded without invalidating every answer already given.
        optionValues: ["create", "join"],
        optionNotes: [
          "Set up your company's workspace and invite your team into it.",
          "Someone shared a company code with you and you're joining their workspace.",
        ],
      },
    ],
  },
];

/**
 * WHAT MOVED OUT OF A REGISTRATION QUESTIONNAIRE ALREADY PLANTED.
 *
 * The seed is planted once and the stored copy wins for ever after
 * (ensureQuestionnaireForRoute), so taking questions out of the seed reaches
 * no environment that already has one — every live one. This is the one edit
 * that travels: these four questions, by the ids the seed gave them, and the
 * two seed pages if nothing is left on them. Nothing an author added is
 * touched, a page they put a question of their own on is kept, and the
 * `marker` makes it happen once — re-adding a question later is their call.
 */
export type Retirement = { marker: string; questionIds: string[]; pageIds: string[] };
type RetirablePage = { id?: string; questions?: { id?: string }[] };

/**
 * A form's pages with a retirement applied — the named questions gone, and the
 * named pages dropped only if that left them empty. Pure, so what the stored
 * copy becomes is asserted without a database; the data layer adds the
 * once-only marker and the write.
 */
export function withoutRetired<P extends RetirablePage>(pages: P[], { questionIds, pageIds }: Retirement): P[] {
  const drop = new Set(questionIds);
  const emptyable = new Set(pageIds);
  return (pages || [])
    .map((p) => ({ ...p, questions: (p.questions || []).filter((q) => !drop.has(String(q?.id || ""))) }))
    .filter((p) => !(emptyable.has(String(p.id || "")) && p.questions.length === 0));
}

export const RETIRED_FROM_REGISTRATION: Retirement = {
  marker: "company-to-studio-creation-2026-09-24",
  questionIds: ["qsn_reg_field", "qsn_reg_country", "qsn_reg_city", "qsn_reg_erps"],
  pageIds: ["qpg_reg_company", "qpg_reg_systems"],
};


/**
 * ONE QUESTION, as far as completeness is concerned. Deliberately structural
 * and not the whole element: the pages above carry `type`, `source`, `options`
 * and half a dozen presentation fields, and none of them decide whether the
 * question has been answered.
 */
export type QuestionnaireQuestion = { id?: string; key?: string; required?: boolean };

// A question binds to `key` when it has one; otherwise it answers to its own id,
// which is what an author-created question does until it is given a field.
export const fieldOf = (q: QuestionnaireQuestion | null | undefined) => q?.key || q?.id || "";

export function isAnswered(
  question: QuestionnaireQuestion | null | undefined,
  answers: Record<string, unknown> | null | undefined,
) {
  const v = answers?.[fieldOf(question)];
  return Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim());
}
export function isPageComplete(
  page: { questions?: QuestionnaireQuestion[] } | null | undefined,
  answers: Record<string, unknown> | null | undefined,
) {
  return (page?.questions || []).every((q) => !q.required || isAnswered(q, answers));
}
export function isAllComplete(
  pages: { questions?: QuestionnaireQuestion[] }[] | null | undefined,
  answers: Record<string, unknown> | null | undefined,
) {
  return (pages || []).every((p) => isPageComplete(p, answers));
}

// ---- what an answer may be, once it has crossed the wire -------------------

/** Every shape an answer is allowed to take once stored. */
export type AnswerValue = string | string[] | number | boolean;

// The bounds. A questionnaire is authored in /super and answered by anyone who
// registers, so the body arriving here is a stranger's — and the fields on it
// are whatever the form happens to ask, which is exactly why they cannot be
// whitelisted by name the way the six built-in ones were.
const MAX_FIELDS = 200;
const MAX_KEY = 80;
const MAX_TEXT = 2000;
const MAX_LIST = 50;
const MAX_LIST_ITEM = 200;

// ---- can this form still finish a registration? ----------------------------

/**
 * AN AUTHOR IS ALLOWED TO BREAK THIS, AND THAT IS THE RIGHT RULE — provided the
 * breakage is visible before it reaches anybody registering.
 *
 * The registration questionnaire is a GATE: `saveQuestionnaire` refuses a body
 * whose `intent` is not one of INTENTS, and `needsQuestionnaire` holds every
 * surface behind sign-in until `completedAt` is written. So a form edited into
 * a shape that cannot produce an `intent` does not fail loudly — it lets people
 * fill it in, answer every question, press the button, and be refused, with no
 * way forward and nothing on the screen explaining why.
 *
 * Four ways that happens, and every one is decidable from the form alone. This
 * is deliberately NOT a refusal to save: the author may be mid-edit, or may be
 * building a form for some other route entirely. It is what the builder and the
 * preview say out loud, so "there is a clear path with answers" is something
 * somebody has checked rather than assumed.
 *
 * Only meaningful for the form at REGISTRATION_ROUTE. Any other questionnaire
 * has no such contract and gets no such warning.
 */
export function registrationProblems(
  pages: { questions?: QuestionnaireQuestion[] }[] | null | undefined,
  { reachable }: { reachable?: (id: string) => boolean } = {},
): string[] {
  type Q = QuestionnaireQuestion & {
    id?: string; type?: string; options?: string[]; optionValues?: string[];
  };
  const questions = (pages || []).flatMap((p) => (p?.questions || []) as Q[]);
  const bound = questions.filter((q) => fieldOf(q) === "intent");
  const out: string[] = [];

  if (bound.length === 0) {
    return ["No question on this form is stored as `intent`. Registration cannot finish without one — "
      + "give a question the key `intent`, with the answers `create` and `join`."];
  }
  if (bound.length > 1) {
    out.push(`${bound.length} questions are stored as \`intent\`. They overwrite each other, and which one wins depends on the order they are answered in.`);
  }

  for (const q of bound) {
    const name = q.id || "the intent question";
    // BEHIND A RULE means somebody can reach the end without being asked it,
    // and a form that finishes without an intent is a form that is refused.
    if (reachable && q.id && !reachable(String(q.id))) {
      out.push(`\`${name}\` can never be shown — nothing reveals it, so nobody can answer it.`);
    }
    if (!q.required) {
      out.push(`\`${name}\` is optional. Somebody can skip it, and the save is then refused with nothing on screen to say why.`);
    }
    // The stored values, not the labels: the save compares what lands in the
    // answer, which is optionValues where a question has them.
    const values = (Array.isArray(q.optionValues) && q.optionValues.length ? q.optionValues : q.options) || [];
    const stored = values.map((v) => String(v));
    const missing = INTENTS.filter((i) => !stored.includes(i));
    if (stored.length === 0) {
      out.push(`\`${name}\` has no fixed choices, so what somebody types will almost never be exactly \`create\` or \`join\`.`);
    } else if (missing.length) {
      out.push(`\`${name}\` cannot produce ${missing.map((m) => `\`${m}\``).join(" or ")}. Its stored answers are ${stored.map((s) => `\`${s}\``).join(", ")}.`);
    }
  }
  return out;
}

/**
 * AN OPEN ANSWER MAP, BOUNDED RATHER THAN WHITELISTED.
 *
 * `saveQuestionnaire` used to accept six named fields and drop everything else
 * on the floor — so every question an author added in the builder was asked,
 * answered, posted, and silently discarded, with the submit reporting success.
 * A whitelist cannot work here: the whole point of the builder is that nobody
 * knows the field names at compile time.
 *
 * So the shape is open and the SIZE is closed. Anything that is not a string,
 * a list of strings, a number or a boolean is dropped, because nothing the
 * screen can produce is anything else and a nested object is how a body turns
 * into a storage bill.
 */
export function cleanAnswers(input: unknown): Record<string, AnswerValue> {
  const out: Record<string, AnswerValue> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [rawKey, value] of Object.entries(input as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_FIELDS) break;
    const key = String(rawKey).trim().slice(0, MAX_KEY);
    if (!key) continue;
    if (Array.isArray(value)) {
      out[key] = value.slice(0, MAX_LIST).map((v) => String(v ?? "").slice(0, MAX_LIST_ITEM));
    } else if (typeof value === "number") {
      // NaN and Infinity are not answers; they are what a blank number field
      // becomes on the way through arithmetic nobody meant to do.
      if (Number.isFinite(value)) out[key] = value;
    } else if (typeof value === "boolean") {
      out[key] = value;
    } else if (typeof value === "string") {
      out[key] = value.slice(0, MAX_TEXT);
    }
    // Anything else — objects, null, undefined, functions — is not an answer.
  }
  return out;
}
