import { PageHeader } from "../../_components/ui";
import ErpIndustries from "@/components/super/ErpIndustries";

export const dynamic = "force-dynamic";
export const metadata = { title: "ERP settings" };

// WHAT A STUDIO'S WORK IS SET UP FROM — the owner, 20/09/2026: "add there the
// things that can be set for studios to complete their work".
//
// ONE PAGE, ONE SECTION TODAY. The industries are the first thing that had to
// leave the code (adding a trade was a release); the page exists so the next
// such list has somewhere to go rather than becoming a second console screen.
export default function ErpSettingsPage() {
  return (
    <>
      <PageHeader title="ERP settings" />
      <ErpIndustries />
    </>
  );
}
