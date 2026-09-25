import { route } from "@/platform/http/route";
import {
  confirmTransfer, declineRefund, issueInvoiceForPayment, recordRefund, rejectTransfer,
} from "@/lib/data/customerBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE CONSOLE ANSWERING A CUSTOMER ABOUT MONEY (26/09/2026): a transfer they
// say they sent — confirmed (the payment is recorded and the invoice issued in
// the same act) or rejected with a reason — and a refund, asked for or not,
// with its credit note. Every answer emails the studio's owner.
//
// What a studio's subscription IS, and the plain events on it, stay on
// super/subscriptions; this route is the conversation with the customer.
const spec = { auth: "super", name: "super/billing/[studioId]" };

const ACTIONS = ["confirm-transfer", "reject-transfer", "refund", "decline-refund", "issue-invoice"] as const;

export const POST = route({ ...spec, body: true }, async ({ params, body, admin }) => {
  const action = String(body.action || "");
  if (!(ACTIONS as readonly string[]).includes(action)) return { error: "unknown-action" };
  const studioId = params.studioId;
  const by = String(admin.id);
  const claimId = String(body.claimId || "").slice(0, 80);
  switch (action) {
    case "confirm-transfer": return confirmTransfer(studioId, claimId, by, body);
    case "reject-transfer": return rejectTransfer(studioId, claimId, by, body.reason);
    case "refund": return recordRefund(studioId, by, body);
    case "decline-refund": return declineRefund(studioId, claimId, by, body.reason);
    default: return issueInvoiceForPayment(studioId, String(body.eventId || "").slice(0, 80), by);
  }
});
