// App-wide display formatters. Dates are dd/mm/yyyy (en-GB); money is shown in
// Saudi Riyals with two decimals and a trailing " SAR" (e.g. "1,500,000.00 SAR").

export function fmtDate(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-GB"); } catch { return String(v); }
}

export function fmtDateTime(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("en-GB"); } catch { return String(v); }
}

export function fmtSAR(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
}
