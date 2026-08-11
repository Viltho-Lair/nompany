import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge } from "../../../_components/ui";
import { AreaChart, ChartFrame, BarChart, BarList, Donut, Radial, Sparkline, PALETTE } from "../../../_components/charts";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Charts" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ChartsPage() {
  return (
    <>
      <PageHeader
        title="Charts"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Charts & Maps" }, { label: "Charts" }]}
        actions={<Badge tone="muted">Dependency-free SVG</Badge>}
      />

      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead title="Area Chart" sub="Smoothed multi-series with gradient fill" />
            <CardBody>
              <ChartFrame
                height={300}
                labels={MONTHS}
                yLabels={["0", "25", "50", "75", "100"]}
                legend={[
                  { name: "Series A", color: PALETTE[0] },
                  { name: "Series B", color: PALETTE[1] },
                  { name: "Series C", color: PALETTE[3] },
                ]}
              >
                <AreaChart
                  height={300}
                  showY={false}
                  labels={MONTHS}
                  series={[
                    { name: "Series A", data: [42, 55, 48, 63, 58, 74, 68, 82, 76, 91, 85, 97], color: PALETTE[0] },
                    { name: "Series B", data: [28, 36, 33, 45, 41, 52, 49, 58, 54, 66, 61, 72], color: PALETTE[1] },
                    { name: "Series C", data: [18, 22, 20, 28, 25, 33, 30, 38, 34, 43, 39, 47], color: PALETTE[3] },
                  ]}
                />
              </ChartFrame>
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Line Chart" sub="No fill, dashed comparison" />
            <CardBody>
              <ChartFrame height={300} labels={MONTHS} legend={[{ name: "Actual", color: PALETTE[0] }, { name: "Target", color: PALETTE[2] }]}>
                <AreaChart
                  height={300}
                  fill={false}
                  showY={false}
                  labels={MONTHS}
                  dashed={[1]}
                  series={[
                    { name: "Actual", data: [32, 41, 38, 52, 47, 61, 58, 69, 64, 76, 71, 80], color: PALETTE[0] },
                    { name: "Target", data: [35, 40, 45, 50, 55, 60, 62, 65, 68, 72, 75, 78], color: PALETTE[2] },
                  ]}
                />
              </ChartFrame>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-6">
        <Col span={6}>
          <Card className="h-full">
            <CardHead title="Grouped Bar Chart" />
            <CardBody>
              <BarChart
                height={280}
                labels={DAYS}
                series={[
                  { name: "This week", data: [24, 31, 28, 36, 33, 41, 38], color: PALETTE[0] },
                  { name: "Last week", data: [18, 26, 24, 29, 27, 34, 31], color: PALETTE[1] },
                ]}
              />
              <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-[var(--ad-muted-foreground)]">
                {DAYS.map((d) => <span key={d}>{d}</span>)}
              </div>
              <div className="mt-4 flex justify-center gap-5 text-xs text-[var(--ad-muted-foreground)]">
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PALETTE[0] }} />This week</span>
                <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PALETTE[1] }} />Last week</span>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="h-full">
            <CardHead title="Stacked Bar Chart" />
            <CardBody>
              <BarChart
                height={280}
                stacked
                labels={DAYS}
                series={[
                  { name: "Direct", data: [24, 31, 28, 36, 33, 41, 38], color: PALETTE[0] },
                  { name: "Search", data: [18, 22, 20, 27, 24, 30, 28], color: PALETTE[1] },
                  { name: "Social", data: [11, 14, 12, 17, 15, 21, 19], color: PALETTE[3] },
                ]}
              />
              <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-[var(--ad-muted-foreground)]">
                {DAYS.map((d) => <span key={d}>{d}</span>)}
              </div>
              <div className="mt-4 flex justify-center gap-5 text-xs text-[var(--ad-muted-foreground)]">
                {["Direct", "Search", "Social"].map((l, i) => (
                  <span key={l} className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PALETTE[i === 2 ? 3 : i] }} />
                    {l}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-6">
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Donut Chart" />
            <CardBody className="flex flex-col items-center">
              <Donut
                size={190}
                thickness={26}
                data={[
                  { label: "Electronics", value: 42 },
                  { label: "Accessories", value: 27 },
                  { label: "Home", value: 18 },
                  { label: "Apparel", value: 13 },
                ]}
                center={
                  <>
                    <span className="text-xl font-semibold">100%</span>
                    <span className="text-[11px] text-[var(--ad-muted-foreground)]">of sales</span>
                  </>
                }
              />
              <ul className="mt-6 w-full space-y-2.5 text-sm">
                {["Electronics", "Accessories", "Home", "Apparel"].map((l, i) => (
                  <li key={l} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-[var(--ad-muted-foreground)]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PALETTE[i] }} />
                      {l}
                    </span>
                    <span className="font-medium">{[42, 27, 18, 13][i]}%</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>

        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Radial Gauges" />
            <CardBody className="flex flex-wrap items-center justify-center gap-8">
              <Radial value={78} size={130} color={PALETTE[0]} sub="Sales" />
              <Radial value={92} size={130} color={PALETTE[1]} sub="Uptime" />
              <Radial value={46} size={130} color={PALETTE[2]} sub="Storage" />
              <Radial value={64} size={130} color={PALETTE[3]} sub="Adoption" />
            </CardBody>
          </Card>
        </Col>

        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Bar List" sub="Ranked horizontal meters" />
            <CardBody>
              <BarList
                items={[
                  { label: "Riyadh", value: 100, display: "24.5K" },
                  { label: "Jeddah", value: 74, display: "18.2K" },
                  { label: "Dubai", value: 52, display: "12.8K" },
                  { label: "Doha", value: 33, display: "8.1K" },
                  { label: "Kuwait City", value: 21, display: "5.2K" },
                ]}
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Card>
        <CardHead title="Sparklines" sub="Inline trends for table cells and stat tiles" />
        <CardBody>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Revenue", value: "$284,610", data: [42, 48, 45, 53, 51, 58, 62], color: PALETTE[0] },
              { label: "Sessions", value: "47,829", data: [38, 36, 39, 42, 46, 49, 54], color: PALETTE[1] },
              { label: "Churn", value: "1.8%", data: [26, 25, 27, 24, 22, 21, 18], color: PALETTE[2] },
              { label: "Latency", value: "124ms", data: [31, 34, 29, 33, 28, 26, 24], color: PALETTE[4] },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border p-4" style={{ borderColor: "var(--ad-border)" }}>
                <p className="text-xs uppercase tracking-wider text-[var(--ad-muted-foreground)]">{s.label}</p>
                <p className="mt-1 text-xl font-semibold">{s.value}</p>
                <div className="mt-3">
                  <Sparkline data={s.data} color={s.color} height={48} />
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
