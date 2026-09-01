import {
  PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Avatar, KpiTile, Table, Icon,
} from "../../../_components/ui";
import { AreaChart, ChartFrame, BarChart, Donut, BarList } from "@/components/charts";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "eCommerce" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ORDERS = [
  { id: "#ORD-7741", customer: "Hala Ibrahim", items: 3, total: "$248.00", status: "Delivered", tone: "success", date: "Mar 28" },
  { id: "#ORD-7740", customer: "Faisal Al-Harbi", items: 1, total: "$89.90", status: "Shipped", tone: "info", date: "Mar 28" },
  { id: "#ORD-7739", customer: "Maya Tarek", items: 5, total: "$612.40", status: "Processing", tone: "warning", date: "Mar 27" },
  { id: "#ORD-7738", customer: "Bilal Rahman", items: 2, total: "$154.00", status: "Cancelled", tone: "danger", date: "Mar 27" },
  { id: "#ORD-7737", customer: "Noor Al-Sayed", items: 4, total: "$398.20", status: "Delivered", tone: "success", date: "Mar 26" },
];

const PRODUCTS = [
  { name: "Wireless Headphones", sku: "AUD-2201", sold: 1284, revenue: "$96,300", stock: 142, trend: 18.4 },
  { name: "Smart Watch Series 6", sku: "WCH-1180", sold: 964, revenue: "$134,960", stock: 38, trend: 12.1 },
  { name: "Mechanical Keyboard", sku: "KEY-3390", sold: 812, revenue: "$60,900", stock: 0, trend: -4.6 },
  { name: "4K Webcam", sku: "CAM-7724", sold: 640, revenue: "$44,800", stock: 211, trend: 9.3 },
  { name: "USB-C Hub", sku: "HUB-5510", sold: 588, revenue: "$23,520", stock: 76, trend: 5.7 },
];

const CATEGORIES = [
  { label: "Electronics", value: 42 },
  { label: "Accessories", value: 27 },
  { label: "Home", value: 18 },
  { label: "Apparel", value: 13 },
];

const FUNNEL = [
  { label: "Visits", value: 100, display: "184,220", color: "var(--ad-chart-1)" },
  { label: "Product views", value: 61, display: "112,340", color: "var(--ad-chart-2)" },
  { label: "Added to cart", value: 24, display: "44,180", color: "var(--ad-chart-3)" },
  { label: "Checkout started", value: 14, display: "25,790", color: "var(--ad-chart-4)" },
  { label: "Purchased", value: 8, display: "14,738", color: "var(--ad-chart-5)" },
];

