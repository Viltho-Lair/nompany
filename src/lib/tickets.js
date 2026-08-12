// Sales ticket shared constants + auth. Kept out of lib/auth.js so client
// components can import without pulling Node-only code.

import { ADMIN_TAG, SALES_TAG, canSeeAllIn } from "@/lib/authConstants";
import { clientSlug } from "@/lib/salesClients";

export { SALES_TAG };
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
  { key: "value", label: "Value" },
  { key: "clientBudget", label: "Client budget" },
  { key: "contactName", label: "Contact" },
  { key: "contactPhone", label: "Phone" },
  { key: "locationCity", label: "City" },
  { key: "owner", label: "Owner" },
  { key: "createdAt", label: "Created" },
];
export const TICKET_LIVE_COLUMN_KEYS = TICKET_LIVE_COLUMNS.map((c) => c.key);
export const DEFAULT_LIVE_COLUMNS = ["ref", "title", "clientName", "status", "deadline"];

// Keep only known keys, preserve the caller's order, fall back to the default.
export function cleanLiveColumns(value) {
  const picked = Array.isArray(value) ? value.filter((k) => TICKET_LIVE_COLUMN_KEYS.includes(k)) : [];
  return picked.length ? [...new Set(picked)] : [...DEFAULT_LIVE_COLUMNS];
}

// Same gate as "sees every ticket in Sales" — admin, or Sales+Leader.
export function canSetUrgency(user) {
  return canSeeAllIn(user, SALES_TAG);
}

export function canEditTicket(user, ticket) {
  if (!user) return false;
  const tags = Array.isArray(user.tags) ? user.tags : [];
  if (tags.includes(ADMIN_TAG)) return true;
  if (tags.includes(SALES_TAG)) return true;
  if (ticket?.createdBy && ticket.createdBy === user.id) return true;
  return false;
}

// Visibility mirrors the Quotations model: creator or assignee always sees;
// Sales+Leader (or admin) sees everything in Sales.
export function canSeeTicket(user, ticket) {
  if (!user) return false;
  if (canSeeAllIn(user, SALES_TAG)) return true;
  return ticket?.createdBy === user.id || ticket?.assignedTo === user.id;
}

// Ticket reference: <ClientSlug>-<YYYY>-<NN>, where NN is a two-digit
// per-(client, year) sequence. Uniqueness is enforced against the existing
// salesTickets collection; caller passes in the already-fetched rows.
export function nextTicketRef(existingTickets, clientName) {
  const slug = clientSlug(clientName);
  const year = new Date().getFullYear();
  const prefix = `${slug}-${year}-`;
  const nums = existingTickets
    .map((t) => (t.ticketRef || "").startsWith(prefix) ? parseInt((t.ticketRef || "").slice(prefix.length), 10) : NaN)
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(2, "0")}`;
}

// Coerce a value to a clamped integer in [0, 100]; returns fallback when
// input is invalid.
export function normaliseProbability(v, fallback = 0) {
  if (v === "" || v == null) return fallback;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}
