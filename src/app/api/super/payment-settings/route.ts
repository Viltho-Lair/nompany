import { route } from "@/platform/http/route";
import { getPaymentSettings, savePaymentSettings, PAYMENT_METHODS } from "@/lib/data/paymentSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /super → PAYMENTS (the owner, 26/09/2026): how customers pay nompany, what
// nompany prints on its invoices, who is emailed when a customer says they
// paid, and how long that claim holds the unpaid ladder. One object, like
// catalog-settings. The bank details inside it are stored encrypted and are
// returned opened here, because this is the one screen that edits them.
const spec = { auth: "super", name: "super/payment-settings" };

export const GET = route(spec, async () => ({
  settings: await getPaymentSettings(),
  methods: PAYMENT_METHODS,
}));

export const PUT = route({ ...spec, body: true }, async ({ body, admin }) => ({
  ok: true,
  settings: await savePaymentSettings(body, `super:${admin.id}`),
}));
