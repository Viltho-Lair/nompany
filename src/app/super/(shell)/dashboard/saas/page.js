import {
  PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Progress, KpiTile, Table, Icon,
} from "../../../_components/ui";
import { AreaChart, ChartFrame, BarList, Radial } from "../../../_components/charts";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "SaaS" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PLANS = [
  { label: "Starter", value: 46, display: "2,184 studios", color: "var(--ad-chart-1)" },
  { label: "Growth", value: 33, display: "1,566 studios", color: "var(--ad-chart-2)" },
  { label: "Scale", value: 15, display: "712 studios", color: "var(--ad-chart-4)" },
  { label: "Enterprise", value: 6, display: "284 studios", color: "var(--ad-chart-3)" },
];

const SUBSCRIPTIONS = [
  { studio: "Falcon Contracting", plan: "Enterprise", seats: 148, mrr: "$4,240", renews: "Apr 12", status: "Active", tone: "success" },
  { studio: "Nourah Logistics", plan: "Scale", seats: 62, mrr: "$1,860", renews: "Apr 19", status: "Active", tone: "success" },
  { studio: "Dar Almanar", plan: "Growth", seats: 24, mrr: "$720", renews: "Apr 02", status: "Past due", tone: "danger" },
  { studio: "Tamweel Group", plan: "Scale", seats: 78, mrr: "$2,340", renews: "Apr 27", status: "Active", tone: "success" },
  { studio: "Riyadh Tech Park", plan: "Starter", seats: 9, mrr: "$180", renews: "Apr 08", status: "Trialing", tone: "info" },
];

const FEATURES = [
  { label: "Projects", value: 88 },
  { label: "Finance", value: 71 },
  { label: "HR", value: 63 },
  { label: "Inventory", value: 44 },
  { label: "Technical", value: 29 },
];

export default function SaasDashboard() {
  return (
    <>
      <PageHeader
        title="SaaS"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Dashboard" }, { label: "SaaS" }]}
      />

      <Row className="mb-6">
        <Col span={3}><KpiTile label="MRR" value="$284,610" delta={9.8} deltaLabel="from last month" icon="wallet" color="var(--ad-primary)" /></Col>
        <Col span={3}><KpiTile label="Active studios" value="4,746" delta={6.1} deltaLabel="from last month" icon="briefcase" color="#2ca87f" /></Col>
        <Col span={3}><KpiTile label="Churn rate" value="1.8%" delta={-0.4} deltaLabel="from last month" icon="trendDown" color="#e58a00" /></Col>
        <Col span={3}><KpiTile label="Trial conversion" value="34.2%" delta={2.7} deltaLabel="from last month" icon="target" color="#04a9f5" /></Col>
      </Row>

      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead title="Recurring Revenue" sub="New, expansion and churned MRR" />
            <CardBody>
              <ChartFrame
                height={290}
                labels={MONTHS}
                yLabels={["0", "80", "160", "240", "320"]}
                legend={[
                  { name: "Total MRR", color: "var(--ad-chart-1)" },
                  { name: "New", color: "var(--ad-chart-2)" },
                  { name: "Churned", color: "var(--ad-chart-3)" },
                ]}
              >
                <AreaChart
                  height={290}
                  showY={false}
                  labels={MONTHS}
                  series={[
                    { name: "Total MRR", data: [162, 176, 188, 201, 214, 226, 238, 249, 258, 268, 277, 285], color: "var(--ad-chart-1)" },
                    { name: "New", data: [22, 24, 21, 26, 24, 28, 26, 31, 28, 33, 30, 34], color: "var(--ad-chart-2)" },
                    { name: "Churned", data: [8, 9, 7, 11, 9, 12, 10, 13, 11, 14, 12, 15], color: "var(--ad-chart-3)" },
                  ]}
                />
              </ChartFrame>
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <div className="flex h-full flex-col gap-6">
            <Card>
              <CardHead title="Net Revenue Retention" />
              <CardBody className="flex flex-col items-center">
                <Radial value={112} size={140} color="var(--ad-chart-2)" label="112%" sub="trailing 12m" />
                <p className="mt-4 text-center text-xs text-[var(--ad-muted-foreground)]">
                  Expansion is outpacing churn across every plan except Starter.
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardHead title="Plan Distribution" />
              <CardBody>
                <BarList items={PLANS} showValue />
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      <Row>
        <Col span={8}>
          <Card>
            <CardHead title="Subscriptions" action={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm">Manage plans</button>} />
            <Table head={["Studio", "Plan", "Seats", "MRR", "Renews", { label: "Status", align: "end" }]}>
              {SUBSCRIPTIONS.map((s) => (
                <tr key={s.studio}>
                  <td className="whitespace-nowrap font-500">{s.studio}</td>
                  <td><Badge tone="primary">{s.plan}</Badge></td>
                  <td>{s.seats}</td>
                  <td className="whitespace-nowrap font-500">{s.mrr}</td>
                  <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{s.renews}</td>
                  <td className="text-end"><Badge tone={s.tone}>{s.status}</Badge></td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Module Adoption" sub="Share of studios with the module enabled" />
            <CardBody>
              <div className="space-y-5">
                {FEATURES.map((f) => (
                  <div key={f.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span>{f.label}</span>
                      <span className="font-500">{f.value}%</span>
                    </div>
                    <Progress value={f.value} tone={f.value >= 70 ? "success" : f.value >= 40 ? "primary" : "warning"} />
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-3 rounded-lg p-4" style={{ backgroundColor: "var(--ad-muted)" }}>
                <Icon name="info" className="h-4 w-4 shrink-0 text-[var(--ad-primary)]" />
                <p className="text-xs text-[var(--ad-muted-foreground)]">
                  Studios using three or more modules churn at roughly a third of the platform average.
                </p>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
