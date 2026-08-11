import {
  PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Progress, StatCard, Table, Icon,
} from "../../../_components/ui";
import { AreaChart, ChartFrame, BarChart, Donut, Sparkline } from "../../../_components/charts";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Finance" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ACCOUNTS = [
  { name: "Operating account", bank: "Al Rajhi · ****4192", balance: "$1,284,320", delta: 4.2, spark: [42, 48, 45, 53, 51, 58, 62] },
  { name: "Payroll account", bank: "SNB · ****7730", balance: "$412,880", delta: -1.8, spark: [38, 36, 39, 35, 33, 31, 30] },
  { name: "Tax reserve", bank: "Riyad Bank · ****2015", balance: "$298,140", delta: 2.6, spark: [21, 23, 22, 25, 26, 28, 29] },
];

const EXPENSES = [
  { label: "Payroll", value: 38, amount: "$486,200" },
  { label: "Infrastructure", value: 21, amount: "$268,700" },
  { label: "Marketing", value: 17, amount: "$217,400" },
  { label: "Operations", value: 14, amount: "$179,100" },
  { label: "Other", value: 10, amount: "$127,900" },
];

const INVOICES = [
  { id: "INV-2291", client: "Falcon Contracting", amount: "$42,400", due: "Apr 04", status: "Paid", tone: "success" },
  { id: "INV-2290", client: "Nourah Logistics", amount: "$18,900", due: "Apr 09", status: "Sent", tone: "info" },
  { id: "INV-2288", client: "Dar Almanar", amount: "$67,250", due: "Mar 30", status: "Overdue", tone: "danger" },
  { id: "INV-2287", client: "Tamweel Group", amount: "$31,600", due: "Apr 15", status: "Draft", tone: "muted" },
  { id: "INV-2285", client: "Riyadh Tech Park", amount: "$12,080", due: "Apr 01", status: "Paid", tone: "success" },
];

const LEDGER = [
  { desc: "Cloud hosting — March", cat: "Infrastructure", amount: "-$18,240", tone: "danger", date: "Mar 28" },
  { desc: "Client payment — Falcon", cat: "Revenue", amount: "+$42,400", tone: "success", date: "Mar 27" },
  { desc: "Payroll run — March", cat: "Payroll", amount: "-$162,900", tone: "danger", date: "Mar 25" },
  { desc: "Client payment — Riyadh TP", cat: "Revenue", amount: "+$12,080", tone: "success", date: "Mar 24" },
  { desc: "Ad spend — Q1 campaign", cat: "Marketing", amount: "-$24,600", tone: "danger", date: "Mar 22" },
];

