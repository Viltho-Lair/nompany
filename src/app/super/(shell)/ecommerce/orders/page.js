import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Avatar, StatCard, Table, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Orders" };

const ORDERS = [
  { id: "#ORD-7741", customer: "Hala Ibrahim", email: "hala@example.com", items: 3, total: "$248.00", payment: "Card", status: "Delivered", tone: "success", date: "Mar 28, 2026" },
  { id: "#ORD-7740", customer: "Faisal Al-Harbi", email: "faisal@example.com", items: 1, total: "$89.90", payment: "Card", status: "Shipped", tone: "info", date: "Mar 28, 2026" },
  { id: "#ORD-7739", customer: "Maya Tarek", email: "maya@example.com", items: 5, total: "$612.40", payment: "Bank transfer", status: "Processing", tone: "warning", date: "Mar 27, 2026" },
  { id: "#ORD-7738", customer: "Bilal Rahman", email: "bilal@example.com", items: 2, total: "$154.00", payment: "Card", status: "Cancelled", tone: "danger", date: "Mar 27, 2026" },
  { id: "#ORD-7737", customer: "Noor Al-Sayed", email: "noor@example.com", items: 4, total: "$398.20", payment: "Card", status: "Delivered", tone: "success", date: "Mar 26, 2026" },
  { id: "#ORD-7736", customer: "Omar Nasser", email: "omar@example.com", items: 1, total: "$180.00", payment: "Wallet", status: "Refunded", tone: "muted", date: "Mar 25, 2026" },
  { id: "#ORD-7735", customer: "Sara Al-Otaibi", email: "sara@example.com", items: 6, total: "$742.60", payment: "Card", status: "Delivered", tone: "success", date: "Mar 25, 2026" },
];

const TIMELINE = [
  { label: "Order placed", detail: "Mar 28, 2026 · 09:12", done: true },
  { label: "Payment confirmed", detail: "Mar 28, 2026 · 09:13", done: true },
  { label: "Packed", detail: "Mar 28, 2026 · 14:40", done: true },
  { label: "Shipped", detail: "Mar 29, 2026 · 08:05", done: true },
  { label: "Delivered", detail: "Mar 31, 2026 · 11:22", done: true },
];

const TABS = [
  { label: "All", count: 14738, active: true },
  { label: "Processing", count: 284 },
  { label: "Shipped", count: 612 },
  { label: "Delivered", count: 13486 },
  { label: "Cancelled", count: 218 },
  { label: "Refunded", count: 138 },
];

export default function OrdersPage() {
  return (
    <>
      <PageHeader
        title="Orders"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "E-commerce" }, { label: "Orders" }]}
        actions={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="download" className="h-3.5 w-3.5" /> Export orders</button>}
      />

      <Row className="mb-6">
        <Col span={3}><StatCard label="Total orders" value="14,738" delta={9.4} deltaLabel="this month" icon="cart" tone="primary" /></Col>
        <Col span={3}><StatCard label="Awaiting fulfilment" value="284" icon="clock" tone="warning" /></Col>
        <Col span={3}><StatCard label="Delivered" value="13,486" delta={11.2} deltaLabel="this month" icon="check" tone="success" /></Col>
        <Col span={3}><StatCard label="Refund rate" value="2.4%" delta={-0.6} deltaLabel="this month" invert icon="refresh" tone="danger" /></Col>
      </Row>

      <Row>
        <Col span={8}>
          <Card>
            <CardHead
              title="All Orders"
              action={
                <div className="relative">
                  <Icon name="search" className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ad-muted-foreground)] ltr:left-3 rtl:right-3" />
                  <input className="ad-input w-52 ps-9" placeholder="Search orders…" aria-label="Search orders" />
                </div>
              }
            />
            <div className="flex flex-wrap gap-1 border-b px-6 pb-3" style={{ borderColor: "var(--ad-border)" }}>
              {TABS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                  style={
                    t.active
                      ? { backgroundColor: "rgba(70,128,255,.12)", color: "var(--ad-primary)" }
                      : { color: "var(--ad-muted-foreground)" }
                  }
                >
                  {t.label} <span className="opacity-60">({t.count.toLocaleString()})</span>
                </button>
              ))}
            </div>
            <Table head={["Order", "Customer", "Items", "Total", "Payment", "Status", { label: "Date", align: "end" }]}>
              {ORDERS.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap font-medium text-[var(--ad-primary)]">{o.id}</td>
                  <td>
                    <span className="inline-flex items-center gap-2.5">
                      <Avatar name={o.customer} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{o.customer}</span>
                        <span className="block truncate text-xs text-[var(--ad-muted-foreground)]">{o.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>{o.items}</td>
                  <td className="whitespace-nowrap font-medium">{o.total}</td>
                  <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{o.payment}</td>
                  <td><Badge tone={o.tone}>{o.status}</Badge></td>
                  <td className="whitespace-nowrap text-end text-[var(--ad-muted-foreground)]">{o.date}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>

        <Col span={4}>
          <Card className="h-full">
            <CardHead
              title="#ORD-7741"
              sub="Hala Ibrahim · 3 items"
              action={<Badge tone="success">Delivered</Badge>}
            />
            <CardBody>
              <ol className="relative space-y-5 ps-6">
                <span
                  className="absolute top-2 h-[calc(100%-16px)] w-px ltr:left-[7px] rtl:right-[7px]"
                  style={{ backgroundColor: "var(--ad-border)" }}
                  aria-hidden="true"
                />
                {TIMELINE.map((t) => (
                  <li key={t.label} className="relative">
                    <span
                      className="absolute top-1 flex h-4 w-4 items-center justify-center rounded-full ltr:-left-6 rtl:-right-6"
                      style={{ backgroundColor: t.done ? "var(--ad-success)" : "var(--ad-muted)" }}
                    >
                      {t.done ? <Icon name="check" className="h-2.5 w-2.5 text-white" strokeWidth={3} /> : null}
                    </span>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{t.detail}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--ad-border)" }}>
                <p className="text-xs uppercase tracking-wider text-[var(--ad-muted-foreground)]">Shipping address</p>
                <p className="mt-1.5 text-sm">Hala Ibrahim</p>
                <p className="text-sm text-[var(--ad-muted-foreground)]">
                  Al Olaya District, King Fahd Rd<br />Riyadh 12214, Saudi Arabia
                </p>
              </div>

              <dl className="mt-5 space-y-2.5 border-t pt-5 text-sm" style={{ borderColor: "var(--ad-border)" }}>
                <div className="flex justify-between">
                  <dt className="text-[var(--ad-muted-foreground)]">Subtotal</dt>
                  <dd>$215.65</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--ad-muted-foreground)]">VAT (15%)</dt>
                  <dd>$32.35</dd>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <dt>Total</dt>
                  <dd>$248.00</dd>
                </div>
              </dl>

              <div className="mt-5 flex gap-2">
                <button type="button" className="ad-btn ad-btn-outline flex-1">Invoice</button>
                <button type="button" className="ad-btn ad-btn-primary flex-1">Track</button>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
