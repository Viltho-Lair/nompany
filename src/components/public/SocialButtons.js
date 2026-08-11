// Google / Microsoft sign-in buttons. Plain links — the whole flow is a
// server-side redirect, so there's nothing to hydrate or fetch.
// Renders nothing when neither provider is configured.

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
  </svg>
);
const MicrosoftMark = () => (
  <svg viewBox="0 0 23 23" className="h-[18px] w-[18px]" aria-hidden="true">
    <path fill="#F25022" d="M1 1h10v10H1z" /><path fill="#7FBA00" d="M12 1h10v10H12z" />
    <path fill="#00A4EF" d="M1 12h10v10H1z" /><path fill="#FFB900" d="M12 12h10v10H12z" />
  </svg>
);

const MARKS = { google: GoogleMark, microsoft: MicrosoftMark };
const LABELS = { google: "Google", microsoft: "Microsoft" };

export default function SocialButtons({ providers = [], mode = "login" }) {
  if (!providers.length) return null;
  const verb = mode === "signup" ? "Sign up" : "Continue";

  return (
    <div className="space-y-3">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {providers.map((p) => {
          const Mark = MARKS[p];
          return (
            <a
              key={p}
              href={`/api/auth/oauth/${p}/start`}
              className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-steel-200 bg-white px-4 py-3 text-sm font-600 text-brand-950 transition-colors hover:bg-steel-50 dark:border-white/15 dark:bg-steel-800 dark:text-white dark:hover:bg-white/5"
            >
              {Mark ? <Mark /> : null}
              {verb} with {LABELS[p] || p}
            </a>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-steel-200 dark:bg-white/10" />
        <span className="text-xs font-600 uppercase tracking-wide text-steel-400">or</span>
        <span className="h-px flex-1 bg-steel-200 dark:bg-white/10" />
      </div>
    </div>
  );
}
