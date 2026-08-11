import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Calendar" };

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// April 2026 starts on a Wednesday, so the grid opens with two trailing March days.
const LEAD = [30, 31];
const DAYS = Array.from({ length: 30 }, (_, i) => i + 1);
const TRAIL = [1, 2, 3];
const TODAY = 8;

const EVENTS = {
  2: [{ title: "Beta freeze", tone: "primary" }],
  6: [{ title: "Bilal starts", tone: "success" }],
  8: [
    { title: "Platform standup", tone: "info" },
    { title: "Falcon renewal call", tone: "warning" },
  ],
  12: [{ title: "Falcon QBR", tone: "warning" }],
  14: [{ title: "Security review", tone: "danger" }],
  15: [{ title: "Invoice run", tone: "primary" }],
  19: [{ title: "Nourah renewal", tone: "success" }],
  22: [{ title: "Board meeting", tone: "danger" }],
  27: [{ title: "Sprint 25 planning", tone: "info" }],
};

const UPCOMING = [
  { title: "Platform standup", when: "Today · 09:30 – 09:45", tone: "info", icon: "users" },
  { title: "Falcon renewal call", when: "Today · 15:00 – 16:00", tone: "warning", icon: "phone" },
  { title: "Falcon QBR", when: "Sun 12 Apr · 11:00", tone: "warning", icon: "briefcase" },
  { title: "Security review", when: "Tue 14 Apr · 13:00", tone: "danger", icon: "shield" },
  { title: "Invoice run", when: "Wed 15 Apr · 08:00", tone: "primary", icon: "invoice" },
];

const TONE_FG = {
  primary: "var(--ad-primary)", success: "var(--ad-success)", warning: "var(--ad-warning)",
  info: "var(--ad-info)", danger: "var(--ad-destructive)",
};
const TONE_BG = {
  primary: "rgba(70,128,255,.14)", success: "rgba(44,168,127,.16)", warning: "rgba(229,138,0,.16)",
  info: "rgba(4,169,245,.16)", danger: "rgba(220,38,38,.14)",
};

function Cell({ day, muted, today, events = [] }) {
  return (
    <div
      className="min-h-[104px] border-b border-e p-2"
      style={{ borderColor: "var(--ad-border)", opacity: muted ? 0.4 : 1 }}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${today ? "font-bold text-white" : "font-medium"}`}
        style={today ? { backgroundColor: "var(--ad-primary)" } : undefined}
      >
        {day}
      </span>
      <div className="mt-1.5 space-y-1">
        {events.map((e) => (
          <p
            key={e.title}
            className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: TONE_BG[e.tone], color: TONE_FG[e.tone] }}
            title={e.title}
          >
            {e.title}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        title="Calendar"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Calendar" }]}
        actions={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="plus" className="h-3.5 w-3.5" /> New event</button>}
      />

      <Row>
        <Col span={9}>
          <Card>
            <CardHead
              title="April 2026"
              action={
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: "var(--ad-border)" }}>
                    {["Month", "Week", "Day"].map((v, i) => (
                      <button
                        key={v}
                        type="button"
                        className="rounded px-2.5 py-1 text-xs font-medium"
                        style={i === 0 ? { backgroundColor: "var(--ad-primary)", color: "#fff" } : { color: "var(--ad-muted-foreground)" }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="ad-icon-btn h-9 w-9" aria-label="Previous month"><Icon name="chevronLeft" className="h-4 w-4" /></button>
                  <button type="button" className="ad-icon-btn h-9 w-9" aria-label="Next month"><Icon name="chevronRight" className="h-4 w-4" /></button>
                </div>
              }
            />
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-7 border-t" style={{ borderColor: "var(--ad-border)" }}>
                  {DOW.map((d) => (
                    <div
                      key={d}
                      className="border-b border-e px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--ad-muted-foreground)]"
                      style={{ borderColor: "var(--ad-border)" }}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {LEAD.map((d) => <Cell key={`lead-${d}`} day={d} muted />)}
                  {DAYS.map((d) => (
                    <Cell key={d} day={d} today={d === TODAY} events={EVENTS[d]} />
                  ))}
                  {TRAIL.map((d) => <Cell key={`trail-${d}`} day={d} muted />)}
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col span={3}>
          <div className="flex flex-col gap-6">
            <Card>
              <CardHead title="Upcoming" />
              <CardBody>
                <ul className="space-y-4">
                  {UPCOMING.map((e) => (
                    <li key={e.title} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: TONE_BG[e.tone], color: TONE_FG[e.tone] }}
                      >
                        <Icon name={e.icon} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.title}</p>
                        <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{e.when}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Calendars" />
              <CardBody>
                <ul className="space-y-3">
                  {[
                    { label: "Platform", tone: "primary" },
                    { label: "Revenue", tone: "success" },
                    { label: "Customer", tone: "warning" },
                    { label: "Security", tone: "danger" },
                    { label: "Team", tone: "info" },
                  ].map((c) => (
                    <li key={c.label} className="flex items-center gap-2.5">
                      <input type="checkbox" className="ad-check" defaultChecked aria-label={c.label} />
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TONE_FG[c.tone] }} />
                      <span className="text-sm">{c.label}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardBody full className="flex items-center gap-3">
                <Badge tone="primary">12</Badge>
                <p className="text-xs text-[var(--ad-muted-foreground)]">events scheduled this month</p>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>
    </>
  );
}
