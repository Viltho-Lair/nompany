// Currency symbols.
//
// EVERY CURRENCY SHOWS AS ITS LETTERS — the three-letter code. There used to be
// one exception: the Saudi riyal was drawn as a glyph while the other 165 kept
// their letters. That is one country's money given a courtesy no other gets, in
// a product sold regionally and then globally, so the glyph and its component
// are gone rather than hidden.

// The symbol on its own — for a field label, or beside the currency in settings.
export function CurrencySymbol({ code, className = "" }) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return null;
  // ONE TREATMENT FOR ALL 166. There was a branch here that drew the riyal as a
  // glyph and left every other currency as letters — one country's money given
  // a courtesy no other got, in a product sold regionally and then globally.
  return <span className={className}>{c}</span>;
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
