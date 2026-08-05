// Shared quotation constants + auth helpers. Kept in one module so the API
// routes and any UI helpers agree on what's a valid status and who's allowed
// to change one.

import { ADMIN_TAG, TECHNICAL_TAG, PRESALES_TAG, SALES_TAG, MANAGEMENT_TAG, canSeeAllIn } from "@/lib/authConstants";

export { TECHNICAL_TAG, PRESALES_TAG };
export const QUOTATION_STATUSES = ["In-progress", "On-hold", "Completed", "Dropped"];
export const LEAD_INTERNAL = "MTA"; // in-house lead marker when created straight from Quotations

// Tags that may build/modify a quotation AND see its cost figures (upper box +
// Free / Margin / Unit / Total columns). Everyone else gets the cost-free view.
const COST_TAGS = [ADMIN_TAG, TECHNICAL_TAG, PRESALES_TAG, SALES_TAG, MANAGEMENT_TAG];

export function canChangeStatus(user, quotation) {
  if (!user) return false;
  const tags = Array.isArray(user.tags) ? user.tags : [];
  if (COST_TAGS.some((t) => tags.includes(t))) return true;
  if (quotation?.createdBy && quotation.createdBy === user.id) return true;
  return false;
}

// Modify quotation content (items, margins, save/done). Management, Technical,
// Presales and Sales can all build/modify.
export function canEditFields(user) {
  if (!user) return false;
  const tags = Array.isArray(user.tags) ? user.tags : [];
  return COST_TAGS.some((t) => tags.includes(t));
}

// See the cost figures on the builder (same set that can modify).
export function canSeeCost(user) {
  return canEditFields(user);
}

// Row visibility: the user sees the quotation when
//   • they're admin, OR
//   • they carry Technical + Leader (see all in Technical), OR
//   • they created it, OR
//   • they're the handler.
// A vanilla Technical user only sees their own (created OR handled) records.
export function canSeeQuotation(user, quotation) {
  if (!user) return false;
  if (canSeeAllIn(user, TECHNICAL_TAG)) return true;
  return quotation?.createdBy === user.id || quotation?.handledBy === user.id;
}
