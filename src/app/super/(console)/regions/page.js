import { PageHeader } from "../../_components/ui";
import PriceRegionsScreen from "@/components/super/PriceRegionsScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Regional pricing" };

// WHAT A PACKAGE COSTS WHERE. Packages and Tiers hold the base list; this is
// where each region's own prices are fixed — what the public pricing page shows
// a visitor from that region, and what the checkout will charge.
export default function RegionsPage() {
  return (
    <>
      <PageHeader title="Regional pricing" />
      <PriceRegionsScreen />
    </>
  );
}
