// Currency symbols.
//
// Every currency here shows as its LETTERS — the three-letter code — except the
// Saudi riyal, which has its own glyph and is drawn. The glyph inherits
// `currentColor` and is sized in `em`, so it sits on the text baseline at
// whatever size the surrounding type happens to be rather than needing a size
// passed in at every call site.

// The riyal mark, redrawn to inherit colour. The source artwork carries a fixed
// near-black fill, which would have stayed black on a dark background.
export function RiyalMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 1124.14 1256.39"
      className={`inline-block h-[0.95em] w-[0.85em] align-[-0.09em] ${className}`}
      fill="currentColor"
      role="img"
      aria-label="SAR"
    >
      <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z" />
      <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z" />
    </svg>
  );
}

export const isRiyal = (code) => String(code || "").trim().toUpperCase() === "SAR";

// The symbol on its own — for a field label, or beside the currency in settings.
export function CurrencySymbol({ code, className = "" }) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return null;
  return isRiyal(c)
    ? <RiyalMark className={className} />
    : <span className={className}>{c}</span>;
}

// An amount WITH its symbol. Falls back to the bare number when the studio has
// not set a currency, rather than guessing one.
export function Money({ amount, currency, className = "" }) {
  const n = Number(amount);
  const text = Number.isFinite(n) ? n.toLocaleString() : String(amount ?? "");
  if (!currency) return <span className={className}>{text}</span>;
  return (
    <span className={`inline-flex items-baseline gap-1 ${className}`}>
      <CurrencySymbol code={currency} />
      {text}
    </span>
  );
}
