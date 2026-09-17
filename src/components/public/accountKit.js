// The account hub's shared look, in one place.
//
// Split out of AccountHome when the create-studio screen moved into its own
// file: both draw the same inputs and buttons, and two copies of a class
// string are two looks the first time one of them is touched.

export const H2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
export const SUB = "mt-1 text-sm text-slate-500 dark:text-slate-400";
export const INPUT =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
export const LABEL = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
export const BTN = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
export const BTN_GHOST = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
export const BANNER_BAD = "rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300";
export const BANNER_GOOD = "rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";

// A studio address is Latin letters, digits and hyphens (SLUG_RE in keys.ts),
// which is why this is not shared/slug's slugify: that one keeps Arabic for
// public detail pages, and an Arabic studio address would only be refused.
export const slugify = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
