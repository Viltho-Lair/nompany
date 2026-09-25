import { PageHeader } from "../../_components/ui";
import PaymentSettingsScreen from "@/components/super/PaymentSettingsScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };

// HOW CUSTOMERS PAY NOMPANY — every payment method (bank transfer today), the
// details nompany prints on its invoices, and what happens when a customer
// says they paid. Claims themselves are answered on each studio, in Studios.
export default function PaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" />
      <PaymentSettingsScreen />
    </>
  );
}
