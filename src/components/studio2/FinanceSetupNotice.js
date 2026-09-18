"use client";

import Link from "next/link";
import { useStudioLocale } from "@/components/studio2/locale";
import { financeDict } from "@/shared/studio/finance";

// WHAT FINANCE NEEDS SET UP AND DOES NOT HAVE — said before it bites.
//
// The owner's rule, 18/09/2026: the studio's COUNTRY sets its market, and the
// product annotates the setup that matters. Each item is computed on the
// server (`financeSetup`, modules/finance/setup) from the studio row and its
// country's definition; this only words them. Nothing here blocks anything —
// the refusals stay where they are, and this is what makes them unsurprising.
//
// Drawn only when something is missing, and it names who can fix it: a link
// for somebody who may edit Studio settings, a sentence for everybody else.
export default function FinanceSetupNotice({ items = [], slug, canFix }) {
  const locale = useStudioLocale();
  const tr = financeDict(locale);
  if (!items.length) return null;
  const lang = locale === "ar" ? "ar" : "en";
  // THE COUNTRY'S VALUES ARE ONE LINE, not one each: a national address alone is
  // six fields, and ten bullets bury the two that are about something else.
  const sep = lang === "ar" ? "، " : ", ";
  const labels = (state) => items.filter((i) => i.label && i.state === state).map((i) => i.label[lang]).join(sep);
  const lines = [
    ...items.filter((i) => !i.label).map((i) => ({ key: i.key, text: tr.setupItem(i.key) })),
    ...(labels("missing") ? [{ key: "missing", text: tr.setupOfficialMissing(labels("missing")) }] : []),
    ...(labels("invalid") ? [{ key: "invalid", text: tr.setupOfficialInvalid(labels("invalid")) }] : []),
  ];
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-400/30 dark:bg-amber-500/10">
      <p className="text-sm font-700 text-amber-900 dark:text-amber-200">{tr.setupTitle}</p>
      <ul className="mt-1 list-disc space-y-0.5 ps-5 text-sm text-amber-900 dark:text-amber-100">
        {lines.map((l) => <li key={l.key}>{l.text}</li>)}
      </ul>
      <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
        {canFix
          ? <Link href={`/${slug}/settings`} className="font-600 underline">{tr.setupFix}</Link>
          : tr.setupAsk}
      </p>
    </section>
  );
}
