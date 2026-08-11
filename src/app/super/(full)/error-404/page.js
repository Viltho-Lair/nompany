import StatusPage from "../../_components/StatusPage";
import { BASE } from "../../_components/nav";

export const metadata = { title: "Error 404" };

export default function Page() {
  return (
    <StatusPage
      code="404"
      icon="search"
      tone="primary"
      title="Page not found"
      body="The page you're looking for doesn't exist, or it was moved somewhere else."
      secondaryAction={{ label: "Search the console", href: `${BASE}/docs` }}
    />
  );
}
