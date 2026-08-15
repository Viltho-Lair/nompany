// Quotation + RFQ shared constants. Kept out of lib/technical.js so client
// components can import them without pulling the Redis-backed section store in
// with them — the same split lib/tickets.js makes for Sales.

// A quotation's status is READ OFF WHAT PEOPLE DO TO IT rather than chosen from
// a menu. It arrives New, turns into a Draft the moment somebody opens the
// builder on it, and is only Completed when they submit from inside the builder.
// SAVING IS NOT FINISHING — that distinction is the whole point of the pair.
//
// Sent/Approved/Rejected live on past Completed: what happens to the document
// once it leaves the studio. They stay hand-set, and rows already carrying them
// keep working.
export const QUOTATION_STATUSES = ["New", "Draft", "Completed", "Sent", "Approved", "Rejected"];
export const DEFAULT_QUOTATION_STATUS = "New";

// The three the BUILDER owns. Nobody hand-winds a quotation back into these —
// they are consequences of opening and submitting.
export const BUILDER_STATUSES = ["New", "Draft", "Completed"];
export const DEFAULT_VAT_RATE = 15; // KSA standard rate; per-quotation override

// A quotation raised straight from the Quotations screen has no RFQ behind it,
// so its lead is the company itself rather than a ticket.
export const LEAD_INTERNAL = "Internal";

// Columns the Technical Live view can show. The chosen subset is stored on the
// technical-settings sub-section (settings.liveColumns) and picked in Settings,
// so the Live screen is a projection of the quotations list, not a second
// source of the same data.
export const QUOTATION_LIVE_COLUMNS = [
  { key: "number", label: "Number" },
  { key: "revision", label: "Rev" },
  { key: "title", label: "Title" },
  { key: "clientName", label: "Client" },
  { key: "status", label: "Status" },
  { key: "urgency", label: "Urgency" },
  { key: "handledBy", label: "Handled by" },
  { key: "leadLabel", label: "Lead" },
  { key: "total", label: "Total" },
  { key: "createdAt", label: "Created" },
  { key: "completedAt", label: "Approved" },
];
const QUOTATION_LIVE_KEYS = QUOTATION_LIVE_COLUMNS.map((c) => c.key);
export const DEFAULT_QUOTATION_LIVE_COLUMNS = ["number", "title", "clientName", "status", "total"];

// Keep only known keys, preserve the caller's order, fall back to the default.
export function cleanQuotationLiveColumns(value) {
  const picked = Array.isArray(value) ? value.filter((k) => QUOTATION_LIVE_KEYS.includes(k)) : [];
  return picked.length ? [...new Set(picked)] : [...DEFAULT_QUOTATION_LIVE_COLUMNS];
}

// A quotation nobody has finished — either untouched or mid-build. That is what
// the list's amber stripe marks: work still owed, not work still unsent.
export const isUnfinished = (q) => q?.status === "New" || q?.status === "Draft";

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const MAX_TABLES = 20;
export const MAX_TABLE_ROWS = 200;

// A quotation carries ITS OWN SETUP: the tables it is divided into, the rows in
// each, and a quantity per row. Two quotations for the same client can be built
// differently, so the shape belongs to the quotation and not to a studio-wide
// template.
//
// A row with no description is dropped — a priced line nobody named cannot be
// read on the finished document.
export function cleanQuotationTables(value) {
  return (Array.isArray(value) ? value : []).slice(0, MAX_TABLES).map((t, i) => ({
    id: String(t?.id || `t${i + 1}`).slice(0, 40),
    title: String(t?.title ?? "").trim().slice(0, 120),
    rows: (Array.isArray(t?.rows) ? t.rows : []).slice(0, MAX_TABLE_ROWS).map((r, j) => ({
      id: String(r?.id || `r${j + 1}`).slice(0, 40),
      // WHICH registered item this line came from, kept beside the text rather
      // than instead of it. The text is what the client was quoted and must
      // still read correctly if the catalogue entry is later renamed or
      // deleted; the id is what ties the line back to its home while it exists.
      itemId: String(r?.itemId ?? "").slice(0, 60),
      description: String(r?.description ?? "").trim().slice(0, 300),
      unit: String(r?.unit ?? "").trim().slice(0, 30),
      qty: n(r?.qty),
      unitPrice: n(r?.unitPrice),
    })).filter((r) => r.description),
  }));
}

// The tables are the setup; `items` stays the flat priced list every other
// screen already reads. DERIVING one from the other means the totals, the live
// columns and the analytics keep working without knowing tables exist — and
// there is still only one place a price is stored.
export function itemsFromTables(tables) {
  return (tables || []).flatMap((t) =>
    (t.rows || []).map((r) => ({
      description: t.title ? `${t.title} — ${r.description}` : r.description,
      qty: r.qty,
      unitPrice: r.unitPrice,
    })));
}
