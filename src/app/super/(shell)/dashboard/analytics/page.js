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
import CurrencyRates from "./CurrencyRates";
import RealtimeAnalytics from "./RealtimeAnalytics";
import GlobalDistribution from "./GlobalDistribution";
import DeviceAnalytics from "./DeviceAnalytics";
import { satisfaction } from "@/lib/data/ratings";
import { listUsersForConsole } from "@/lib/data/users";
import { statusOf, STATUS } from "@/lib/platformRoles";
import { recordActiveUsers, readActiveUsers, isoDay } from "@/lib/data/siteStats";

export const metadata = { title: "Analytics" };

// ACTIVE USERS, counted exactly the way /application/users counts it —
// statusOf() over the same records — so the tile and the console cannot
// disagree about who is around.
//
// The week-over-week figure compares against a RECORDED SNAPSHOT rather than
// re-reading history. It has to: a user carries one "last seen" timestamp, so
// anyone who has come back since has erased the evidence that they were also
// here last week. Asking today's records who was active seven days ago answers
// only with the people who never returned.
async function activeUsers() {
  const users = await listUsersForConsole();
  const now = Date.now();
  const current = users.filter((u) => statusOf(u, now) === STATUS.active).length;

  // Today's count is written down for a future week to compare against. First
  // writer of the day wins, so this and the daily cron cannot fight.
  await recordActiveUsers(current);

  const weekAgo = isoDay(new Date(now - 7 * 24 * 60 * 60 * 1000));
  const before = await readActiveUsers(weekAgo);

  // A day nobody recorded, or a week with nobody in it, gives no percentage.
  // "+100%" off nothing claims more than it knows.
  const delta = before != null && before > 0
    ? Math.round(((current - before) / before) * 1000) / 10
    : null;
  return { current, delta };
}


const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


const REVENUE_ACTUAL = [32, 41, 38, 52, 47, 61, 58, 69, 64, 76, 71, 80];
const REVENUE_FORECAST = [30, 39, 41, 49, 51, 58, 62, 66, 70, 73, 77, 82];
const REVENUE_TARGET = [35, 40, 45, 50, 55, 60, 62, 65, 68, 72, 75, 78];



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

export default async function AnalyticsPage() {
  const [active, sat] = await Promise.all([activeUsers(), satisfaction()]);

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
          <KpiTile label="Active Users" value={active.current.toLocaleString()} delta={active.delta} deltaLabel={active.delta == null ? "· no reading from last week yet" : "from last week"} icon="users" color="#2ca87f" />
        </Col>
        <Col span={3}>
          <KpiTile label="Orders" value="6,465" delta={-2.1} deltaLabel="from yesterday" icon="cart" color="#e58a00" />
        </Col>
        <Col span={3}>
          <KpiTile label="Conversion Rate" value="12.15%" delta={0.3} deltaLabel="from last month" icon="target" color="#04a9f5" />
        </Col>
      </Row>

      {/* ---- today's exchange rates ---------------------------------------- */}
      <Row className="mb-6">
        <Col span={12}>
          <CurrencyRates />
        </Col>
      </Row>

      {/* ---- realtime + devices ------------------------------------------- */}
      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead title="Real-time Analytics" />
            <CardBody>
              {/* Real counters, and the range buttons that drive them, both
                  live in the client component — the card is just its frame. */}
              <RealtimeAnalytics />
            </CardBody>
          </Card>
        </Col>

        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Device Analytics" sub="Share of sessions by device" />
            <CardBody>
              <DeviceAnalytics />
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
            />
            <CardBody>
              {/* Continents and the trend beneath both come from the same daily
                  counters as Real-time Analytics, so both are cleared and
                  mailed by the same new-year rollover. */}
              <GlobalDistribution />
            </CardBody>
          </Card>
        </Col>

        <Col span={4}>
          <div className="flex h-full flex-col gap-6">
            <Card>
              <CardHead title="Customer Satisfaction" />
              <CardBody>
                {/* The share of RATINGS of 4 or 5 against those of 3 or below.
                    People who closed the prompt without answering are excluded:
                    a non-answer is not an unhappy customer, and counting it as
                    one would let a quiet month look like a bad one. */}
                {sat.total === 0 ? (
                  <p className="py-6 text-center text-sm text-[var(--ad-muted-foreground)]">
                    No ratings yet. Users are asked once, fifteen days in.
                  </p>
                ) : (
                  <>
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full">
                      <span style={{ width: `${sat.negativePct}%`, backgroundColor: "var(--ad-destructive)" }} />
                      <span style={{ width: `${sat.positivePct}%`, backgroundColor: "var(--ad-success)" }} />
                    </div>
                    <div className="mt-4 flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ad-destructive)]">3 and below</p>
                        <p className="mt-0.5 text-lg font-semibold">{sat.negativePct}%</p>
                        <p className="text-xs text-[var(--ad-muted-foreground)]">{sat.negative} rating{sat.negative === 1 ? "" : "s"}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ad-success)]">4 and above</p>
                        <p className="mt-0.5 text-lg font-semibold">{sat.positivePct}%</p>
                        <p className="text-xs text-[var(--ad-muted-foreground)]">{sat.positive} rating{sat.positive === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                  </>
                )}
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
              // NO Export button here. It had no onClick and no href, and it sat
              // over TRANSACTIONS — a hardcoded array, not anything this studio
              // has. A download control over demo data is worse than none: it
              // promises a file that does not exist, of numbers that are not
              // real. The working one is on Real-time Analytics, beside the
              // range picker, over the counters /api/track actually writes.
              action={
                <button type="button" className="ad-btn ad-btn-primary ad-btn-sm">
                  <Icon name="plus" className="h-3.5 w-3.5" /> Add New
                </button>
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
