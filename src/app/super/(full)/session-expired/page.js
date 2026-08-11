import StatusPage from "../../_components/StatusPage";
import { BASE } from "../../_components/nav";

export const metadata = { title: "Session Expired" };

export default function Page() {
  return (
    <StatusPage
      icon="clock"
      tone="warning"
      title="Session expired"
      body="You were signed out after a period of inactivity. Sign in again to pick up where you left off."
      primaryAction={{ label: "Sign in again", href: BASE }}
    />
  );
}
