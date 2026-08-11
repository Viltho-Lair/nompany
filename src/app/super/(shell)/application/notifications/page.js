import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, StatCard, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Notifications" };

const GROUPS = [
  {
    day: "Today",
    items: [
      { tone: "primary", icon: "user", title: "New studio registered", body: "Falcon Contracting completed onboarding and activated the Enterprise plan.", time: "2 min ago", unread: true },
      { tone: "success", icon: "wallet", title: "Payment received", body: "Invoice INV-2291 settled — $48,760.00 from Falcon Contracting.", time: "26 min ago", unread: true },
      { tone: "danger", icon: "shield", title: "Sign-in from a new device", body: "Super console accessed from Chrome on Windows · Riyadh, SA.", time: "1 hour ago", unread: true },
      { tone: "warning", icon: "alert", title: "Storage at 82%", body: "The media bucket is approaching its quota. Consider raising the limit.", time: "3 hours ago" },
    ],
  },
  {
    day: "Yesterday",
    items: [
      { tone: "info", icon: "rocket", title: "Deployment finished", body: "Release 4.2.0 is live in production. 2m 14s build time, zero failed checks.", time: "18:42" },
      { tone: "danger", icon: "wallet", title: "Payment failed", body: "Subscription renewal failed for Dar Almanar — card declined.", time: "14:07" },
      { tone: "primary", icon: "users", title: "9 seats added", body: "Tamweel Group expanded from 69 to 78 seats on the Scale plan.", time: "11:20" },
    ],
  },
  {
    day: "Earlier this week",
    items: [
      { tone: "success", icon: "check", title: "Backup verified", body: "Weekly restore drill completed against the March snapshot.", time: "Mon 08:00" },
      { tone: "warning", icon: "clock", title: "Invoice overdue", body: "INV-2288 for Dar Almanar is 5 days past due ($67,250.00).", time: "Mon 06:30" },
    ],
  },
];

const PREFERENCES = [
  { label: "New studio registrations", email: true, push: true },
  { label: "Payment events", email: true, push: true },
  { label: "Security alerts", email: true, push: true },
  { label: "Deployments", email: false, push: true },
  { label: "Storage & quota warnings", email: true, push: false },
  { label: "Weekly digest", email: true, push: false },
];

const TONE_FG = {
  primary: "var(--ad-primary)", success: "var(--ad-success)", warning: "var(--ad-warning)",
  info: "var(--ad-info)", danger: "var(--ad-destructive)",
};
const TONE_BG = {
  primary: "rgba(70,128,255,.14)", success: "rgba(44,168,127,.16)", warning: "rgba(229,138,0,.16)",
  info: "rgba(4,169,245,.16)", danger: "rgba(220,38,38,.14)",
};

export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Notifications" }]}
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="check" className="h-3.5 w-3.5" /> Mark all read</button>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="settings" className="h-3.5 w-3.5" /> Preferences</button>
          </>
        }
      />

      <Row className="mb-6">
        <Col span={3}><StatCard label="Unread" value="3" icon="bell" tone="primary" /></Col>
        <Col span={3}><StatCard label="This week" value="47" delta={12.4} deltaLabel="vs last week" icon="activity" tone="info" /></Col>
        <Col span={3}><StatCard label="Security alerts" value="2" icon="shield" tone="danger" /></Col>
        <Col span={3}><StatCard label="Muted channels" value="1" icon="x" tone="warning" /></Col>
      </Row>

      <Row>
        <Col span={8}>
          <Card>
            <CardHead
              title="All Notifications"
              action={
                <select className="ad-select w-36" aria-label="Filter notifications" defaultValue="">
                  <option value="">All types</option>
                  <option>Security</option>
                  <option>Billing</option>
                  <option>Platform</option>
                </select>
              }
            />
            <CardBody>
              {GROUPS.map((g) => (
                <section key={g.day} className="mb-6 last:mb-0">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--ad-muted-foreground)]">
                    {g.day}
                  </p>
                  <ul className="space-y-1">
                    {g.items.map((n) => (
                      <li key={n.title + n.time}>
                        <div
                          className="flex gap-3 rounded-lg p-3 transition-colors hover:bg-[var(--ad-accent)]"
                          style={n.unread ? { backgroundColor: "color-mix(in srgb, var(--ad-primary) 5%, transparent)" } : undefined}
                        >
                          <span
                            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: TONE_BG[n.tone], color: TONE_FG[n.tone] }}
                          >
                            <Icon name={n.icon} className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium">{n.title}</p>
                              {n.unread ? (
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "var(--ad-primary)" }} />
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{n.body}</p>
                            <p className="mt-1 text-[11px] text-[var(--ad-muted-foreground)]">{n.time}</p>
                          </div>
                          <button type="button" className="ad-icon-btn h-8 w-8 shrink-0" aria-label="Dismiss">
                            <Icon name="x" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </CardBody>
          </Card>
        </Col>

        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Delivery Preferences" sub="Where each event type is sent" />
            <CardBody>
              <div className="mb-3 grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--ad-muted-foreground)]">
                <span>Event</span>
                <span>Email</span>
                <span>Push</span>
              </div>
              <ul className="space-y-3.5">
                {PREFERENCES.map((p) => (
                  <li key={p.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4">
                    <span className="text-sm">{p.label}</span>
                    <input type="checkbox" className="ad-check justify-self-center" defaultChecked={p.email} aria-label={`${p.label} email`} />
                    <input type="checkbox" className="ad-check justify-self-center" defaultChecked={p.push} aria-label={`${p.label} push`} />
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-lg p-4" style={{ backgroundColor: "var(--ad-muted)" }}>
                <div className="flex items-center gap-2">
                  <Icon name="clock" className="h-4 w-4 text-[var(--ad-primary)]" />
                  <p className="text-sm font-medium">Quiet hours</p>
                  <Badge tone="success" className="ms-auto">On</Badge>
                </div>
                <p className="mt-1.5 text-xs text-[var(--ad-muted-foreground)]">
                  22:00 – 07:00 (Asia/Riyadh). Only security alerts break through.
                </p>
              </div>

              <button type="button" className="ad-btn ad-btn-primary mt-5 w-full">Save preferences</button>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
