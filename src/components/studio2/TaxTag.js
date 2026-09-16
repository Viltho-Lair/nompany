"use client";

import { useStudioLocale } from "@/components/studio2/locale";
import { taxDict } from "@/shared/studio/tax";

// A LINE THAT IS NOT STANDARD SAYS SO, beside its description or price: a
// zero-rated line reads exactly like a taxed one otherwise, and a document's
// VAT would look wrong to anybody who did not know. One component for the
// invoice, bill, sales order and quotation screens, so the tag reads the same
// wherever a line carries a category. A standard line shows nothing.
export default function TaxTag({ category }) {
  const tag = taxDict(useStudioLocale()).tag(category);
  if (!tag) return null;
  return (
    <span className="ms-2 rounded bg-slate-200 px-1.5 py-0.5 font-sans text-[10px] font-700 text-slate-600 dark:bg-white/10 dark:text-slate-300">
      {tag}
    </span>
  );
}
