import { PageHeader } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import { readArr } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import MigrationScreen from "@/components/super/MigrationScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Database migration" };

export default async function MigrationPage() {
  // The studio picker needs the list; resolved on the server so the first paint
  // already has it. Only the fields the picker shows — never the whole record.
  const studios = (await readArr(REG.studios))
    .map((s) => ({ id: s.id, name: s.name || "", slug: s.slug || "" }))
    .sort((a, b) => (a.name || a.slug).localeCompare(b.name || b.slug));

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
      <MigrationScreen studios={studios} />
    </>
  );
}
