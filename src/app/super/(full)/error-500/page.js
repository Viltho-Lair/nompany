import StatusPage from "../../_components/StatusPage";
import { BASE } from "../../_components/nav";

export const metadata = { title: "Error 500" };

export default function Page() {
  return (
    <StatusPage
      code="500"
      icon="server"
      tone="danger"
      title="Internal server error"
      body="Something went wrong on our side. The issue has been logged and the team notified."
      secondaryAction={{ label: "Try again", href: `${BASE}/error-500` }}
    />
  );
}
