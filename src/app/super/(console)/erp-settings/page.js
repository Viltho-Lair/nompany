import { PageHeader } from "../../_components/ui";
import ErpKpis from "@/components/super/ErpKpis";

export const dynamic = "force-dynamic";
export const metadata = { title: "ERP settings" };

// WHAT A STUDIO'S WORK IS SET UP FROM — the owner, 20/09/2026: "add there the
// things that can be set for studios to complete their work".
//
// THE KPIs, and the next such list. The trades table that stood here — which
// deal flow each of the 25 trades starts on — moved to /super → Industries on
// 29/09/2026, where each specialism carries its own flow beside its sections
// and org chart, so one page says everything about an industry.
export default function ErpSettingsPage() {
  return (
    <>
      <PageHeader title="ERP settings"
        description="The KPIs a studio's work is judged by. Industries, and the deal flow each specialism starts on, are under Industries." />
      <ErpKpis />
    </>
  );
}
