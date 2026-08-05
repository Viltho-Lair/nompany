// RFQ shared constants + auth. Client-safe (no server-only imports).

import { ADMIN_TAG, TECHNICAL_TAG } from "@/lib/authConstants";

export const RFQ_STATUSES = ["New", "In-review", "Converted", "Rejected"];

// Any Technical or admin user can edit an RFQ record (assign, comment,
// convert). Sales can create them via /api/tickets/[id]/request-rfq but not
// touch them once posted.
export function canEditRfq(user) {
  if (!user) return false;
  const tags = Array.isArray(user.tags) ? user.tags : [];
  return tags.includes(ADMIN_TAG) || tags.includes(TECHNICAL_TAG);
}
