import Link from "next/link";
import {
  PageHeader,
  Card,
  CardHead,
  CardBody,
  Row,
  Col,
  Badge,
  Avatar,
  Progress,
  KpiTile,
  Table,
  Icon,
} from "../../../_components/ui";
import { AreaChart, ChartFrame, BarList, Radial } from "../../../_components/charts";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Analytics" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SESSIONS = [42, 55, 48, 63, 58, 74, 68, 82, 76, 91, 85, 97];
const PAGEVIEWS = [28, 36, 33, 45, 41, 52, 49, 58, 54, 66, 61, 72];

const REVENUE_ACTUAL = [32, 41, 38, 52, 47, 61, 58, 69, 64, 76, 71, 80];
const REVENUE_FORECAST = [30, 39, 41, 49, 51, 58, 62, 66, 70, 73, 77, 82];
const REVENUE_TARGET = [35, 40, 45, 50, 55, 60, 62, 65, 68, 72, 75, 78];

const DEVICES = [
  { label: "Desktop", value: 45.8, color: "var(--ad-chart-1)" },
  { label: "Mobile", value: 38.7, color: "var(--ad-chart-2)" },
  { label: "Tablet", value: 15.5, color: "var(--ad-chart-3)" },
];

const REGIONS_MAP = [
  { label: "USA", value: "24.5K", pct: 100, color: "var(--ad-chart-1)" },
  { label: "Europe", value: "18.2K", pct: 74, color: "var(--ad-chart-2)" },
  { label: "Asia", value: "12.8K", pct: 52, color: "var(--ad-chart-4)" },
  { label: "Others", value: "8.1K", pct: 33, color: "var(--ad-chart-5)" },
];

const TRANSACTIONS = [
  { name: "John Doe", email: "john@example.com", product: "Admin Dashboard", amount: "$890.00", status: "Completed", date: "Mar 28, 2026" },
  { name: "Sarah Kim", email: "sarah@example.com", product: "Landing Page", amount: "$450.00", status: "Pending", date: "Mar 27, 2026" },
  { name: "Mike Ross", email: "mike@example.com", product: "E-commerce Theme", amount: "$1,290.00", status: "Failed", date: "Mar 26, 2026" },
  { name: "Lisa Park", email: "lisa@example.com", product: "Portfolio Template", amount: "$320.00", status: "Completed", date: "Mar 25, 2026" },
  { name: "Alex Wong", email: "alex@example.com", product: "Blog Theme", amount: "$675.00", status: "Processing", date: "Mar 24, 2026" },
];

const STATUS_TONE = {
  Completed: "success",
  Pending: "warning",
  Failed: "danger",
  Processing: "info",
};

const ACTIVITY = [
  { tone: "primary", icon: "user", title: "New user registered", body: "John Doe signed up for the premium plan", time: "2 min ago" },
  { tone: "success", icon: "cart", title: "Order #4521 completed", body: "Payment of $890.00 processed successfully", time: "15 min ago" },
  { tone: "warning", icon: "alert", title: "Server load warning", body: "CPU usage peaked at 89% on node-3", time: "1 hour ago" },
  { tone: "info", icon: "rocket", title: "New feature deployed", body: "Analytics dashboard v2.4 released to production", time: "3 hours ago" },
  { tone: "danger", icon: "wallet", title: "Payment failed", body: "Subscription renewal failed for user #8842", time: "5 hours ago" },
];

const TONE_BG = {
  primary: "rgba(70,128,255,.14)",
  success: "rgba(44,168,127,.16)",
  warning: "rgba(229,138,0,.16)",
  info: "rgba(4,169,245,.16)",
  danger: "rgba(220,38,38,.14)",
};
const TONE_FG = {
  primary: "var(--ad-primary)",
  success: "var(--ad-success)",
  warning: "var(--ad-warning)",
  info: "var(--ad-info)",
  danger: "var(--ad-destructive)",
};

