"use client";

import { moneyParts } from "@/lib/format";
import Riyal from "@/components/Riyal";

// Renders a money value in the tenant's currency, showing the Saudi Riyal
// GLYPH (2025 official mark) instead of the "SAR" text when the currency is
// SAR; other currencies keep their code. Drop-in replacement for `{fmtMoney(x)}`
// in JSX — for string contexts (titles, exports) keep using fmtMoney/formatMoney.
//
//   <Money value={1500} />            → 1,500.00 ﷼
//   <Money value={1500} symbolFirst /> → ﷼ 1,500.00   (rare; default is amount-first)
export default function Money({ value, className, symbolFirst = false }) {
  const p = moneyParts(value);
  if (p.text != null) return <span className={className}>{p.text}</span>;

  const sym =
    p.currency === "SAR"
      ? <Riyal className="inline-block h-[0.92em] w-[0.82em] align-[-0.08em]" />
      : <span>{p.currency}</span>;

  return (
    <span className={className}>
      {symbolFirst ? <>{sym} {p.body}</> : <>{p.body} {sym}</>}
    </span>
  );
}
