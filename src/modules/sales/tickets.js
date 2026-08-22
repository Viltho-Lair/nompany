// Sales ticket shared constants + auth. Kept out of lib/auth.js so client
// components can import without pulling Node-only code.

// Ticket status is AUTOMATED up to approval: "Lead" on creation, "Opportunity"
// once an RFQ is requested. Only after the quotation approval is complete does
// a Sales user get to pick a final status from POST_APPROVAL_STATUSES.
export const POST_APPROVAL_STATUSES = [
  "Commit",
  "Closed Won",
  "Closed Lost",
  "Cancelled by Client",
  "On-Hold",
  "Dropped",
];
export const TICKET_STATUSES = ["Lead", "Opportunity", ...POST_APPROVAL_STATUSES];
export const DEFAULT_STATUS = "Lead";

// RFQ can be requested from the pre-approval stages.
export const TICKET_RFQ_STATUSES = ["Lead", "Opportunity"];
export function canRequestRfqStatus(status) {
  return TICKET_RFQ_STATUSES.includes(status);
}

// Technical turning an RFQ down CLOSES THE TICKET. There is no quotation
// coming, so the ticket is not an opportunity any more — and leaving it in the
// pipeline would keep it in the forecast forever. Named rather than inlined
// because which closed status this should be is a business call, and this is
// the one line that decides it.
export const RFQ_REJECTED_TICKET_STATUS = "Closed Lost";

// Urgency is a Sales-Leader-only field. Every ticket defaults to "Normal" on
// creation (even for a Leader) and can only be changed afterward, and only by
// a Leader. It's carried forward read-only onto any RFQ/Quotation it spawns.
export const TICKET_URGENCIES = ["Low", "Normal", "High", "Critical"];
export const DEFAULT_URGENCY = "Normal";

// Preset industry options for the ticket's "Type of industry" field. The UI
// also offers a free-typed "Other" — whatever the user types there is stored
// directly in `industry` rather than as a separate flag, so this list is only
// ever a set of suggestions, not a closed enum enforced server-side.
export const TICKET_INDUSTRIES = [
  "Residential", "Commercial",
  "Banking", "Governmental", "Education", "Technology", "Construction",
  "Healthcare", "Energy", "Consulting", "Engineering", "Manufacturing",
  "Logistics", "Hospitality", "Finance", "Agriculture", "Transportation",
  "Automotive", "Aerospace", "Telecommunications", "Media", "Security",
  "Architecture", "Real-Estate", "Pharmaceuticals", "Chemicals", "Mining",
  "Retail", "Wholesale", "Legal", "Insurance", "Entertainment", "Defense",
  "Utilities",
];

// Columns the Sales Live view can show. The chosen subset is stored on the
// sales-settings sub-section (settings.liveColumns) and picked in Settings, so
// the Live screen is a projection of the Tickets list, not a second data source.
export const TICKET_LIVE_COLUMNS = [
  { key: "ref", label: "Ref" },
  { key: "title", label: "Title" },
  { key: "clientName", label: "Client" },
  { key: "status", label: "Status" },
  { key: "urgency", label: "Urgency" },
  { key: "industry", label: "Industry" },
  { key: "deadline", label: "Deadline" },
  // "Value Quoted", not "Value": the figure is the latest quotation's total,
  // never something anybody typed on the ticket.
  { key: "value", label: "Value Quoted" },
  { key: "clientBudget", label: "Client budget" },
  { key: "contactName", label: "Contact" },
  { key: "contactPhone", label: "Phone" },
  { key: "locationCity", label: "City" },
  { key: "owner", label: "Owner" },
  { key: "probability", label: "Probability" },
  { key: "rfq", label: "RFQ" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
];
export const TICKET_LIVE_COLUMN_KEYS = TICKET_LIVE_COLUMNS.map((c) => c.key);
export const DEFAULT_LIVE_COLUMNS = ["ref", "title", "clientName", "status", "deadline"];

// Keep only known keys, preserve the caller's order, fall back to the default.
export function cleanLiveColumns(value) {
  const picked = Array.isArray(value) ? value.filter((k) => TICKET_LIVE_COLUMN_KEYS.includes(k)) : [];
  return picked.length ? [...new Set(picked)] : [...DEFAULT_LIVE_COLUMNS];
}

// GONE WITH THE TAG MODEL: canSetUrgency, canEditTicket, canSeeTicket. All
// three read `user.tags`, which no longer exists, so all three answered false
// for everybody — while reading, to anyone skimming, as though urgency were
// still Leader-gated. Every one of those questions is a sales.tickets.* key
// now, checked in modules/sales/sales.js.
//
// nextTicketRef went too. It numbered <Client>-<Year>-<NN> off a `ticketRef`
// field nothing writes, and it counted rather than derived. References come
// from modules/main/references.js.

// Coerce a value to a clamped integer in [0, 100]; returns fallback when
// input is invalid.
export function normaliseProbability(v, fallback = 0) {
  if (v === "" || v == null) return fallback;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}
