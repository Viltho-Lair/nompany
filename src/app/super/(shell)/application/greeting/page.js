import { PageHeader } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import GreetingEditor from "@/components/super/GreetingEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daily greeting" };

// THE DAILY GREETING every studio reads across the top of its header. One
// message for the whole platform, changing at midnight — either the built-in
// rotation or exactly what is typed here. It is a platform-wide choice, like
// the Nova switchboard beside it, so it lives here and not on any one studio.
export default function GreetingPage() {
  return (
    <>
      <PageHeader
        title="Daily greeting"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Daily greeting" }]}
      />
      <GreetingEditor />
    </>
  );
}
