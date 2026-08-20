import {
  PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Progress, StatCard, Table, Icon,
} from "../../../_components/ui";
import { AreaChart, ChartFrame, BarChart, BarList, Donut } from "../../../_components/charts";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Marketing" };

const WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"];

const CAMPAIGNS = [
  { name: "Q2 brand awareness", channel: "Paid social", spend: "$48,200", leads: 1284, cpl: "$37.54", roas: "4.2x", status: "Running", tone: "success" },
  { name: "ERP comparison guide", channel: "Content", spend: "$12,600", leads: 682, cpl: "$18.48", roas: "6.8x", status: "Running", tone: "success" },
  { name: "Riyadh expo retargeting", channel: "Display", spend: "$21,400", leads: 318, cpl: "$67.30", roas: "1.6x", status: "Paused", tone: "warning" },
  { name: "Arabic launch push", channel: "Search", spend: "$34,900", leads: 941, cpl: "$37.09", roas: "3.9x", status: "Running", tone: "success" },
  { name: "Partner co-marketing", channel: "Email", spend: "$6,800", leads: 204, cpl: "$33.33", roas: "2.4x", status: "Ended", tone: "muted" },
];

const CHANNELS = [
  { label: "Organic search", value: 31 },
  { label: "Paid social", value: 24 },
  { label: "Direct", value: 19 },
  { label: "Referral", value: 15 },
  { label: "Email", value: 11 },
];

const CONTENT = [
  { label: "ERP buyer's guide", value: 100, display: "18.4K views" },
  { label: "Pricing page", value: 74, display: "13.6K views" },
  { label: "Case study — Falcon", value: 52, display: "9.6K views" },
  { label: "Feature tour video", value: 41, display: "7.5K views" },
  { label: "Arabic onboarding docs", value: 28, display: "5.2K views" },
];

export default function MarketingDashboard() {
  return (
    <>
      <PageHeader
        title="Marketing"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Dashboard" }, { label: "Marketing" }]}
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="download" className="h-3.5 w-3.5" /> Export</button>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="plus" className="h-3.5 w-3.5" /> New campaign</button>
          </>
        }
      />

      <Row className="mb-6">
        <Col span={3}><StatCard label="Marketing spend" value="$123,900" delta={8.4} deltaLabel="vs last quarter" icon="wallet" tone="primary" /></Col>
        <Col span={3}><StatCard label="Leads generated" value="3,429" delta={21.6} deltaLabel="vs last quarter" icon="users" tone="success" /></Col>
        <Col span={3}><StatCard label="Cost per lead" value="$36.13" delta={-9.2} deltaLabel="vs last quarter" invert icon="target" tone="info" /></Col>
        <Col span={3}><StatCard label="Blended ROAS" value="4.1x" delta={12.8} deltaLabel="vs last quarter" icon="trendUp" tone="warning" /></Col>
      </Row>

      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead title="Traffic & Conversions" sub="Last 12 weeks" />
            <CardBody>
              <ChartFrame
                height={280}
                labels={WEEKS}
                yLabels={["0", "15", "30", "45", "60"]}
                legend={[
                  { name: "Sessions (K)", color: "var(--ad-chart-1)" },
                  { name: "Leads (×10)", color: "var(--ad-chart-2)" },
                ]}
              >
                <AreaChart
                  height={280}
                  showY={false}
                  labels={WEEKS}
                  series={[
                    { name: "Sessions (K)", data: [32, 36, 34, 41, 39, 46, 43, 51, 48, 55, 52, 58], color: "var(--ad-chart-1)" },
                    { name: "Leads (×10)", data: [18, 21, 19, 24, 22, 27, 25, 30, 28, 33, 31, 35], color: "var(--ad-chart-2)" },
                  ]}
                />
              </ChartFrame>
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Traffic by Channel" />
            <CardBody className="flex flex-col items-center">
              <Donut
                size={170}
                thickness={22}
                data={CHANNELS}
                center={
                  <>
                    <span className="text-lg font-600">548K</span>
                    <span className="text-[11px] text-[var(--ad-muted-foreground)]">sessions</span>
                  </>
                }
              />
              <ul className="mt-6 w-full space-y-2.5 text-sm">
                {CHANNELS.map((c, i) => (
                  <li key={c.label} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-[var(--ad-muted-foreground)]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--ad-chart-${(i % 5) + 1})` }} />
                      {c.label}
                    </span>
                    <span className="font-500">{c.value}%</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-6">
        <Col span={12}>
          <Card>
            <CardHead title="Campaign Performance" action={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm">All campaigns</button>} />
            <Table head={["Campaign", "Channel", "Spend", "Leads", "CPL", "ROAS", { label: "Status", align: "end" }]}>
              {CAMPAIGNS.map((c) => (
                <tr key={c.name}>
                  <td className="whitespace-nowrap font-500">{c.name}</td>
                  <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{c.channel}</td>
                  <td className="ad-num whitespace-nowrap">{c.spend}</td>
                  <td className="ad-num">{c.leads.toLocaleString()}</td>
                  <td className="ad-num whitespace-nowrap">{c.cpl}</td>
                  <td className="ad-num whitespace-nowrap font-500 text-[var(--ad-success)]">{c.roas}</td>
                  <td className="text-end"><Badge tone={c.tone}>{c.status}</Badge></td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col span={5}>
          <Card className="h-full">
            <CardHead title="Top Content" sub="Views this quarter" />
            <CardBody>
              <BarList items={CONTENT} />
            </CardBody>
          </Card>
        </Col>
        <Col span={7}>
          <Card className="h-full">
            <CardHead title="Spend vs Attributed Revenue" sub="By channel, this quarter" />
            <CardBody>
              <BarChart
                height={240}
                labels={["Search", "Social", "Content", "Display", "Email", "Events"]}
                series={[
                  { name: "Spend", data: [34.9, 48.2, 12.6, 21.4, 6.8, 18.2], color: "var(--ad-chart-3)" },
                  { name: "Revenue", data: [136, 202, 86, 34, 16, 41], color: "var(--ad-chart-1)" },
                ]}
              />
              <div className="mt-2 grid grid-cols-6 text-center text-[11px] text-[var(--ad-muted-foreground)]">
                {["Search", "Social", "Content", "Display", "Email", "Events"].map((d) => <span key={d}>{d}</span>)}
              </div>
              <div className="mt-4 flex justify-center gap-5 text-xs text-[var(--ad-muted-foreground)]">
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--ad-chart-3)" }} />Spend ($K)</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--ad-chart-1)" }} />Revenue ($K)</span>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  { label: "Email deliverability", value: 97, tone: "success" },
                  { label: "Landing page score", value: 84, tone: "primary" },
                  { label: "Brand search share", value: 46, tone: "warning" },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-[var(--ad-muted-foreground)]">{m.label}</span>
                      <span className="font-500">{m.value}%</span>
                    </div>
                    <Progress value={m.value} tone={m.tone} />
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
