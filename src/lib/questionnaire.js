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
