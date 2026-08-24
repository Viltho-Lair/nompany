import { PageHeader } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import MigrationScreen from "@/components/super/MigrationScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Database migration" };

export default function MigrationPage() {
  return (
    <>
      <PageHeader
        title="Database migration"
        breadcrumb={[
          { label: "Home", href: `${BASE}/dashboard/analytics` },
          { label: "Application" },
          { label: "Database migration" },
        ]}
      />
      <MigrationScreen />
    </>
  );
}
