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

// A quotation that has LEFT THE BUILDER. Sales is waiting on Technical for
// exactly as long as this is false: until the document is submitted (or turned
// down) there is nothing to read, nothing to price the ticket from, and no
// second RFQ to raise. Everything past Completed still counts — a Sent or
// Approved quotation is finished work, not work in progress.
export const FINISHED_QUOTATION_STATUSES = ["Completed", "Sent", "Approved", "Rejected"];
export const isFinishedQuotation = (q) => FINISHED_QUOTATION_STATUSES.includes(q?.status);

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
// ONE ROW PER REGISTERED ITEM, PER TABLE — enforced here as well as on the
// screen, because this is the last place before the document is stored.
//
// The same catalogue entry twice in one table is two lines quoting the same
// thing, and the quantity column is how you ask for more of something. It also
// breaks what is drawn from the quotation afterwards: the project sheet takes a
// line per row, so two rows for one item become two competing answers to "how
// many were sold".
//
// The REPEAT keeps its text and loses its item, rather than being dropped: what
// somebody typed is still a line they meant to quote, it is simply not the
// registered item any more. Dropping the row would silently delete work.
//
// Per TABLE, not per document — the same item under "Ground floor" and again
// under "First floor" is two pieces of work, which is what tables are for. And
// an unlisted line has no itemId, so any number of them pass through untouched.
function oneRowPerItem(rows) {
  const seen = new Set();
  return rows.map((r) => {
    if (!r.itemId) return r;
    if (seen.has(r.itemId)) return { ...r, itemId: "" };
    seen.add(r.itemId);
    return r;
  });
}

export function cleanQuotationTables(value) {
  return (Array.isArray(value) ? value : []).slice(0, MAX_TABLES).map((t, i) => ({
    id: String(t?.id || `t${i + 1}`).slice(0, 40),
    title: String(t?.title ?? "").trim().slice(0, 120),
    rows: oneRowPerItem((Array.isArray(t?.rows) ? t.rows : []).slice(0, MAX_TABLE_ROWS).map((r, j) => ({
      id: String(r?.id || `r${j + 1}`).slice(0, 40),
      // WHICH registered item this line came from, kept beside the text rather
      // than instead of it. The text is what the client was quoted and must
      // still read correctly if the catalogue entry is later renamed or
      // deleted; the id is what ties the line back to its home while it exists.
      itemId: String(r?.itemId ?? "").slice(0, 60),
      // The picture as it stood when the line was made, alongside the id, for
      // the same reason the price is: the document must keep showing what was
      // quoted even after the catalogue entry moves on.
      image: String(r?.image ?? "").slice(0, 500),
      description: String(r?.description ?? "").trim().slice(0, 300),
      unit: String(r?.unit ?? "").trim().slice(0, 30),
      qty: n(r?.qty),
      // COPIED off the registered item when the line was picked, not looked up
      // when the quotation is read. A quotation is a document somebody was
      // given: re-pricing it from today's catalogue would rewrite what was
      // quoted last month.
      unitPrice: n(r?.unitPrice),
      // Taken off each unit before the line is multiplied out, so a discount
      // scales with quantity the way whoever typed it expects.
      discount: n(r?.discount),
    })).filter((r) => r.description)),
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
      // The NET price per unit. The gross price and the discount both stay on
      // the table row, which is what the document shows; `items` is the priced
      // list the totals run over, and it should already have the discount taken
      // off so nothing downstream has to know discounts exist.
      unitPrice: netUnitPrice(r),
    })));
}

// Never below zero: a discount bigger than the price is a typo, not a refund.
export const netUnitPrice = (r) => Math.max(0, n(r?.unitPrice) - n(r?.discount));
