"use client";

import { moneyParts } from "@/lib/format";

// Renders a money value in the tenant's currency. EVERY CURRENCY RENDERS THE
// SAME WAY, by its code.
//
// One used to be special: a single currency was swapped for a hand-drawn glyph
// while every other currency kept its letters. That is one country's money given
// treatment no other gets, in a product sold regionally and then globally, and
// it reads as a statement about where the product is from. Uniform beats
// prettier here. Drop-in replacement for `{fmtMoney(x)}` in JSX — for string
// contexts (titles, exports) keep using fmtMoney/formatMoney.
//
//   <Money value={1500} />            → 1,500.00 USD
//   <Money value={1500} symbolFirst /> → USD 1,500.00   (rare; default is amount-first)
//   no currency set                    → 1,500.00       (the bare number, never a guess)
export default function Money({ value, className, symbolFirst = false }) {
  const p = moneyParts(value);
  if (p.text != null) return <span className={className}>{p.text}</span>;
  if (!p.currency) return <span className={className}>{p.body}</span>;

  const sym = <span>{p.currency}</span>;

  return (
    <span className={className}>
      {symbolFirst ? <>{sym} {p.body}</> : <>{p.body} {sym}</>}
    </span>
  );
}
