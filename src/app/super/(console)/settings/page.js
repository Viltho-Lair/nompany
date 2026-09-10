import Link from "next/link";
import { PageHeader } from "../../_components/ui";
import { BASE } from "../../_components/nav";
import ProfilePanel from "./ProfilePanel";
import MfaCard from "./MfaCard";
import SessionsCard from "./SessionsCard";
import NotificationsPanel from "./NotificationsPanel";
import DangerPanel from "./DangerPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

/* SETTINGS, WITH TABS THAT ACTUALLY MOVE.
   ------------------------------------------------------------------
   THE TAB STRIP WAS DECORATION. `settings/profile` drew five buttons — Profile,
   Security, Notifications, Billing, Danger zone — with no `onClick` between
   them and `i === 0` hard-coded as the lit one, so the first tab was always
   highlighted and none of the other four did anything. Meanwhile Security was a
   separate route under Settings, and Notifications was a route under
   Application, three menu rows away from the tab claiming to hold it.

   The owner asked for one page with real tabs, and this is it: Security and
   Notifications are folded in, Danger zone gets the tab it was named in, and
   the strip navigates.

   THE TAB IS IN THE URL, not in state, and that is what keeps every panel a
   SERVER component. Profile reads the admin record and the super-admin list;
   Notifications is a client island of its own. A `useState` tab strip would
   have forced the whole page client-side and every panel with it — which is how
   a settings page ends up fetching what it used to render. `?tab=` costs a
   navigation and buys the panels staying exactly what they were.

   BILLING IS NOT HERE. It was the fifth decorative button, and there is no
   billing in this product — no plan on the console's own account, no invoice,
   nothing to render. A tab that opens on nothing is the same defect the strip
   already had, one layer down. */

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "security", label: "Security" },
  { key: "notifications", label: "Notifications" },
  { key: "danger", label: "Danger zone" },
];

export default async function SettingsPage({ searchParams }) {
  const asked = String((await searchParams)?.tab || "");
  // AN UNKNOWN TAB IS NOT AN ERROR. A stale link or a typed URL lands on Profile
  // rather than on a blank page or a 404 — the same rule the studio's panel
  // switcher follows for a query string it does not recognise.
  const tab = TABS.some((t) => t.key === asked) ? asked : "profile";

  return (
    // NO SCROLL OR PADDING OF ITS OWN — the console chrome's <main> gives every
    // non-full-bleed screen both, the contract the old shell's main had. This
    // carried `h-full overflow-y-auto p-6` while the chrome was
    // `overflow-hidden`; with the chrome scrolling, keeping it would nest a
    // second scroll container inside the first.
    <div>
      <PageHeader title="Settings" />

      <div
        className="mb-6 flex flex-wrap gap-1 border-b pb-3"
        style={{ borderColor: "var(--ad-border)" }}
      >
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <Link
              key={t.key}
              href={`${BASE}/settings?tab=${t.key}`}
              aria-current={on ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-xs font-500 transition-colors ${
                on
                  ? "bg-[var(--ad-primary)] text-white"
                  : "text-[var(--ad-muted-foreground)] hover:bg-[var(--ad-accent)]"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {tab === "profile" && <ProfilePanel />}

      {/* SECURITY IS THE TWO REAL CARDS and nothing else. They were a route of
          their own; they are the same two components, so the sessions list a
          person ends here is the same list the profile panel used to show —
          one component, no chance of the two disagreeing about who is signed
          in. */}
      {tab === "security" && (
        <div className="grid gap-6 lg:grid-cols-[7fr_5fr]">
          <MfaCard />
          <SessionsCard />
        </div>
      )}

      {tab === "notifications" && <NotificationsPanel />}
      {tab === "danger" && <DangerPanel />}
    </div>
  );
}
