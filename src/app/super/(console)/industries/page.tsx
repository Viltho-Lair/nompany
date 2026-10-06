import { PageHeader } from "../../_components/ui";
import IndustriesConsole from "@/components/super/IndustriesConsole";

export const dynamic = "force-dynamic";
export const metadata = { title: "Industries" };

// WHAT A COMPANY SAYS IT DOES, and what that starts its studio with — the
// owner, 29/09/2026: "i need to control these industries". Its own page rather
// than a card under ERP settings: an industry here is a profile (sections, org
// chart, specialisms), not a row pairing a trade with a deal flow.
export default function IndustriesPage() {
  return (
    <>
      <PageHeader title="Industries"
        description="The industries and specialisms a company picks from, and the sections and org chart each one starts a new studio with." />
      <IndustriesConsole />
    </>
  );
}
