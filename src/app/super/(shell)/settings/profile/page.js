import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Avatar, Table, Icon, Num, toneBg, toneInk } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import { CURRENT_USER, SUPER_ADMINS } from "../../../_components/session";

export const metadata = { title: "Settings" };

const TABS = ["Profile", "Security", "Notifications", "Billing", "API keys", "Danger zone"];

const SESSIONS = [
  { device: "Chrome · Windows 11", where: "Riyadh, SA", ip: "94.98.***.***", last: "Active now", current: true },
  { device: "Safari · iPhone 16", where: "Riyadh, SA", ip: "94.98.***.***", last: "2 hours ago" },
  { device: "Firefox · macOS", where: "Jeddah, SA", ip: "188.51.***.***", last: "Yesterday" },
];

const KEYS = [
  { label: "Production — reporting", prefix: "nsk_live_9f2a…", created: "Jan 14, 2026", last: "12 min ago", tone: "success" },
  { label: "Staging — integration tests", prefix: "nsk_test_71bc…", created: "Feb 02, 2026", last: "3 days ago", tone: "info" },
  { label: "Legacy exporter", prefix: "nsk_live_4d80…", created: "Aug 21, 2025", last: "Never", tone: "warning" },
];

export default function ProfileSettingsPage() {
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
            <p className="mt-1 text-sm text-[var(--ad-muted-foreground)]">{CURRENT_USER.email}</p>
            <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">
              Platform owner · full access to every studio · member since Jul 2025
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
                  <input id="p-email" type="email" className="ad-input" defaultValue={CURRENT_USER.email} />
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
                <ul className="space-y-3">
                  {SUPER_ADMINS.map((email) => (
                    <li key={email} className="flex items-center gap-3">
                      <Avatar name={CURRENT_USER.name} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-500">{CURRENT_USER.name}</span>
                        <span className="block truncate text-xs text-[var(--ad-muted-foreground)]">{email}</span>
                      </span>
                      <Badge tone="danger">Owner</Badge>
                    </li>
                  ))}
                </ul>
                <button type="button" className="ad-btn ad-btn-outline mt-5 w-full ad-btn-sm">
                  <Icon name="plus" className="h-3.5 w-3.5" /> Add super admin
                </button>
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Security" />
              <CardBody className="space-y-4">
                {[
                  { label: "Two-factor authentication", state: "Enabled", tone: "success" },
                  { label: "Recovery codes", state: "8 remaining", tone: "primary" },
                  { label: "Password", state: "Changed 42 days ago", tone: "warning" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-500">{s.label}</p>
                      <p className="text-xs text-[var(--ad-muted-foreground)]">{s.state}</p>
                    </div>
                    <Badge tone={s.tone}>Manage</Badge>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      <Row className="mb-6">
        <Col span={7}>
          <Card className="h-full">
            <CardHead title="Active Sessions" action={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm">Sign out all</button>} />
            <Table head={["Device", "Location", "IP", { label: "Last active", align: "end" }]}>
              {SESSIONS.map((s) => (
                <tr key={s.device}>
                  <td>
                    <span className="inline-flex items-center gap-2.5">
                      <Icon name="monitor" className="h-4 w-4 text-[var(--ad-muted-foreground)]" />
                      <span className="font-500">{s.device}</span>
                      {s.current ? <Badge tone="success">This device</Badge> : null}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{s.where}</td>
                  <td className="ad-num whitespace-nowrap text-xs text-[var(--ad-muted-foreground)]">{s.ip}</td>
                  <td className="ad-num whitespace-nowrap text-end text-[var(--ad-muted-foreground)]">{s.last}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>

        <Col span={5}>
          <Card className="h-full">
            <CardHead title="API Keys" action={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="plus" className="h-3.5 w-3.5" /> New key</button>} />
            <CardBody>
              <ul className="space-y-4">
                {KEYS.map((k) => (
                  <li key={k.prefix} className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "var(--ad-muted)", color: "var(--ad-muted-foreground)" }}
                    >
                      <Icon name="key" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-500">{k.label}</p>
                      <Num as="p" className="truncate text-xs text-[var(--ad-muted-foreground)]">{k.prefix}</Num>
                      <p className="text-[11px] text-[var(--ad-muted-foreground)]">Created {k.created} · used {k.last}</p>
                    </div>
                    <button type="button" className="ad-icon-btn h-8 w-8 shrink-0" aria-label={`Revoke ${k.label}`}>
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
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
