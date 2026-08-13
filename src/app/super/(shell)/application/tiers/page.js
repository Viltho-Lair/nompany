import { PageHeader } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import TiersScreen from "@/components/super/TiersScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tiers" };

export default function TiersPage() {
  return (
    <>
      <PageHeader
        title="Tiers"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Tiers" }]}
      />
      <TiersScreen />
    </>
  );
}
