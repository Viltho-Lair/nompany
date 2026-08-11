import StatusPage from "../../_components/StatusPage";

export const metadata = { title: "Maintenance" };

export default function Page() {
  return (
    <StatusPage
      icon="tool"
      tone="warning"
      title="Scheduled maintenance"
      body="The console is briefly offline while we ship an upgrade. It'll be back shortly."
      primaryAction={null}
      extra={
        <p className="text-sm text-[var(--ad-muted-foreground)]">
          Estimated completion: <span className="font-medium text-[var(--ad-foreground)]">01:30 UTC</span>
        </p>
      }
    />
  );
}
