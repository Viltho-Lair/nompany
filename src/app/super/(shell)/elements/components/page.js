import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Avatar, Progress, Table, Empty, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Components" };

const TONES = ["primary", "success", "warning", "danger", "info", "muted"];

const SWATCHES = [
  { label: "background", v: "var(--ad-background)" },
  { label: "card", v: "var(--ad-card)" },
  { label: "muted", v: "var(--ad-muted)" },
  { label: "border", v: "var(--ad-border)" },
  { label: "primary", v: "var(--ad-primary)" },
  { label: "success", v: "var(--ad-success)" },
  { label: "warning", v: "var(--ad-warning)" },
  { label: "destructive", v: "var(--ad-destructive)" },
  { label: "info", v: "var(--ad-info)" },
  { label: "chart-4", v: "var(--ad-chart-4)" },
];

const ALERTS = [
  { tone: "primary", icon: "info", title: "Heads up", body: "Studios on the Starter plan are capped at 10 seats." },
  { tone: "success", icon: "check", title: "Saved", body: "Your changes to the billing profile were applied." },
  { tone: "warning", icon: "alert", title: "Approaching quota", body: "The media bucket is at 82% of its allowance." },
  { tone: "danger", icon: "x", title: "Payment failed", body: "The card on file for Dar Almanar was declined." },
];

const TONE_FG = {
  primary: "var(--ad-primary)", success: "var(--ad-success)", warning: "var(--ad-warning)",
  info: "var(--ad-info)", danger: "var(--ad-destructive)", muted: "var(--ad-muted-foreground)",
};
const TONE_BG = {
  primary: "rgba(70,128,255,.1)", success: "rgba(44,168,127,.12)", warning: "rgba(229,138,0,.12)",
  info: "rgba(4,169,245,.12)", danger: "rgba(220,38,38,.1)", muted: "var(--ad-muted)",
};

export default function ComponentsPage() {
  return (
    <>
      <PageHeader
        title="Components"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Elements" }, { label: "Components" }]}
      />

      <Row className="mb-6">
        <Col span={6}>
          <Card className="h-full">
            <CardHead title="Buttons" />
            <CardBody className="space-y-5">
              <div className="flex flex-wrap gap-2.5">
                <button type="button" className="ad-btn ad-btn-primary">Primary</button>
                <button type="button" className="ad-btn ad-btn-outline">Outline</button>
                <button type="button" className="ad-btn ad-btn-ghost">Ghost</button>
                <button type="button" className="ad-btn ad-btn-destructive">Destructive</button>
                <button type="button" className="ad-btn ad-btn-primary" disabled>Disabled</button>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button type="button" className="ad-btn ad-btn-primary ad-btn-sm">Small</button>
                <button type="button" className="ad-btn ad-btn-primary">
                  <Icon name="download" className="h-4 w-4" /> With icon
                </button>
                <button type="button" className="ad-icon-btn h-10 w-10" style={{ backgroundColor: "var(--ad-muted)" }} aria-label="Icon button">
                  <Icon name="settings" className="h-4 w-4" />
                </button>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="h-full">
            <CardHead title="Badges" />
            <CardBody className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <Badge key={t} tone={t}>{t}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {TONES.slice(0, 5).map((t) => (
                  <Badge key={t} tone={t} solid>{t}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="success"><span className="h-1.5 w-1.5 rounded-full bg-current" /> Active</Badge>
                <Badge tone="warning"><Icon name="clock" className="h-3 w-3" /> Pending</Badge>
                <Badge tone="danger"><Icon name="x" className="h-3 w-3" /> Failed</Badge>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-6">
        <Col span={6}>
          <Card className="h-full">
            <CardHead title="Alerts" />
            <CardBody className="space-y-3">
              {ALERTS.map((a) => (
                <div
                  key={a.title}
                  className="flex gap-3 rounded-lg border-s-4 p-4"
                  style={{ backgroundColor: TONE_BG[a.tone], borderColor: TONE_FG[a.tone] }}
                >
                  <Icon name={a.icon} className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TONE_FG[a.tone] }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: TONE_FG[a.tone] }}>{a.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{a.body}</p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </Col>

        <Col span={6}>
          <div className="flex h-full flex-col gap-6">
            <Card>
              <CardHead title="Progress" />
              <CardBody className="space-y-4">
                {[
                  { label: "Primary", value: 72, tone: "primary" },
                  { label: "Success", value: 94, tone: "success" },
                  { label: "Warning", value: 48, tone: "warning" },
                  { label: "Danger", value: 22, tone: "danger" },
                ].map((p) => (
                  <div key={p.label}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="text-[var(--ad-muted-foreground)]">{p.label}</span>
                      <span className="font-medium">{p.value}%</span>
                    </div>
                    <Progress value={p.value} tone={p.tone} />
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Avatars" />
              <CardBody className="flex flex-wrap items-end gap-4">
                {[24, 30, 36, 44, 56].map((s) => (
                  <Avatar key={s} name="Lina Haddad" size={s} />
                ))}
                <span className="flex -space-x-2">
                  {["Omar Nasser", "Sara Al-Otaibi", "Yousef Khan", "Maya Tarek"].map((n) => (
                    <Avatar key={n} name={n} size={34} className="ring-2 ring-[var(--ad-card)]" />
                  ))}
                </span>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      <Row className="mb-6">
        <Col span={7}>
          <Card className="h-full">
            <CardHead title="Table" sub="The console's single table style" />
            <Table head={["Name", "Role", "Status", { label: "Seats", align: "end" }]}>
              {[
                { n: "Falcon Contracting", r: "Enterprise", s: "Active", t: "success", seats: 148 },
                { n: "Nourah Logistics", r: "Scale", s: "Active", t: "success", seats: 62 },
                { n: "Dar Almanar", r: "Growth", s: "Past due", t: "danger", seats: 24 },
                { n: "Riyadh Tech Park", r: "Starter", s: "Trialing", t: "info", seats: 9 },
              ].map((r) => (
                <tr key={r.n}>
                  <td className="font-medium">{r.n}</td>
                  <td className="text-[var(--ad-muted-foreground)]">{r.r}</td>
                  <td><Badge tone={r.t}>{r.s}</Badge></td>
                  <td className="text-end">{r.seats}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>

        <Col span={5}>
          <Card className="h-full">
            <CardHead title="Empty State" />
            <Empty
              icon="search"
              title="No results"
              sub="Nothing matched that filter. Try widening the date range or clearing the search."
              action={<button type="button" className="ad-btn ad-btn-outline">Clear filters</button>}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <CardHead title="Colour Tokens" sub="Every surface colour resolves from these custom properties" />
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {SWATCHES.map((s) => (
              <div key={s.label}>
                <div
                  className="h-16 w-full rounded-lg border"
                  style={{ backgroundColor: s.v, borderColor: "var(--ad-border)" }}
                />
                <p className="mt-2 text-xs font-medium">{s.label}</p>
                <code className="text-[10px] text-[var(--ad-muted-foreground)]">--ad-{s.label}</code>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
