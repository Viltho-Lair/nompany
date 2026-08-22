import Link from "next/link";
import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Avatar, toneBg, toneInk } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import { CURRENT_USER } from "../../../_components/session";
import { currentSuperAdmin, superSecuritySummary, listSuperAdminEmails } from "@/platform/auth/superAuth";
import SessionsCard from "../security/SessionsCard";

export const metadata = { title: "Settings" };

const TABS = ["Profile", "Security", "Notifications", "Billing", "Danger zone"];

// THE SECURITY HALF OF THIS PAGE IS REAL NOW; the rest is still a design
// surface.
//
// It used to show three sessions, three API keys and a three-row security
// summary, every one of them a hardcoded array — "Two-factor authentication ·
// Enabled" on an account that had no second factor, and key prefixes for a
// feature that does not exist. A security screen that reports something other
// than the truth is worse than one that reports nothing: the reason to open it
// is to find out whether anything is wrong.
//
// The sessions and the summary now come from the record. The API keys card is
// GONE rather than made real — there is no API key feature to reflect, and a
// screen offering to revoke credentials that were never issued is the dead
// capability the permission catalogue's own rule forbids, rendered.

const ago = (iso) => {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return "Unknown";
  const days = Math.max(0, Math.floor((Date.now() - t) / 86400000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
};

export default async function ProfileSettingsPage() {
  // The layout above already refused everybody without a session, so this is
  // the same admin it resolved.
  const admin = await currentSuperAdmin();
  const security = admin ? await superSecuritySummary(admin.id) : null;
  const admins = [...(await listSuperAdminEmails())];
  const joined = admin?.createdAt
    ? new Date(admin.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "—";

  const securityRows = [
    security?.mfaEnabled
      ? {
          label: "Two-factor authentication",
          state: `On since ${new Date(security.mfaEnabledAt).toLocaleDateString("en-GB")}`,
          tone: "success",
        }
      : { label: "Two-factor authentication", state: "Off — a password is the whole of it", tone: "danger" },
    {
      label: "Recovery codes",
      state: security?.mfaEnabled ? `${security.recoveryCodesLeft} remaining` : "None yet",
      tone: security?.mfaEnabled && security.recoveryCodesLeft > 2 ? "primary" : "warning",
    },
    // NO "CHANGE PASSWORD" ROW THAT PRETENDS TO BE A BUTTON. There is no
    // endpoint behind one yet, so this states a fact and offers nothing.
    { label: "Password", state: `Set ${ago(security?.passwordSetAt)}`, tone: "info" },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Settings" }, { label: "Profile" }]}
        actions={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm">Save changes</button>}
      />

      <Card className="mb-6">
        <CardBody full className="flex flex-wrap items-center gap-5">
          <span
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-xl font-700 text-white"
            style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--ad-primary) 80%, var(--ad-primary-foreground)), var(--ad-primary))" }}
          >
            {CURRENT_USER.initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-600">{CURRENT_USER.name}</h2>
              <Badge tone="danger">{CURRENT_USER.role}</Badge>
            </div>
            {/* THE ADDRESS AND THE DATE COME OFF THE RECORD. The name and the
                photo do not, because the record holds neither — those stay
                design surface. What must not happen is this line disagreeing
                with the Super Admins card below it, which reads the same
                registry. */}
            <p className="mt-1 text-sm text-[var(--ad-muted-foreground)]">{admin?.email}</p>
            <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">
              Platform owner · full access to every studio · member since {joined}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm">Change photo</button>
            <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm">Remove</button>
          </div>
        </CardBody>
        <div className="flex flex-wrap gap-1 border-t px-6 py-3" style={{ borderColor: "var(--ad-border)" }}>
          {TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              className="rounded-md px-3 py-1.5 text-xs font-500 transition-colors"
              style={
                i === 0
                  ? { backgroundColor: toneBg("primary", 0.12), color: toneInk("primary") }
                  : { color: "var(--ad-muted-foreground)" }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </Card>

      <Row className="mb-6">
        <Col span={8}>
          <Card className="h-full">
            <CardHead title="Personal Information" />
            <CardBody>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="ad-label" htmlFor="p-first">First name</label>
                  <input id="p-first" className="ad-input" defaultValue="Abdullah" />
                </div>
                <div>
                  <label className="ad-label" htmlFor="p-last">Last name</label>
                  <input id="p-last" className="ad-input" defaultValue="Abu Hammed" />
                </div>
                <div className="sm:col-span-2">
                  <label className="ad-label" htmlFor="p-email">Email</label>
                  <input id="p-email" type="email" className="ad-input" defaultValue={admin?.email} />
                  <p className="mt-1.5 text-xs text-[var(--ad-muted-foreground)]">
                    This address holds the super-admin role on the platform.
                  </p>
                </div>
                <div>
                  <label className="ad-label" htmlFor="p-phone">Phone</label>
                  <input id="p-phone" className="ad-input" defaultValue="+966 55 000 0000" />
                </div>
                <div>
                  <label className="ad-label" htmlFor="p-tz">Time zone</label>
                  <select id="p-tz" className="ad-select" defaultValue="Asia/Riyadh">
                    <option>Asia/Riyadh</option>
                    <option>Asia/Dubai</option>
                    <option>Europe/London</option>
                    <option>UTC</option>
                  </select>
                </div>
                <div>
                  <label className="ad-label" htmlFor="p-lang">Language</label>
                  <select id="p-lang" className="ad-select" defaultValue="English">
                    <option>English</option>
                    <option>العربية</option>
                  </select>
                </div>
                <div>
                  <label className="ad-label" htmlFor="p-format">Date format</label>
                  <select id="p-format" className="ad-select" defaultValue="MMM D, YYYY">
                    <option>MMM D, YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="ad-label" htmlFor="p-bio">Bio</label>
                  <textarea id="p-bio" className="ad-textarea" rows={3} defaultValue="Founder and platform owner at nompany." />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t pt-5" style={{ borderColor: "var(--ad-border)" }}>
                <button type="button" className="ad-btn ad-btn-outline">Discard</button>
                <button type="button" className="ad-btn ad-btn-primary">Save changes</button>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col span={4}>
          <div className="flex h-full flex-col gap-6">
            <Card>
              <CardHead title="Super Admins" sub="Accounts that hold platform-wide access" />
              <CardBody>
                {/* THE REGISTRY, not the allowlist constant. The two agreed
                    while there was one of each; they are not the same thing,
                    and the one that decides who may sign in is this one. The
                    record stores an address and nothing else, so an address is
                    what is shown — a display name here would be invented. */}
                <ul className="space-y-3">
                  {admins.map((email) => (
                    <li key={email} className="flex items-center gap-3">
                      <Avatar name={email} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-500">{email}</span>
                        <span className="block truncate text-xs text-[var(--ad-muted-foreground)]">
                          {email === admin?.email ? "You" : "Platform access"}
                        </span>
                      </span>
                      <Badge tone="danger">Owner</Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Security" />
              <CardBody className="space-y-4">
                {securityRows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-500">{r.label}</p>
                      <p className="text-xs text-[var(--ad-muted-foreground)]">{r.state}</p>
                    </div>
                    <Badge tone={r.tone}>{r.label === "Password" ? "Set" : "Status"}</Badge>
                  </div>
                ))}
                {/* The rows above report; this is the one thing on the card
                    that acts, and it sends you where acting is possible. */}
                <Link href={`${BASE}/settings/security`} className="ad-btn ad-btn-outline ad-btn-sm w-full">
                  Manage two-factor
                </Link>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      {/* THE REAL SESSIONS, from the same card the Security screen renders —
          one component, so the two screens cannot start disagreeing about who
          is signed in. The fake table it replaces had a "Sign out all" button
          that did nothing; this one ends sessions individually, which is the
          action somebody actually wants when they spot a row they do not
          recognise. */}
      <Row className="mb-6">
        <Col span={7}>
          <SessionsCard />
        </Col>
      </Row>

      <Card style={{ borderColor: "var(--ad-destructive)" }}>
        <CardHead title="Danger Zone" sub="These actions are irreversible" />
        <CardBody>
          <div className="space-y-3">
            {[
              { title: "Transfer platform ownership", body: "Hand the super-admin role to another account. You will lose owner access immediately.", cta: "Transfer" },
              { title: "Export all platform data", body: "Generate a full archive of every studio, user and transaction record.", cta: "Request export" },
              { title: "Delete account", body: "Permanently remove this super-admin account. Studios are unaffected.", cta: "Delete" },
            ].map((d) => (
              <div
                key={d.title}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
                style={{ borderColor: "var(--ad-border)" }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-500">{d.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{d.body}</p>
                </div>
                <button type="button" className="ad-btn ad-btn-destructive ad-btn-sm shrink-0">{d.cta}</button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
