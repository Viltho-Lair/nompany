import { PageHeader } from "../../_components/ui";
import TiersScreen from "@/components/super/TiersScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tiers" };

export default function TiersPage() {
  return (
    <>
      <PageHeader
        title="Tiers"
      />
      <TiersScreen />
    </>
  );
}
