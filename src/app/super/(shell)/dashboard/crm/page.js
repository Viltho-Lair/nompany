import {
  PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Avatar, Progress, StatCard, Table, Icon,
  toneBg, toneInk,} from "../../../_components/ui";
import { AreaChart, ChartFrame, BarChart, Donut } from "@/components/charts";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "CRM" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PIPELINE = [
  { stage: "Lead", count: 428, value: "$1.24M", pct: 100, tone: "primary" },
  { stage: "Qualified", count: 261, value: "$986K", pct: 74, tone: "info" },
  { stage: "Proposal", count: 143, value: "$612K", pct: 48, tone: "warning" },
  { stage: "Negotiation", count: 78, value: "$391K", pct: 29, tone: "success" },
  { stage: "Won", count: 46, value: "$248K", pct: 17, tone: "success" },
];

const DEALS = [
  { company: "Falcon Contracting", owner: "Sara Al-Otaibi", value: "$84,200", stage: "Negotiation", tone: "warning", close: "Apr 12", prob: 72 },
  { company: "Nourah Logistics", owner: "Yousef Khan", value: "$126,500", stage: "Proposal", tone: "info", close: "Apr 18", prob: 55 },
  { company: "Dar Almanar", owner: "Lina Haddad", value: "$47,900", stage: "Won", tone: "success", close: "Mar 30", prob: 100 },
  { company: "Tamweel Group", owner: "Omar Nasser", value: "$213,000", stage: "Qualified", tone: "primary", close: "May 02", prob: 34 },
  { company: "Riyadh Tech Park", owner: "Sara Al-Otaibi", value: "$68,400", stage: "Lost", tone: "danger", close: "Mar 21", prob: 0 },
];

const SOURCES = [
  { label: "Organic search", value: 34 },
  { label: "Referral", value: 26 },
  { label: "Paid ads", value: 21 },
  { label: "Outbound", value: 19 },
];

const REPS = [
  { name: "Sara Al-Otaibi", deals: 24, quota: 92, revenue: "$412K" },
  { name: "Yousef Khan", deals: 19, quota: 78, revenue: "$338K" },
  { name: "Lina Haddad", deals: 17, quota: 71, revenue: "$296K" },
  { name: "Omar Nasser", deals: 12, quota: 54, revenue: "$187K" },
];

const TASKS = [
  { title: "Follow up with Tamweel Group", due: "Today, 14:00", tone: "danger", icon: "phone" },
  { title: "Send revised proposal — Nourah", due: "Tomorrow", tone: "warning", icon: "mail" },
  { title: "Quarterly review — Falcon", due: "Thu, 10:00", tone: "primary", icon: "calendar" },
  { title: "Renewal check-in — Dar Almanar", due: "Next Monday", tone: "info", icon: "refresh" },
];

// The tone table, built from the console's ONE tone helper rather than being a
// ninth copy of the same hand-mixed rgba() values. See toneBg/toneFg in
// _components/ui: the tint composes from the semantic token, so it follows the
// design system and the theme instead of freezing the template's palette.
const TONE_NAMES = ["primary", "success", "warning", "info", "danger"];
const TONE_FG = Object.fromEntries(TONE_NAMES.map((t) => [t, toneInk(t)]));
const TONE_BG = Object.fromEntries(TONE_NAMES.map((t) => [t, toneBg(t)]));

