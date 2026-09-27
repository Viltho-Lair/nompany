// The account hub's shared look, in one place.
//
// Split out of AccountHome when the create-studio screen moved into its own
// file: both draw the same inputs and buttons, and two copies of a class
// string are two looks the first time one of them is touched.

// In the public site's hand (27/09/2026): medium weights and tight tracking
// rather than Saira at 800, inset rings rather than borders, and its primary
// button — ink on light, the site's near-white on dark — rather than a blue one.
export const H2 = "text-lg font-600 tracking-[-0.02em] text-slate-900 dark:text-white";
export const SUB = "mt-1 text-sm text-slate-500 dark:text-slate-400";
export const INPUT =
  "w-full rounded-xl border-0 bg-slate-900/[0.03] px-3.5 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-900/10 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-white/[0.04] dark:text-white dark:ring-white/10 dark:placeholder:text-white/35";
export const LABEL = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
export const BTN = "rounded-full bg-slate-900 px-4 py-2 text-sm font-500 text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:bg-[#ececf1] dark:text-[#0b0b10] dark:hover:bg-white dark:focus-visible:ring-offset-[#07070a]";
export const BTN_GHOST = "rounded-full bg-slate-900/[0.03] px-4 py-2 text-sm font-500 text-slate-700 ring-1 ring-inset ring-slate-900/10 transition-colors hover:bg-slate-900/[0.06] disabled:opacity-60 dark:bg-white/[0.05] dark:text-slate-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:ring-white/10 dark:hover:bg-white/[0.09]";
export const BANNER_BAD = "rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300";
// Google Account's grouped "stack": 24px on the outer corners (the site's radius), 4px inside, 2px
// between rows, 56px min-height, 12px/16px padding, 12px icon gap. Shared since
// the Security page's blocks moved into their own files (18/09/2026).
export const STACK = "flex flex-col gap-[2px]";
export const ROW =
  "flex min-h-[56px] w-full items-center gap-3 rounded-[4px] bg-white px-4 py-3 text-start first:rounded-t-[24px] last:rounded-b-[24px] dark:bg-white/[0.035]";
export const ROW_TAP = "transition-colors hover:bg-slate-50 dark:hover:bg-white/5";
export const ROW_LABEL = "text-base font-500 leading-normal text-slate-900 dark:text-white";
export const ROW_VALUE = "truncate text-sm leading-[1.4286] text-slate-500 dark:text-slate-400";
export const BANNER_GOOD = "rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";

// A studio address is Latin letters, digits and hyphens (SLUG_RE in keys.ts),
// which is why this is not shared/slug's slugify: that one keeps Arabic for
// public detail pages, and an Arabic studio address would only be refused.
export const slugify = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
