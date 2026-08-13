// Quotation + RFQ shared constants. Kept out of lib/technical.js so client
// components can import them without pulling the Redis-backed section store in
// with them — the same split lib/tickets.js makes for Sales.

export const QUOTATION_STATUSES = ["Draft", "Sent", "Approved", "Rejected"];
export const DEFAULT_QUOTATION_STATUS = "Draft";
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

// A quotation still sitting in its opening status — nobody has sent it, so it
// is what the list's amber stripe marks.
export const isUnsent = (q) => q?.status === DEFAULT_QUOTATION_STATUS;
