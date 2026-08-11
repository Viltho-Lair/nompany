import StatusPage from "../../_components/StatusPage";

export const metadata = { title: "Coming Soon" };

export default function Page() {
  return (
    <StatusPage
      icon="rocket"
      tone="primary"
      title="Coming soon"
      body="We're putting the finishing touches on this module. Leave your email and we'll tell you the moment it lands."
      primaryAction={null}
      extra={
        <form
          className="mx-auto flex w-full max-w-sm gap-2"
          action="#"
        >
          <input className="ad-input" type="email" placeholder="you@example.com" aria-label="Email" />
          <button type="button" className="ad-btn ad-btn-primary shrink-0">
            Notify me
          </button>
        </form>
      }
    />
  );
}
