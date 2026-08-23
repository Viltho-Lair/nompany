import { PageHeader } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import NovaSwitchboard from "@/components/super/NovaSwitchboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova" };

// THE NOVA SWITCHBOARD. Which capabilities the in-app assistant offers, across
// every studio that has it. Availability is the package's Nova switch; THIS
// decides what Nova can then do — a platform-wide choice, so it lives here and
// not on any one studio. Each capability still checks the asking user's own
// permission when it runs, so switching one on never grants it to someone who
// lacks the right; it only makes it offerable at all.
export default function NovaPage() {
  return (
    <>
      <PageHeader
        title="Nova"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Nova" }]}
      />
      <NovaSwitchboard />
    </>
  );
}