const TOP_REGIONS = [
  { name: "North America", amount: "$247,890", delta: 24.5 },
  { name: "Europe", amount: "$198,456", delta: 18.2 },
  { name: "Asia Pacific", amount: "$156,789", delta: 31.7 },
  { name: "Latin America", amount: "$89,234", delta: -5.3 },
];

const GOALS = [
  { label: "Monthly", value: 78, color: "var(--ad-chart-1)" },
  { label: "Quarterly", value: 92, color: "var(--ad-chart-2)" },
  { label: "Annual", value: 65, color: "var(--ad-chart-4)" },
];

function RangeTabs() {
  return (
    <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: "var(--ad-border)" }}>
      {["7d", "30d", "90d"].map((r, i) => (
        <button
          key={r}
          type="button"
          className="rounded px-2.5 py-1 text-xs font-medium transition-colors"
          style={
            i === 1
              ? { backgroundColor: "var(--ad-primary)", color: "var(--ad-primary-foreground)" }
              : { color: "var(--ad-muted-foreground)" }
          }
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-[var(--ad-muted-foreground)]">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

function CenterStat({ value, label, sub, tone = "primary" }) {
  return (
    <Card className="text-center">
      <CardBody full>
        <p className="text-2xl font-semibold" style={{ color: TONE_FG[tone] }}>
          {value}
        </p>
        <p className="mt-1 text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{sub}</p>
      </CardBody>
    </Card>
  );
}

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analytics"
        breadcrumb={[
          { label: "Home", href: `${BASE}/dashboard/analytics` },
          { label: "Dashboard" },
          { label: "Analytics" },
        ]}
      />

      {/* ---- KPI tiles ---------------------------------------------------- */}
      <Row className="mb-6">
        <Col span={3}>
          <KpiTile label="Total Revenue" value="$2,965,515" delta={12.5} deltaLabel="from last month" icon="wallet" color="var(--ad-primary)" />
        </Col>
        <Col span={3}>
          <KpiTile label="Active Users" value="86,412" delta={8.2} deltaLabel="from last week" icon="users" color="#2ca87f" />
        </Col>
        <Col span={3}>
          <KpiTile label="Orders" value="6,465" delta={-2.1} deltaLabel="from yesterday" icon="cart" color="#e58a00" />
        </Col>
        <Col span={3}>
          <KpiTile label="Conversion Rate" value="12.15%" delta={0.3} deltaLabel="from last month" icon="target" color="#04a9f5" />
        </Col>
      </Row>

      {/* ---- realtime + devices ------------------------------------------- */}
      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead title="Real-time Analytics" action={<RangeTabs />} />
            <CardBody>
              <div className="mb-5 flex gap-10">
                <MiniStat label="Sessions" value="47,829" />
                <MiniStat label="Page Views" value="186,247" />
              </div>
              <ChartFrame
                height={280}
                labels={MONTHS}
                yLabels={["0", "20", "40", "60", "80", "100"]}
                legend={[
                  { name: "Sessions", color: "var(--ad-chart-1)" },
                  { name: "Page Views", color: "var(--ad-chart-2)" },
                ]}
              >
                <AreaChart
                  height={280}
                  showY={false}
                  labels={MONTHS}
                  series={[
                    { name: "Sessions", data: SESSIONS, color: "var(--ad-chart-1)" },
                    { name: "Page Views", data: PAGEVIEWS, color: "var(--ad-chart-2)" },
                  ]}
                />
              </ChartFrame>
            </CardBody>
          </Card>
        </Col>

        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Device Analytics" sub="Share of sessions by device" />
            <CardBody>
              <BarList items={DEVICES} />
              <div className="mt-7 grid grid-cols-3 gap-3 border-t pt-5 text-center" style={{ borderColor: "var(--ad-border)" }}>
                {DEVICES.map((d) => (
                  <div key={d.label}>
                    <p className="text-base font-semibold" style={{ color: d.color }}>
                      {d.value}%
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--ad-muted-foreground)]">{d.label}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ---- distribution + sentiment / server ----------------------------- */}
      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead
              title="Global User Distribution"
              action={<span className="text-xs text-[var(--ad-muted-foreground)]">Last 30 Days</span>}
            />
            <CardBody>
              <div className="grid gap-6 sm:grid-cols-4">
                {REGIONS_MAP.map((r) => (
                  <div key={r.label}>
                    <p className="text-xl font-semibold" style={{ color: r.color }}>
                      {r.value}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{r.label}</p>
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ad-muted)]">
                      <div className="h-full rounded-full" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <ChartFrame height={180} labels={MONTHS}>
                  <AreaChart
                    height={180}
                    showY={false}
                    yTicks={3}
                    labels={MONTHS}
                    series={[{ name: "Users", data: [18, 24, 21, 30, 27, 36, 33, 42, 38, 47, 44, 52], color: "var(--ad-chart-1)" }]}
                  />
                </ChartFrame>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col span={4}>
          <div className="flex h-full flex-col gap-6">
            <Card>
              <CardHead title="Customer Sentiment" />
              <CardBody>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full">
                  <span style={{ width: "24%", backgroundColor: "var(--ad-destructive)" }} />
                  <span style={{ width: "76%", backgroundColor: "var(--ad-success)" }} />
                </div>
                <div className="mt-4 flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ad-destructive)]">Negative</p>
                    <p className="mt-0.5 text-lg font-semibold">24%</p>
                    <p className="text-xs text-[var(--ad-muted-foreground)]">287 Reviews</p>
                  </div>
                  <div className="text-end">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ad-success)]">Positive</p>
                    <p className="mt-0.5 text-lg font-semibold">76%</p>
                    <p className="text-xs text-[var(--ad-muted-foreground)]">892 Reviews</p>
                  </div>
                </div>
                <Link
                  href={`${BASE}/application/users`}
                  className="mt-5 flex items-center justify-center gap-1.5 text-sm font-medium text-[var(--ad-primary)] hover:underline"
                >
                  View All Reviews <Icon name="chevronRight" className="h-3.5 w-3.5" />
                </Link>
              </CardBody>
            </Card>

            <Card>
              <CardHead
                title="Server Performance"
                action={<Badge tone="success">Optimal</Badge>}
              />
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span>CPU Usage</span>
                      <span className="font-medium">67%</span>
                    </div>
                    <Progress value={67} tone="primary" />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span>Memory</span>
                      <span className="font-medium">82%</span>
                    </div>
                    <Progress value={82} tone="warning" />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      {/* ---- transactions + activity --------------------------------------- */}
      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead
              title="Recent Transactions"
              action={
                <>
                  <button type="button" className="ad-btn ad-btn-outline ad-btn-sm">
                    <Icon name="download" className="h-3.5 w-3.5" /> Export
                  </button>
                  <button type="button" className="ad-btn ad-btn-primary ad-btn-sm">
                    <Icon name="plus" className="h-3.5 w-3.5" /> Add New
                  </button>
                </>
              }
            />
            <div className="pb-2">
              <Table head={["Customer", "Product", "Amount", "Status", { label: "Date", align: "end" }]}>
                {TRANSACTIONS.map((t) => (
                  <tr key={t.email}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={t.name} size={36} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{t.name}</p>
                          <p className="truncate text-xs text-[var(--ad-muted-foreground)]">{t.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{t.product}</td>
                    <td className="whitespace-nowrap font-medium">{t.amount}</td>
                    <td>
                      <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap text-end text-[var(--ad-muted-foreground)]">{t.date}</td>
                  </tr>
                ))}
              </Table>
            </div>
          </Card>
        </Col>

        <Col span={4}>
          <Card className="h-full">
            <CardHead
              title="Live Activity Feed"
              action={
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ad-success)]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ad-success)] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ad-success)]" />
                  </span>
                  Live
                </span>
              }
            />
            <CardBody>
              <ul className="space-y-5">
                {ACTIVITY.map((a) => (
                  <li key={a.title} className="flex gap-3">
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: TONE_BG[a.tone], color: TONE_FG[a.tone] }}
                    >
                      <Icon name={a.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{a.body}</p>
                      <p className="mt-1 text-[11px] text-[var(--ad-muted-foreground)]">{a.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href={`${BASE}/application/notifications`}
                className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-[var(--ad-primary)] hover:underline"
              >
                View All Activities <Icon name="chevronRight" className="h-3.5 w-3.5" />
              </Link>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ---- four centred stats -------------------------------------------- */}
      <Row className="mb-6">
        <Col span={3}>
          <Card className="text-center">
            <CardBody full>
              <Radial value={78} size={120} color="var(--ad-chart-1)" />
              <p className="mt-3 text-sm font-medium">Sales Performance</p>
              <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">78% of target</p>
            </CardBody>
          </Card>
        </Col>
        <Col span={3}>
          <Card className="text-center">
            <CardBody full>
              <Radial value={96} size={120} color="var(--ad-chart-2)" label="4.8/5" />
              <p className="mt-3 text-sm font-medium">Customer Satisfaction</p>
              <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">4.8 out of 5</p>
            </CardBody>
          </Card>
        </Col>
        <Col span={3}>
          <Card className="text-center">
            <CardBody full>
              <Radial value={99.9} size={120} color="var(--ad-chart-3)" label="99.9%" />
              <p className="mt-3 text-sm font-medium">System Uptime</p>
              <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">99.9% — Last 30 days</p>
            </CardBody>
          </Card>
        </Col>
        <Col span={3}>
          <Card className="text-center">
            <CardBody full>
              <Radial value={62} size={120} color="var(--ad-chart-5)" label="124ms" />
              <p className="mt-3 text-sm font-medium">API Response Time</p>
              <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">~124ms average</p>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* ---- revenue trends + regions / goals ------------------------------ */}
      <Row>
        <Col span={8}>
          <Card>
            <CardHead title="Revenue Trends" sub="Actual against forecast and target" />
            <CardBody>
              <ChartFrame
                height={300}
                labels={MONTHS}
                yLabels={["0", "20", "40", "60", "80"]}
                legend={[
                  { name: "Actual", color: "var(--ad-chart-1)" },
                  { name: "Forecast", color: "var(--ad-chart-4)" },
                  { name: "Target", color: "var(--ad-chart-3)" },
                ]}
              >
                <AreaChart
                  height={300}
                  showY={false}
                  labels={MONTHS}
                  dashed={[1, 2]}
                  series={[
                    { name: "Actual", data: REVENUE_ACTUAL, color: "var(--ad-chart-1)" },
                    { name: "Forecast", data: REVENUE_FORECAST, color: "var(--ad-chart-4)" },
                    { name: "Target", data: REVENUE_TARGET, color: "var(--ad-chart-3)" },
                  ]}
                />
              </ChartFrame>
            </CardBody>
          </Card>
        </Col>

        <Col span={4}>
          <div className="flex flex-col gap-6">
            <Card>
              <CardHead title="Top Regions" />
              <CardBody>
                <ul className="space-y-4">
                  {TOP_REGIONS.map((r) => (
                    <li key={r.name} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-[var(--ad-muted-foreground)]">{r.amount}</p>
                      </div>
                      <span
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium"
                        style={{ color: r.delta >= 0 ? "var(--ad-success)" : "var(--ad-destructive)" }}
                      >
                        <Icon name={r.delta >= 0 ? "trendUp" : "trendDown"} className="h-3.5 w-3.5" />
                        {r.delta > 0 ? "+" : ""}
                        {r.delta}%
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Goal Progress" />
              <CardBody>
                <BarList items={GOALS} />
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>
    </>
  );
}
