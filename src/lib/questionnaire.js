// Questionnaire (post-signup) shared data: the package keys the entry-point CTAs
// carry (Small/Medium split into their two headcount bands), a human label for
// each, and the ERP-systems option list for Page 3.
import { PLANS, pick } from "@/lib/pricing";

// Package keys carried on ?package= from the header / pricing CTAs into signup.
// Banded plans split into "-1" / "-2" (band index); micro + large are single.
export const PACKAGE_KEYS = ["micro", "small-1", "small-2", "medium-1", "medium-2", "large"];
export function isPackageKey(k) { return PACKAGE_KEYS.includes(String(k || "")); }

// The pricing plan key behind a package key ("small-2" → "small").
export function planKeyOf(key) { return String(key || "").split("-")[0]; }

// Only Micro is free; every other package requires payment.
export function isFreePackage(key) {
  const plan = PLANS.find((p) => p.key === planKeyOf(key));
  return Boolean(plan?.free);
}

// Human label for a package key, e.g. "Small · 10–25" (with the band range).
export function packageLabel(key, locale = "en") {
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

// ---- the questionnaire itself ----------------------------------------------
// PAGES of questions, not steps: a page carries one question or several, and the
// flow renders whatever is here. This is the shape /super will eventually feed,
// so adding a question later means adding a row here (or serving the same shape
// from the database) rather than writing another screen.
//
// Every `id` is a field the stored answer already has — intent, field, country,
// city, erps — so this describes the EXISTING questionnaire rather than asking
// for anything new. Nothing about what is saved changes.
//
// Types the renderer understands:
//   choice — one of a few options, shown as cards
//   combo  — a searchable list you may also type a value not on it
//   multi  — a searchable list you may pick several from
export const AVERAGE_MINUTES = 2;

export const QUESTION_PAGES = [
  {
    id: "goal",
    title: "What brings you to nompany?",
    lead: "This just shapes what we show you next — you can do both later.",
    // What Nova says while this page is open.
    hint: "No wrong answer here — you can create a studio and join others later.",
    questions: [
      {
        id: "intent",
        type: "choice",
        label: "",
        required: true,
        options: [
          { value: "create", title: "Create a studio", body: "Set up your company's workspace and invite your team into it." },
          { value: "join", title: "Join a studio", body: "Someone shared a company code with you and you're joining their workspace." },
        ],
      },
    ],
  },
  {
    id: "company",
    title: "Tell us about your company",
    lead: "It helps us tune your defaults. Nothing here is published anywhere.",
    hint: "Can't find your industry or city? Type it in — the list is only a shortcut.",
    questions: [
      { id: "field", type: "combo", label: "What field does your company work in?", source: "industries", required: true, placeholder: "Construction" },
      { id: "country", type: "combo", label: "Country", source: "countries", required: true, resets: ["city"] },
      { id: "city", type: "combo", label: "City", source: "cities", dependsOn: "country" },
    ],
  },
  {
    id: "systems",
    title: "Which systems are you running today?",
    lead: "Knowing what you already have tells us what nompany needs to sit alongside.",
    hint: "Pick as many as apply. If you run none, say so — that is a real answer.",
    questions: [
      { id: "erps", type: "multi", label: "ERPs your company already has", source: "erps" },
    ],
  },
];

// A question counts as answered when it has a value; only required ones gate.
export function isAnswered(question, answers) {
  const v = answers?.[question.id];
  return Array.isArray(v) ? v.length > 0 : Boolean(String(v ?? "").trim());
}
export function isPageComplete(page, answers) {
  return (page?.questions || []).every((q) => !q.required || isAnswered(q, answers));
}
// The submit button only exists once every page would pass on its own.
export function isAllComplete(answers) {
  return QUESTION_PAGES.every((p) => isPageComplete(p, answers));
}
