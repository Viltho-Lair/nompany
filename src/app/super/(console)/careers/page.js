import { PageHeader } from "../../_components/ui";
import CareersConsole from "@/components/super/CareersConsole";

export const dynamic = "force-dynamic";
export const metadata = { title: "Careers" };

// nompany's own job openings and the applications to them (27/09/2026). The
// public /careers pages read what is written here. The (console) layout has
// already verified the session before this renders.
export default function CareersPage() {
  return (
    <>
      <PageHeader title="Careers" description="Openings on nompany.com/careers, and everybody who applied." />
      <CareersConsole />
    </>
  );
}