export default function EcommerceDashboard() {
  return (
    <>
      <PageHeader
        title="eCommerce"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Dashboard" }, { label: "eCommerce" }]}
        actions={
          <button type="button" className="ad-btn ad-btn-primary ad-btn-sm">
            <Icon name="download" className="h-3.5 w-3.5" /> Export report
          </button>
        }
      />

      <Row className="mb-6">
        <Col span={3}><KpiTile label="Gross Sales" value="$1,284,900" delta={16.2} deltaLabel="from last month" icon="wallet" tone="primary" /></Col>
        <Col span={3}><KpiTile label="Orders" value="14,738" delta={9.4} deltaLabel="from last month" icon="cart" tone="success" /></Col>
        <Col span={3}><KpiTile label="Avg. Order Value" value="$87.18" delta={-1.3} deltaLabel="from last month" icon="tag" tone="warning" /></Col>
        <Col span={3}><KpiTile label="Refund Rate" value="2.4%" delta={-0.6} deltaLabel="from last month" icon="refresh" tone="info" /></Col>
      </Row>

      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead
              title="Sales Overview"
              sub="Revenue and order volume"
              action={<Badge tone="success">+16.2% YoY</Badge>}
            />
            <CardBody>
              <ChartFrame
                height={280}
                labels={MONTHS}
                yLabels={["0", "30", "60", "90", "120"]}
                legend={[{ name: "Revenue", color: "var(--ad-chart-1)" }, { name: "Orders", color: "var(--ad-chart-3)" }]}
              >
                <AreaChart
                  height={280}
                  showY={false}
                  labels={MONTHS}
                  series={[
                    { name: "Revenue", data: [64, 72, 68, 86, 79, 98, 91, 110, 102, 118, 109, 120], color: "var(--ad-chart-1)" },
                    { name: "Orders", data: [38, 44, 40, 53, 48, 62, 57, 70, 64, 76, 70, 79], color: "var(--ad-chart-3)" },
                  ]}
                />
              </ChartFrame>
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Sales by Category" />
            <CardBody className="flex flex-col items-center">
              <Donut
                size={180}
                thickness={24}
                data={CATEGORIES}
                center={
                  <>
                    <span className="text-xl font-600">$1.28M</span>
                    <span className="text-[11px] text-[var(--ad-muted-foreground)]">total</span>
                  </>
                }
              />
              <ul className="mt-6 w-full space-y-2.5 text-sm">
                {CATEGORIES.map((c, i) => (
                  <li key={c.label} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-[var(--ad-muted-foreground)]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--ad-chart-${i + 1})` }} />
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
        <Col span={7}>
          <Card className="h-full">
            <CardHead title="Best Selling Products" action={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm">All products</button>} />
            <Table head={["Product", "Sold", "Revenue", "Stock", { label: "Trend", align: "end" }]}>
              {PRODUCTS.map((p) => (
                <tr key={p.sku}>
                  <td>
                    <div className="min-w-0">
                      <p className="truncate font-500">{p.name}</p>
                      <p className="text-xs text-[var(--ad-muted-foreground)]">{p.sku}</p>
                    </div>
                  </td>
                  <td className="num whitespace-nowrap">{p.sold.toLocaleString()}</td>
                  <td className="num whitespace-nowrap font-500">{p.revenue}</td>
                  <td>
                    {p.stock === 0 ? (
                      <Badge tone="danger">Out of stock</Badge>
                    ) : p.stock < 50 ? (
                      <Badge tone="warning">{p.stock} left</Badge>
                    ) : (
                      <span className="text-[var(--ad-muted-foreground)]">{p.stock}</span>
                    )}
                  </td>
                  <td className="text-end">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-500"
                      style={{ color: p.trend >= 0 ? "var(--ad-success)" : "var(--ad-destructive)" }}
                    >
                      <Icon name={p.trend >= 0 ? "trendUp" : "trendDown"} className="h-3.5 w-3.5" />
                      {p.trend > 0 ? "+" : ""}{p.trend}%
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>
        <Col span={5}>
          <Card className="h-full">
            <CardHead title="Conversion Funnel" sub="Last 30 days" />
            <CardBody>
              <BarList items={FUNNEL} />
              <div className="mt-6 rounded-lg p-4" style={{ backgroundColor: "var(--ad-muted)" }}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--ad-muted-foreground)]">Overall conversion</span>
                  <span className="text-lg font-600 text-[var(--ad-success)]">8.0%</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col span={8}>
          <Card>
            <CardHead
              title="Recent Orders"
              action={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm">View all orders</button>}
            />
            <Table head={["Order", "Customer", "Items", "Total", "Status", { label: "Date", align: "end" }]}>
              {ORDERS.map((o) => (
                <tr key={o.id}>
                  <td className="num whitespace-nowrap font-500 text-[var(--ad-primary)]">{o.id}</td>
                  <td>
                    <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
                      <Avatar name={o.customer} size={30} />
                      {o.customer}
                    </span>
                  </td>
                  <td className="num">{o.items}</td>
                  <td className="num whitespace-nowrap font-500">{o.total}</td>
                  <td><Badge tone={o.tone}>{o.status}</Badge></td>
                  <td className="num whitespace-nowrap text-end text-[var(--ad-muted-foreground)]">{o.date}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Traffic by Channel" sub="Sessions this week" />
            <CardBody>
              <BarChart
                height={220}
                labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                stacked
                series={[
                  { name: "Direct", data: [24, 31, 28, 36, 33, 41, 38], color: "var(--ad-chart-1)" },
                  { name: "Search", data: [18, 22, 20, 27, 24, 30, 28], color: "var(--ad-chart-2)" },
                  { name: "Social", data: [11, 14, 12, 17, 15, 21, 19], color: "var(--ad-chart-4)" },
                ]}
              />
              <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-[var(--ad-muted-foreground)]">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}
              </div>
              <div className="mt-5 space-y-3">
                {[
                  { label: "Direct", value: 44, color: "var(--ad-chart-1)" },
                  { label: "Search", value: 33, color: "var(--ad-chart-2)" },
                  { label: "Social", value: 23, color: "var(--ad-chart-4)" },
                ].map((c) => (
                  <div key={c.label} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 text-[var(--ad-muted-foreground)]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </span>
                    <span className="font-500">{c.value}%</span>
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
