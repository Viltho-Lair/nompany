// Questionnaire (post-signup) shared data: the package keys the entry-point CTAs
// carry (Small/Medium split into their two headcount bands), a human label for
// each, and the ERP-systems option list for Page 3.
import { PLANS, pick } from "@/lib/pricing";

// Package keys carried on ?package= from the header / pricing CTAs into signup.
// Banded plans split into "-1" / "-2" (band index); micro + large are single.
export const PACKAGE_KEYS = ["micro", "small-1", "small-2", "medium-1", "medium-2", "large"];
export function isPackageKey(k: unknown) { return PACKAGE_KEYS.includes(String(k || "")); }

// The pricing plan key behind a package key ("small-2" → "small").
export function planKeyOf(key: unknown) { return String(key || "").split("-")[0]; }

// Only Micro is free; every other package requires payment.
export function isFreePackage(key: string) {
  const plan = PLANS.find((p) => p.key === planKeyOf(key));
  return Boolean(plan?.free);
}

// Human label for a package key, e.g. "Small · 10–25" (with the band range).
export function packageLabel(key: string, locale = "en") {
  const [base, bandStr] = String(key || "").split("-");
  const plan = PLANS.find((p) => p.key === base);
  if (!plan) return "";
  const name = pick(plan.name, locale);
  if (plan.bands && bandStr) {
    const band = plan.bands[Number(bandStr) - 1];
    return band ? `${name} · ${band.label}` : name;
  }
  return name;
}

// ERP systems for Page 3 "Which ERPs do your company have already?" — a
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
  {
    id: "qpg_reg_company",
    title: "Tell us about your company",
    lead: "It helps us tune your defaults. Nothing here is published anywhere.",
    hint: "Can't find your industry or city? Type it in — the list is only a shortcut.",
    questions: [
      { id: "qsn_reg_field", type: "dropdown", key: "field", label: "What field does your company work in?", required: true, source: "industries", placeholder: "Construction", options: [] },
      { id: "qsn_reg_country", type: "dropdown", key: "country", label: "Country", required: true, source: "countries", options: [], resets: ["city"] },
      { id: "qsn_reg_city", type: "dropdown", key: "city", label: "City", required: false, source: "cities", dependsOn: "country", options: [] },
    ],
  },
  {
    id: "qpg_reg_systems",
    title: "Which systems are you running today?",
    lead: "Knowing what you already have tells us what nompany needs to sit alongside.",
    hint: "Pick as many as apply. If you run none, say so — that is a real answer.",
    questions: [
      { id: "qsn_reg_erps", type: "multiple-choice", key: "erps", label: "ERPs your company already has", required: false, multiple: true, source: "erps", options: [], vertical: false },
    ],
  },
];

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
