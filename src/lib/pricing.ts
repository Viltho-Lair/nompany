// THE COMMERCIAL MODEL — what the plans are, and who they are for.
//
// WHAT LEFT THIS FILE, 22/09/2026, and why it is worth knowing it was here.
// This carried a complete SAR price list from before the pivot: a mandatory
// CORE fee of 750, capacity multipliers in TIERS, a per-department price list
// in DEPARTMENTS, bundles in PRESETS, computePlan() to add them up, a VAT rate,
// a yearly discount, and a CURRENCIES table with its own hand-written exchange
// rates — including SAR_PER_USD = 3.75 — and convertFromSar() to apply them.
//
// NOTHING READ ANY OF IT. Two files import from this module: the pricing board
// takes fmtCurrencyAmount, and the registration questionnaire takes PLANS and
// pick. Everything else was reachable from nothing — a second pricing model
// sitting beside the real one, in a second currency, with its own frozen
// exchange rates a metre from the live FX table that the pricing payload
// already ships. The danger was never that it ran. It was that it looked
// authoritative to the next person deciding where prices come from.
//
// WHERE PRICES ACTUALLY COME FROM: the package catalogue in /super, read by
// buildPricing (modules/marketing/pricing) for the public page and by planOf
// (lib/plans) for what a studio may do.
//
// WHAT THIS FILE STILL DECLARES is WHO each plan is for — the headcount bands
// and the words describing them — which PLAN_HEADCOUNTS below hands to the
// marketing copy's guard. The per-employee rates left in `bands` are the
// authored intent that has never been entered into that catalogue, and they
// stay because they are the only surviving record of it: deleting them would
// destroy the numbers somebody needs in order to fill /super in. Once the
// catalogue holds real packages, `bands` can go too.

// Locale picker for the {en, ar} label objects below.
export function pick(obj: Record<string, string> | null | undefined, locale: string) {
  if (!obj) return "";
  return obj[locale] ?? obj.en ?? "";
}


/** One price band: everybody up to `upTo` employees pays `rate` each. */
export type PlanBand = { upTo: number; rate: number; label: string };

/**
 * A HEADCOUNT PACKAGE from the public pricing page. Distinct from the in-app
 * à-la-carte model above: this is what a company chooses at signup, and it is
 * what `seatLimitForPackage` gates a studio on.
 *
 * `bands` is absent on the free tier, which has no per-employee rate to step.
 */
export type Plan = {
  key: string;
  free?: boolean;
  minUsers: number;
  /** null on the largest tier, which is unlimited. */
  maxUsers: number | null;
  defaultUsers?: number;
  bands?: PlanBand[];
  /** The top tier bills on headcount after the fact rather than on a band. */
  invoicedMonthly?: boolean;
  unlimited?: boolean;
  name: Record<string, string>;
  tagline: Record<string, string>;
  users: Record<string, string>;
  cta: string;
  popular?: boolean;
  features: Record<string, string[]>;
};

