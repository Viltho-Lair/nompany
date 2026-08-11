import StatusPage from "../../_components/StatusPage";
import { BASE } from "../../_components/nav";

export const metadata = { title: "Offline" };

export default function Page() {
  return (
    <StatusPage
      icon="wifiOff"
      tone="muted"
      title="You're offline"
      body="We can't reach the network right now. Check your connection and try again."
      secondaryAction={{ label: "Retry", href: `${BASE}/offline` }}
    />
  );
}
