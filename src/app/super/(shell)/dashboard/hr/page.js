import {
  PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Avatar, Progress, StatCard, Table, Icon,
} from "../../../_components/ui";
import { AreaChart, ChartFrame, Donut, BarList } from "../../../_components/charts";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "HR" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DEPARTMENTS = [
  { label: "Engineering", value: 38 },
  { label: "Operations", value: 24 },
  { label: "Sales", value: 18 },
  { label: "Finance", value: 12 },
  { label: "People", value: 8 },
];

const NEW_HIRES = [
  { name: "Hala Ibrahim", role: "Senior Backend Engineer", dept: "Engineering", start: "Apr 01", status: "Onboarding", tone: "info" },
  { name: "Bilal Rahman", role: "Account Executive", dept: "Sales", start: "Apr 06", status: "Offer signed", tone: "success" },
  { name: "Noor Al-Sayed", role: "Financial Analyst", dept: "Finance", start: "Apr 13", status: "Onboarding", tone: "info" },
  { name: "Faisal Al-Harbi", role: "Operations Lead", dept: "Operations", start: "Apr 20", status: "Background check", tone: "warning" },
];

const LEAVE = [
  { name: "Lina Haddad", type: "Annual leave", range: "Apr 08 – Apr 15", days: 6, tone: "primary" },
  { name: "Omar Nasser", type: "Sick leave", range: "Mar 30 – Mar 31", days: 2, tone: "danger" },
  { name: "Sara Al-Otaibi", type: "Parental leave", range: "Apr 01 – Jun 24", days: 60, tone: "info" },
  { name: "Yousef Khan", type: "Annual leave", range: "Apr 22 – Apr 26", days: 5, tone: "primary" },
];

const OPEN_ROLES = [
  { label: "Engineering", value: 62, display: "8 roles" },
  { label: "Sales", value: 38, display: "5 roles" },
  { label: "Operations", value: 23, display: "3 roles" },
  { label: "Finance", value: 15, display: "2 roles" },
];

export default function HrDashboard() {
  return (
    <>
      <PageHeader
        title="HR"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Dashboard" }, { label: "HR" }]}
        actions={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="plus" className="h-3.5 w-3.5" /> Add employee</button>}
      />

      <Row className="mb-6">
        <Col span={3}><StatCard label="Headcount" value="486" delta={4.1} deltaLabel="vs last quarter" icon="users" tone="primary" /></Col>
        <Col span={3}><StatCard label="Open positions" value="18" delta={12.5} deltaLabel="vs last quarter" icon="briefcase" tone="info" /></Col>
        <Col span={3}><StatCard label="Attrition (12m)" value="7.4%" delta={-1.2} deltaLabel="vs last year" icon="trendDown" tone="success" /></Col>
        <Col span={3}><StatCard label="Avg. tenure" value="3.2 yrs" delta={5.8} deltaLabel="vs last year" icon="clock" tone="warning" /></Col>
      </Row>

      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead title="Headcount Movement" sub="Joiners against leavers" />
            <CardBody>
              <ChartFrame
                height={280}
                labels={MONTHS}
                yLabels={["0", "8", "16", "24", "32"]}
                legend={[{ name: "Joiners", color: "var(--ad-chart-2)" }, { name: "Leavers", color: "var(--ad-chart-3)" }]}
              >
                <AreaChart
                  height={280}
                  showY={false}
                  labels={MONTHS}
                  series={[
                    { name: "Joiners", data: [12, 16, 14, 21, 18, 24, 22, 28, 25, 31, 27, 32], color: "var(--ad-chart-2)" },
                    { name: "Leavers", data: [6, 8, 7, 9, 8, 11, 9, 12, 10, 13, 11, 14], color: "var(--ad-chart-3)" },
                  ]}
                />
              </ChartFrame>
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Headcount by Department" />
            <CardBody className="flex flex-col items-center">
              <Donut
                size={170}
                thickness={22}
                data={DEPARTMENTS}
                center={
                  <>
                    <span className="text-xl font-600">486</span>
                    <span className="text-[11px] text-[var(--ad-muted-foreground)]">people</span>
                  </>
                }
              />
              <ul className="mt-6 w-full space-y-2.5 text-sm">
                {DEPARTMENTS.map((d, i) => (
                  <li key={d.label} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-[var(--ad-muted-foreground)]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--ad-chart-${(i % 5) + 1})` }} />
                      {d.label}
                    </span>
                    <span className="font-500">{d.value}%</span>
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
            <CardHead title="Incoming Hires" action={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm">Pipeline</button>} />
            <Table head={["Candidate", "Department", "Start", { label: "Status", align: "end" }]}>
              {NEW_HIRES.map((h) => (
                <tr key={h.name}>
                  <td>
                    <span className="inline-flex items-center gap-3">
                      <Avatar name={h.name} size={34} />
                      <span className="min-w-0">
                        <span className="block truncate font-500">{h.name}</span>
                        <span className="block truncate text-xs text-[var(--ad-muted-foreground)]">{h.role}</span>
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{h.dept}</td>
                  <td className="ad-num whitespace-nowrap">{h.start}</td>
                  <td className="text-end"><Badge tone={h.tone}>{h.status}</Badge></td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>
        <Col span={5}>
          <Card className="h-full">
            <CardHead title="Upcoming Leave" />
            <CardBody>
              <ul className="space-y-4">
                {LEAVE.map((l) => (
                  <li key={l.name} className="flex items-center gap-3">
                    <Avatar name={l.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-500">{l.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{l.range}</p>
                    </div>
                    <div className="shrink-0 text-end">
                      <Badge tone={l.tone}>{l.type}</Badge>
                      <p className="mt-1 text-[11px] text-[var(--ad-muted-foreground)]">{l.days} days</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col span={5}>
          <Card className="h-full">
            <CardHead title="Open Roles by Team" />
            <CardBody>
              <BarList items={OPEN_ROLES} />
            </CardBody>
          </Card>
        </Col>
        <Col span={7}>
          <Card className="h-full">
            <CardHead title="Engagement Signals" sub="Latest pulse survey" />
            <CardBody>
              <div className="grid gap-6 sm:grid-cols-2">
                {[
                  { label: "Overall satisfaction", value: 84, tone: "success" },
                  { label: "Manager support", value: 79, tone: "success" },
                  { label: "Work–life balance", value: 62, tone: "warning" },
                  { label: "Career growth", value: 57, tone: "warning" },
                  { label: "Tooling & process", value: 71, tone: "primary" },
                  { label: "Recommend as employer", value: 88, tone: "success" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-[var(--ad-muted-foreground)]">{s.label}</span>
                      <span className="font-500">{s.value}%</span>
                    </div>
                    <Progress value={s.value} tone={s.tone} />
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