export default function FinanceDashboard() {
  return (
    <>
      <PageHeader
        title="Finance"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Dashboard" }, { label: "Finance" }]}
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="calendar" className="h-3.5 w-3.5" /> FY 2026</button>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="plus" className="h-3.5 w-3.5" /> New invoice</button>
          </>
        }
      />

      <Row className="mb-6">
        <Col span={3}><StatCard label="Total revenue" value="$4.28M" delta={14.6} deltaLabel="YoY" icon="trendUp" tone="success" /></Col>
        <Col span={3}><StatCard label="Total expenses" value="$1.28M" delta={6.1} deltaLabel="YoY" icon="trendDown" tone="danger" /></Col>
        <Col span={3}><StatCard label="Net profit" value="$3.00M" delta={18.9} deltaLabel="YoY" icon="wallet" tone="primary" /></Col>
        <Col span={3}><StatCard label="Outstanding" value="$129,830" delta={-8.4} deltaLabel="vs last month" icon="clock" tone="warning" /></Col>
      </Row>

      <Row className="mb-6">
        {ACCOUNTS.map((a, i) => (
          <Col key={a.name} span={4}>
            <Card>
              <CardBody full>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{a.bank}</p>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium"
                    style={{ color: a.delta >= 0 ? "var(--ad-success)" : "var(--ad-destructive)" }}
                  >
                    <Icon name={a.delta >= 0 ? "trendUp" : "trendDown"} className="h-3.5 w-3.5" />
                    {a.delta > 0 ? "+" : ""}{a.delta}%
                  </span>
                </div>
                <p className="mt-4 text-2xl font-semibold">{a.balance}</p>
                <div className="mt-3">
                  <Sparkline data={a.spark} height={44} color={`var(--ad-chart-${i + 1})`} />
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead title="Cash Flow" sub="Income against expenditure" />
            <CardBody>
              <ChartFrame
                height={290}
                labels={MONTHS}
                yLabels={["0", "100", "200", "300", "400"]}
                legend={[{ name: "Income", color: "var(--ad-chart-2)" }, { name: "Expenses", color: "var(--ad-chart-3)" }]}
              >
                <AreaChart
                  height={290}
                  showY={false}
                  labels={MONTHS}
                  series={[
                    { name: "Income", data: [240, 268, 254, 302, 288, 336, 318, 372, 348, 396, 371, 404], color: "var(--ad-chart-2)" },
                    { name: "Expenses", data: [88, 96, 92, 108, 101, 118, 112, 128, 121, 136, 129, 141], color: "var(--ad-chart-3)" },
                  ]}
                />
              </ChartFrame>
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Expense Breakdown" sub="Year to date" />
            <CardBody className="flex flex-col items-center">
              <Donut
                size={170}
                thickness={22}
                data={EXPENSES}
                center={
                  <>
                    <span className="text-lg font-semibold">$1.28M</span>
                    <span className="text-[11px] text-[var(--ad-muted-foreground)]">spent</span>
                  </>
                }
              />
              <ul className="mt-6 w-full space-y-3 text-sm">
                {EXPENSES.map((e, i) => (
                  <li key={e.label} className="flex items-center justify-between gap-2">
                    <span className="inline-flex min-w-0 items-center gap-2 text-[var(--ad-muted-foreground)]">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: `var(--ad-chart-${(i % 5) + 1})` }} />
                      <span className="truncate">{e.label}</span>
                    </span>
                    <span className="shrink-0 font-medium">{e.amount}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-6">
        <Col span={7}>
          <Card className="h-full">
            <CardHead title="Invoices" action={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm">View all</button>} />
            <Table head={["Invoice", "Client", "Amount", "Due", { label: "Status", align: "end" }]}>
              {INVOICES.map((v) => (
                <tr key={v.id}>
                  <td className="whitespace-nowrap font-medium text-[var(--ad-primary)]">{v.id}</td>
                  <td className="whitespace-nowrap">{v.client}</td>
                  <td className="whitespace-nowrap font-medium">{v.amount}</td>
                  <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{v.due}</td>
                  <td className="text-end"><Badge tone={v.tone}>{v.status}</Badge></td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>
        <Col span={5}>
          <Card className="h-full">
            <CardHead title="Recent Ledger Entries" />
            <CardBody>
              <ul className="space-y-4">
                {LEDGER.map((l) => (
                  <li key={l.desc} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.desc}</p>
                      <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{l.cat} · {l.date}</p>
                    </div>
                    <span
                      className="shrink-0 text-sm font-semibold"
                      style={{ color: l.tone === "success" ? "var(--ad-success)" : "var(--ad-destructive)" }}
                    >
                      {l.amount}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col span={8}>
          <Card>
            <CardHead title="Budget vs Actual" sub="Departmental spend this quarter" />
            <CardBody>
              <BarChart
                height={240}
                labels={["Payroll", "Infra", "Marketing", "Ops", "R&D", "Legal"]}
                series={[
                  { name: "Budget", data: [180, 96, 82, 64, 58, 24], color: "var(--ad-chart-1)" },
                  { name: "Actual", data: [162, 108, 74, 71, 49, 19], color: "var(--ad-chart-3)" },
                ]}
              />
              <div className="mt-2 grid grid-cols-6 text-center text-[11px] text-[var(--ad-muted-foreground)]">
                {["Payroll", "Infra", "Marketing", "Ops", "R&D", "Legal"].map((d) => <span key={d}>{d}</span>)}
              </div>
              <div className="mt-4 flex justify-center gap-5 text-xs text-[var(--ad-muted-foreground)]">
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--ad-chart-1)" }} />Budget</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--ad-chart-3)" }} />Actual</span>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Collection Health" />
            <CardBody>
              <div className="space-y-5">
                {[
                  { label: "Current (0–30 days)", value: 68, tone: "success", amount: "$88,280" },
                  { label: "31–60 days", value: 21, tone: "warning", amount: "$27,270" },
                  { label: "61–90 days", value: 8, tone: "danger", amount: "$10,390" },
                  { label: "90+ days", value: 3, tone: "danger", amount: "$3,890" },
                ].map((b) => (
                  <div key={b.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-[var(--ad-muted-foreground)]">{b.label}</span>
                      <span className="font-medium">{b.amount}</span>
                    </div>
                    <Progress value={b.value} tone={b.tone} />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
