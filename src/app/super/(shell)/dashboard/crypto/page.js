import {
  PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Table, Icon, StatCard,
} from "../../../_components/ui";
import { AreaChart, ChartFrame, Donut, Sparkline } from "../../../_components/charts";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Crypto" };

const HOURS = ["00", "04", "08", "12", "16", "20", "24"];

const COINS = [
  { sym: "BTC", name: "Bitcoin", price: "$68,412.90", change: 3.42, cap: "$1.34T", spark: [58, 61, 59, 65, 63, 69, 72] },
  { sym: "ETH", name: "Ethereum", price: "$3,584.20", change: 2.18, cap: "$430.8B", spark: [41, 44, 42, 47, 46, 49, 52] },
  { sym: "SOL", name: "Solana", price: "$184.66", change: -1.84, cap: "$84.2B", spark: [36, 34, 37, 33, 31, 30, 28] },
  { sym: "ADA", name: "Cardano", price: "$0.6421", change: 5.96, cap: "$22.6B", spark: [18, 21, 20, 24, 26, 29, 33] },
  { sym: "XRP", name: "Ripple", price: "$0.5893", change: -0.72, cap: "$32.1B", spark: [26, 25, 27, 26, 24, 24, 23] },
];

const HOLDINGS = [
  { label: "Bitcoin", value: 46 },
  { label: "Ethereum", value: 28 },
  { label: "Solana", value: 14 },
  { label: "Stablecoins", value: 12 },
];

const TRADES = [
  { pair: "BTC/USDT", side: "Buy", amount: "0.482 BTC", price: "$67,940.00", total: "$32,747", time: "12:41" },
  { pair: "ETH/USDT", side: "Sell", amount: "6.20 ETH", price: "$3,601.10", total: "$22,327", time: "11:58" },
  { pair: "SOL/USDT", side: "Buy", amount: "128 SOL", price: "$183.20", total: "$23,450", time: "10:22" },
  { pair: "ADA/USDT", side: "Buy", amount: "18,400 ADA", price: "$0.6188", total: "$11,386", time: "09:15" },
  { pair: "BTC/USDT", side: "Sell", amount: "0.190 BTC", price: "$68,220.00", total: "$12,962", time: "08:47" },
];

export default function CryptoDashboard() {
  return (
    <>
      <PageHeader
        title="Crypto"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Dashboard" }, { label: "Crypto" }]}
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm">Deposit</button>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-sm">Trade</button>
          </>
        }
      />

      <Row className="mb-6">
        <Col span={3}><StatCard label="Portfolio value" value="$842,116" delta={6.4} deltaLabel="24h" icon="wallet" tone="primary" /></Col>
        <Col span={3}><StatCard label="24h P&L" value="+$50,742" delta={6.4} deltaLabel="24h" icon="trendUp" tone="success" /></Col>
        <Col span={3}><StatCard label="Open positions" value="12" icon="activity" tone="info" /></Col>
        <Col span={3}><StatCard label="Available balance" value="$118,904" delta={-2.1} deltaLabel="24h" icon="database" tone="warning" /></Col>
      </Row>

      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead
              title="BTC / USDT"
              sub="Last 24 hours"
              action={
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">$68,412.90</span>
                  <Badge tone="success">+3.42%</Badge>
                </div>
              }
            />
            <CardBody>
              <ChartFrame height={300} labels={HOURS} yLabels={["66k", "67k", "68k", "69k"]}>
                <AreaChart
                  height={300}
                  showY={false}
                  labels={HOURS}
                  series={[{ name: "Price", data: [66.4, 67.1, 66.8, 67.9, 68.2, 67.8, 68.4], color: "var(--ad-chart-1)" }]}
                />
              </ChartFrame>
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Holdings" sub="Allocation by asset" />
            <CardBody className="flex flex-col items-center">
              <Donut
                size={170}
                thickness={22}
                data={HOLDINGS}
                center={
                  <>
                    <span className="text-lg font-semibold">$842K</span>
                    <span className="text-[11px] text-[var(--ad-muted-foreground)]">total</span>
                  </>
                }
              />
              <ul className="mt-6 w-full space-y-3 text-sm">
                {HOLDINGS.map((h, i) => (
                  <li key={h.label} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-[var(--ad-muted-foreground)]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--ad-chart-${i + 1})` }} />
                      {h.label}
                    </span>
                    <span className="font-medium">{h.value}%</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col span={7}>
          <Card className="h-full">
            <CardHead title="Market Watch" action={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm">All markets</button>} />
            <Table head={["Asset", "Price", "24h", "Market cap", { label: "7d", align: "end" }]}>
              {COINS.map((c, i) => (
                <tr key={c.sym}>
                  <td>
                    <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: "var(--ad-muted)", color: `var(--ad-chart-${(i % 5) + 1})` }}
                      >
                        {c.sym}
                      </span>
                      <span>
                        <span className="block font-medium">{c.name}</span>
                        <span className="block text-xs text-[var(--ad-muted-foreground)]">{c.sym}</span>
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap font-medium">{c.price}</td>
                  <td>
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium"
                      style={{ color: c.change >= 0 ? "var(--ad-success)" : "var(--ad-destructive)" }}
                    >
                      <Icon name={c.change >= 0 ? "trendUp" : "trendDown"} className="h-3.5 w-3.5" />
                      {c.change > 0 ? "+" : ""}{c.change}%
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{c.cap}</td>
                  <td className="text-end">
                    <span className="inline-block w-24">
                      <Sparkline
                        data={c.spark}
                        height={32}
                        fill={false}
                        color={c.change >= 0 ? "var(--ad-success)" : "var(--ad-destructive)"}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>
        <Col span={5}>
          <Card className="h-full">
            <CardHead title="Recent Trades" action={<Badge tone="info">Live</Badge>} />
            <Table head={["Pair", "Side", "Amount", { label: "Total", align: "end" }]}>
              {TRADES.map((t, i) => (
                <tr key={`${t.pair}-${i}`}>
                  <td className="whitespace-nowrap font-medium">{t.pair}</td>
                  <td>
                    <Badge tone={t.side === "Buy" ? "success" : "danger"}>{t.side}</Badge>
                  </td>
                  <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{t.amount}</td>
                  <td className="whitespace-nowrap text-end">
                    <span className="block font-medium">{t.total}</span>
                    <span className="block text-xs text-[var(--ad-muted-foreground)]">{t.time}</span>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>
      </Row>
    </>
  );
}
