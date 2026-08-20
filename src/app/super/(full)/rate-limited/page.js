import StatusPage from "../../_components/StatusPage";

export const metadata = { title: "Rate Limited" };

export default function Page() {
  return (
    <StatusPage
      icon="alert"
      tone="danger"
      title="Too many requests"
      body="You've hit the request limit for this window. Give it a minute before trying again."
      extra={
        <p className="text-sm text-[var(--ad-muted-foreground)]">
          Retry after <span className="font-500 text-[var(--ad-foreground)]">60 seconds</span>
        </p>
      }
    />
  );
}
