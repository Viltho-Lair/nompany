import StatusPage from "../../_components/StatusPage";

export const metadata = { title: "Under Construction" };

export default function Page() {
  return (
    <StatusPage
      icon="tool"
      tone="warning"
      title="Under construction"
      body="This page is being rebuilt. Everything else in the console is working normally."
    />
  );
}
