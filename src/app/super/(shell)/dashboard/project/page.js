import {
  PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Avatar, Progress, StatCard, Table, Icon,
  toneBg, toneFg, toneInk,} from "../../../_components/ui";
import { AreaChart, ChartFrame, BarList, Radial } from "@/components/charts";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Project" };

const WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"];

const PROJECTS = [
  { name: "Studio onboarding v3", lead: "Lina Haddad", progress: 82, due: "Apr 18", status: "On track", tone: "success", team: ["Lina Haddad", "Omar Nasser", "Sara Al-Otaibi"] },
  { name: "Billing migration", lead: "Omar Nasser", progress: 46, due: "May 06", status: "At risk", tone: "warning", team: ["Omar Nasser", "Yousef Khan"] },
  { name: "Mobile companion app", lead: "Yousef Khan", progress: 28, due: "Jun 22", status: "Planning", tone: "info", team: ["Yousef Khan", "Maya Tarek", "Bilal Rahman"] },
  { name: "Data warehouse rebuild", lead: "Sara Al-Otaibi", progress: 94, due: "Apr 02", status: "On track", tone: "success", team: ["Sara Al-Otaibi", "Hala Ibrahim"] },
  { name: "Arabic RTL polish", lead: "Maya Tarek", progress: 11, due: "Jul 09", status: "Blocked", tone: "danger", team: ["Maya Tarek"] },
];

const MILESTONES = [
  { title: "Beta freeze", date: "Apr 05", tone: "primary", icon: "flag" },
  { title: "Security review", date: "Apr 14", tone: "warning", icon: "shield" },
  { title: "Public launch", date: "May 02", tone: "success", icon: "rocket" },
  { title: "Post-launch retro", date: "May 16", tone: "info", icon: "refresh" },
];

const WORKLOAD = [
  { label: "Lina Haddad", value: 92, display: "18 tasks" },
  { label: "Omar Nasser", value: 76, display: "14 tasks" },
  { label: "Yousef Khan", value: 64, display: "12 tasks" },
  { label: "Sara Al-Otaibi", value: 48, display: "9 tasks" },
  { label: "Maya Tarek", value: 31, display: "6 tasks" },
];

// The tone table, built from the console's ONE tone helper rather than being a
// ninth copy of the same hand-mixed rgba() values. See toneBg/toneFg in
// _components/ui: the tint composes from the semantic token, so it follows the
// design system and the theme instead of freezing the template's palette.
const TONE_NAMES = ["primary", "success", "warning", "info", "danger"];
const TONE_FG = Object.fromEntries(TONE_NAMES.map((t) => [t, toneInk(t)]));
const TONE_BG = Object.fromEntries(TONE_NAMES.map((t) => [t, toneBg(t)]));

export default function ProjectDashboard() {
  return (
    <>
      <PageHeader
        title="Project"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Dashboard" }, { label: "Project" }]}
        actions={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="plus" className="h-3.5 w-3.5" /> New project</button>}
      />

      <Row className="mb-6">
        <Col span={3}><StatCard label="Active projects" value="14" delta={2} deltaLabel="this quarter" icon="briefcase" tone="primary" /></Col>
        <Col span={3}><StatCard label="Tasks completed" value="1,284" delta={12.8} deltaLabel="vs last month" icon="check" tone="success" /></Col>
        <Col span={3}><StatCard label="Overdue tasks" value="27" delta={-14.2} deltaLabel="vs last month" icon="clock" tone="warning" /></Col>
        <Col span={3}><StatCard label="Team utilisation" value="78%" delta={3.4} deltaLabel="vs last month" icon="users" tone="info" /></Col>
      </Row>

      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead title="Burndown" sub="Remaining vs ideal, current release" />
            <CardBody>
              <ChartFrame
                height={280}
                labels={WEEKS}
                yLabels={["0", "80", "160", "240", "320"]}
                legend={[{ name: "Remaining", color: "var(--ad-chart-1)" }, { name: "Ideal", color: "var(--ad-chart-3)" }]}
              >
                <AreaChart
                  height={280}
                  showY={false}
                  labels={WEEKS}
                  dashed={[1]}
                  series={[
                    { name: "Remaining", data: [320, 298, 276, 248, 231, 204, 186, 158, 141, 112, 84, 48], color: "var(--ad-chart-1)" },
                    { name: "Ideal", data: [320, 293, 266, 240, 213, 186, 160, 133, 106, 80, 53, 26], color: "var(--ad-chart-3)" },
                  ]}
                />
              </ChartFrame>
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <div className="flex h-full flex-col gap-6">
            <Card>
              <CardHead title="Sprint Progress" />
              <CardBody className="flex flex-col items-center">
                <Radial value={68} size={140} color="var(--ad-chart-1)" sub="Sprint 24" />
                <p className="mt-4 text-center text-xs text-[var(--ad-muted-foreground)]">
                  184 of 271 story points delivered · 4 days remaining
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardHead title="Upcoming Milestones" />
              <CardBody>
                <ul className="space-y-4">
                  {MILESTONES.map((m) => (
                    <li key={m.title} className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: TONE_BG[m.tone], color: TONE_FG[m.tone] }}
                      >
                        <Icon name={m.icon} className="h-4 w-4" />
                      </span>
                      <span className="flex-1 text-sm font-500">{m.title}</span>
                      <span className="text-xs text-[var(--ad-muted-foreground)]">{m.date}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      <Row>
        <Col span={8}>
          <Card>
            <CardHead title="Projects" action={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm">View all</button>} />
            <Table head={["Project", "Team", "Progress", "Status", { label: "Due", align: "end" }]}>
              {PROJECTS.map((p) => (
                <tr key={p.name}>
                  <td>
                    <div className="min-w-0">
                      <p className="truncate font-500">{p.name}</p>
                      <p className="text-xs text-[var(--ad-muted-foreground)]">Lead · {p.lead}</p>
                    </div>
                  </td>
                  <td>
                    {/* An overlapping avatar stack. `space-x-*` is physical —
                        in Arabic the pile would still lean left while the row
                        reads right-to-left — so the overlap is a negative
                        LOGICAL margin on every avatar after the first. */}
                    <span className="flex [&>*+*]:-ms-2">
                      {p.team.map((t) => (
                        <Avatar key={t} name={t} size={28} className="ring-2 ring-[var(--ad-card)]" />
                      ))}
                    </span>
                  </td>
                  <td>
                    <div className="flex min-w-[130px] items-center gap-2">
                      <Progress value={p.progress} tone={p.tone} height={5} />
                      <span className="num w-9 shrink-0 text-xs text-[var(--ad-muted-foreground)]">{p.progress}%</span>
                    </div>
                  </td>
                  <td><Badge tone={p.tone}>{p.status}</Badge></td>
                  <td className="num whitespace-nowrap text-end text-[var(--ad-muted-foreground)]">{p.due}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Team Workload" sub="Capacity used this sprint" />
            <CardBody>
              <BarList items={WORKLOAD} />
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