export default function CrmPage() {
  return (
    <>
      <PageHeader
        title="CRM"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Dashboard" }, { label: "CRM" }]}
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm">
              <Icon name="filter" className="h-3.5 w-3.5" /> Filter
            </button>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-sm">
              <Icon name="plus" className="h-3.5 w-3.5" /> New deal
            </button>
          </>
        }
      />

      <Row className="mb-6">
        <Col span={3}><StatCard label="Open pipeline" value="$3.23M" delta={11.4} deltaLabel="vs last quarter" icon="target" tone="primary" /></Col>
        <Col span={3}><StatCard label="Deals won" value="46" delta={7.8} deltaLabel="this month" icon="award" tone="success" /></Col>
        <Col span={3}><StatCard label="Win rate" value="32.6%" delta={-1.9} deltaLabel="vs last month" icon="trendUp" tone="warning" /></Col>
        <Col span={3}><StatCard label="Avg. deal size" value="$70,240" delta={4.2} deltaLabel="vs last month" icon="wallet" tone="info" /></Col>
      </Row>

      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead title="Revenue vs Pipeline" sub="Closed-won against total open value" />
            <CardBody>
              <ChartFrame
                height={280}
                labels={MONTHS}
                yLabels={["0", "25", "50", "75", "100"]}
                legend={[{ name: "Closed won", color: "var(--ad-chart-1)" }, { name: "Pipeline", color: "var(--ad-chart-2)" }]}
              >
                <AreaChart
                  height={280}
                  showY={false}
                  labels={MONTHS}
                  series={[
                    { name: "Closed won", data: [22, 31, 27, 44, 38, 52, 47, 61, 55, 68, 62, 74], color: "var(--ad-chart-1)" },
                    { name: "Pipeline", data: [48, 57, 52, 69, 63, 78, 72, 88, 81, 94, 87, 99], color: "var(--ad-chart-2)" },
                  ]}
                />
              </ChartFrame>
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Sales Funnel" sub="Deals by stage" />
            <CardBody>
              <ul className="space-y-4">
                {PIPELINE.map((p) => (
                  <li key={p.stage}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TONE_FG[p.tone] }} />
                        {p.stage}
                      </span>
                      <span className="text-[var(--ad-muted-foreground)]">
                        {p.count} · <span className="font-500 text-[var(--ad-foreground)]">{p.value}</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ad-muted)]">
                      <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: TONE_FG[p.tone] }} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead title="Active Deals" action={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm">View all</button>} />
            <Table head={["Company", "Owner", "Value", "Stage", "Probability", { label: "Close", align: "end" }]}>
              {DEALS.map((d) => (
                <tr key={d.company}>
                  <td className="whitespace-nowrap font-500">{d.company}</td>
                  <td>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <Avatar name={d.owner} size={28} />
                      <span className="text-[var(--ad-muted-foreground)]">{d.owner}</span>
                    </span>
                  </td>
                  <td className="num whitespace-nowrap font-500">{d.value}</td>
                  <td><Badge tone={d.tone}>{d.stage}</Badge></td>
                  <td>
                    <div className="flex min-w-[120px] items-center gap-2">
                      <Progress value={d.prob} tone={d.tone} height={5} />
                      <span className="num w-9 shrink-0 text-xs text-[var(--ad-muted-foreground)]">{d.prob}%</span>
                    </div>
                  </td>
                  <td className="num whitespace-nowrap text-end text-[var(--ad-muted-foreground)]">{d.close}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>
        <Col span={4}>
          <div className="flex h-full flex-col gap-6">
            <Card>
              <CardHead title="Lead Sources" />
              <CardBody className="flex items-center gap-6">
                <Donut
                  size={140}
                  thickness={20}
                  data={SOURCES}
                  center={
                    <>
                      <span className="text-lg font-600">1,284</span>
                      <span className="text-[11px] text-[var(--ad-muted-foreground)]">leads</span>
                    </>
                  }
                />
                <ul className="flex-1 space-y-2.5 text-sm">
                  {SOURCES.map((s, i) => (
                    <li key={s.label} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-[var(--ad-muted-foreground)]">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--ad-chart-${i + 1})` }} />
                        {s.label}
                      </span>
                      <span className="font-500">{s.value}%</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
            <Card>
              <CardHead title="Upcoming Tasks" />
              <CardBody>
                <ul className="space-y-4">
                  {TASKS.map((t) => (
                    <li key={t.title} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: TONE_BG[t.tone], color: TONE_FG[t.tone] }}
                      >
                        <Icon name={t.icon} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-500">{t.title}</p>
                        <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{t.due}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      <Row>
        <Col span={5}>
          <Card className="h-full">
            <CardHead title="Rep Performance" sub="Quota attainment this quarter" />
            <CardBody>
              <ul className="space-y-5">
                {REPS.map((r) => (
                  <li key={r.name}>
                    <div className="mb-2 flex items-center gap-3">
                      <Avatar name={r.name} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-500">{r.name}</p>
                        <p className="text-xs text-[var(--ad-muted-foreground)]">{r.deals} deals · {r.revenue}</p>
                      </div>
                      <span className="text-sm font-600">{r.quota}%</span>
                    </div>
                    <Progress value={r.quota} tone={r.quota >= 80 ? "success" : r.quota >= 60 ? "primary" : "warning"} />
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>
        <Col span={7}>
          <Card className="h-full">
            <CardHead title="Deals Created vs Closed" sub="Last 12 months" />
            <CardBody>
              <BarChart
                height={260}
                labels={MONTHS}
                series={[
                  { name: "Created", data: [38, 44, 41, 52, 48, 61, 57, 66, 62, 71, 68, 76], color: "var(--ad-chart-1)" },
                  { name: "Closed", data: [21, 26, 24, 33, 29, 38, 35, 43, 40, 47, 44, 52], color: "var(--ad-chart-2)" },
                ]}
              />
              <div className="mt-2 grid grid-cols-12 text-center text-[11px] text-[var(--ad-muted-foreground)]">
                {MONTHS.map((m) => <span key={m}>{m}</span>)}
              </div>
              <div className="mt-4 flex justify-center gap-5 text-xs text-[var(--ad-muted-foreground)]">
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--ad-chart-1)" }} />Created</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--ad-chart-2)" }} />Closed</span>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