export const PLANS: Plan[] = [
  {
    key: "micro",
    free: true, minUsers: 1, maxUsers: 9,
    name: { en: "Micro", ar: "متناهية الصغر" },
    tagline: { en: "Micro-businesses — fewer than 10 employees.", ar: "المنشآت متناهية الصغر — أقل من 10 موظفين." },
    users: { en: "1–9 users", ar: "1–9 مستخدمين" },
    cta: "start",
    features: {
      en: ["Full platform — every department", "Up to 9 employees", "English & Arabic, RTL-ready", "Community support"],
      ar: ["المنصة كاملة — كل الأقسام", "حتى 9 موظفين", "عربي وإنجليزي، يدعم RTL", "دعم عبر المجتمع"],
    },
  },
  {
    key: "small",
    minUsers: 10, maxUsers: 49, defaultUsers: 15,
    bands: [{ upTo: 25, rate: 150, label: "10–25" }, { upTo: 49, rate: 175, label: "26–49" }],
    name: { en: "Small", ar: "صغيرة" },
    tagline: { en: "Small companies — 10 to 49 employees.", ar: "الشركات الصغيرة — من 10 إلى 49 موظفا." },
    users: { en: "10–49 users", ar: "10–49 مستخدما" },
    cta: "choose",
    features: {
      en: ["Everything in Micro", "10–49 employees", "Priced by your team size", "Priority email support"],
      ar: ["كل ما في متناهية الصغر", "من 10 إلى 49 موظفا", "التسعير حسب حجم فريقك", "دعم بريدي ذو أولوية"],
    },
  },
  {
    key: "medium",
    minUsers: 50, maxUsers: 249, defaultUsers: 75, popular: true,
    bands: [{ upTo: 99, rate: 200, label: "50–99" }, { upTo: 249, rate: 225, label: "100–249" }],
    name: { en: "Medium", ar: "متوسطة" },
    tagline: { en: "Medium-sized companies — 50 to 249 employees.", ar: "الشركات المتوسطة — من 50 إلى 249 موظفا." },
    users: { en: "50–249 users", ar: "50–249 مستخدما" },
    cta: "choose",
    features: {
      en: ["Everything in Small", "50–249 employees", "Priced by your team size", "Guided onboarding"],
      ar: ["كل ما في الصغيرة", "من 50 إلى 249 موظفا", "التسعير حسب حجم فريقك", "إعداد موجه"],
    },
  },
  {
    key: "large",
    invoicedMonthly: true, minUsers: 250, maxUsers: null, unlimited: true,
    name: { en: "Large", ar: "كبيرة" },
    tagline: { en: "Large enterprises — 250 or more employees.", ar: "المؤسسات الكبيرة — 250 موظفا أو أكثر." },
    users: { en: "250+ users", ar: "250+ مستخدما" },
    cta: "contact",
    features: {
      en: ["Everything in Medium", "Unlimited employees", "Invoiced monthly by headcount", "Dedicated support & SLA"],
      ar: ["كل ما في المتوسطة", "موظفون بلا حدود", "فاتورة شهرية حسب عدد الموظفين", "دعم مخصص واتفاقية مستوى خدمة"],
    },
  },
];


// Format an amount (already in the target currency) — SAR keeps up to 2 decimals
// like the authored prices; converted currencies round to whole units.
export function fmtCurrencyAmount(amount: number | string, code: string) {
  const digits = code === "SAR" ? 2 : 0;
  return Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}


/* THE HEADCOUNTS THE COMMERCIAL MODEL DECLARES — the one place anything may
   learn where the free tier ends or where a paid plan begins.
   ---------------------------------------------------------------------------
   THE SAME NUMBER WAS TYPED IN SIXTEEN PLACES. `PLANS` says the free tier ends
   at nine; so did eight English marketing strings and their eight Arabic twins,
   each written by hand — "free for teams of one to nine", "up to 9 employees",
   "free until you are ten people" — plus `planOf`'s `maxMembers`, read from a
   package somebody types into /super. Nothing joined them, so moving the
   boundary meant finding every sentence that mentions it, and missing one meant
   the site advertising a limit the product no longer has. That is exactly how
   the platform page came to promise sixteen departments beside eighteen.

   THE COPY IS NOT INTERPOLATED FROM THESE, DELIBERATELY. A sentence built from
   `Free for teams of one to ${n}` reads well in English and badly in Arabic,
   where the numeral agrees with what it counts; the marketing copy keeps its
   prose and `tests/marketing-model.mjs` asserts that no string states a
   headcount this model does not declare. That is the same shape the departments
   claim already uses — a word map and an assertion rather than a template —
   and it is why the Arabic reads like Arabic. */
export const PLAN_HEADCOUNTS = {
  /** The last headcount that pays nothing. */
  get freeUpTo(): number {
    const free = PLANS.find((p) => p.free);
    return Number(free?.maxUsers) || 0;
  },
  /** The first headcount that pays. */
  get paidFrom(): number {
    const free = PLANS.find((p) => p.free);
    return (Number(free?.maxUsers) || 0) + 1;
  },
  /** Where the invoiced-on-headcount tier starts. */
  get invoicedFrom(): number {
    const top = PLANS.find((p) => p.invoicedMonthly);
    return Number(top?.minUsers) || 0;
  },
  /** Every boundary the model declares, for the guard in the marketing suite. */
  get declared(): number[] {
    const out = new Set<number>();
    for (const p of PLANS) {
      if (Number.isFinite(p.minUsers)) out.add(Number(p.minUsers));
      if (p.maxUsers != null && Number.isFinite(p.maxUsers)) out.add(Number(p.maxUsers));
    }
    return [...out].sort((a, b) => a - b);
  },
};
