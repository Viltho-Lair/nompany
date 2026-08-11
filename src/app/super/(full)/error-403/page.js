import StatusPage from "../../_components/StatusPage";
import { BASE } from "../../_components/nav";

export const metadata = { title: "Error 403" };

export default function Page() {
  return (
    <StatusPage
      code="403"
      icon="shield"
      tone="warning"
      title="Access forbidden"
      body="You don't have permission to view this page. Ask a super admin to grant you access."
      secondaryAction={{ label: "Sign in as someone else", href: BASE }}
    />
  );
}
