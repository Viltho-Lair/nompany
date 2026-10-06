import { PageHeader } from "../../_components/ui";
import SectionLocks from "@/components/super/SectionLocks";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sections" };

// SECTIONS STILL BEING BUILT, held back from every studio (03/10/2026). Its own
// page beside Industries: what a studio may see at all is a product decision,
// not a setting of any one industry.
export default function SectionsPage() {
  return (
    <>
      <PageHeader title="Sections"
        description="Hold back a section or a sub-section that is still being built. Studios do not see it, cannot open it and cannot switch it on; nothing they have recorded is moved or lost." />
      <SectionLocks />
    </>
  );
}
