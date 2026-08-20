import { PageHeader, Row, Col, StatCard, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import OrdersScreen from "./OrdersScreen";
import { ORDERS } from "./orders";

export const metadata = { title: "Orders" };

// The page is a server component that composes: header, four stat cards derived
// from the rows, and the interactive screen. Every count below is COMPUTED from
// the same array the table renders, so the tiles and the list cannot tell
// different stories — the template had "14,738 total orders" over a list of
// seven, which is the kind of detail that quietly teaches people not to trust
// the numbers on a dashboard.

const money = (n) => `$${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function OrdersPage() {
  const count = (status) => ORDERS.filter((o) => o.status === status).length;
  // Cancelled and refunded orders are excluded: "net" is the money the platform
  // kept, and counting a refund as revenue is the reason a dashboard and an
  // accountant ever disagree.
  const revenue = ORDERS.filter((o) => o.status !== "Cancelled" && o.status !== "Refunded")
    .reduce((n, o) => n + o.total, 0);

  return (
    <>
      <PageHeader
        title="Orders"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "E-commerce" }, { label: "Orders" }]}
        actions={
          <button type="button" className="ad-btn ad-btn-outline ad-btn-sm">
            <Icon name="download" className="h-3.5 w-3.5" /> Export orders
          </button>
        }
      />

      <Row className="mb-6">
        <Col span={3}>
          <StatCard label="Total orders" value={ORDERS.length.toLocaleString()} icon="cart" tone="primary" />
        </Col>
        <Col span={3}>
          <StatCard label="Awaiting fulfilment" value={count("Processing").toLocaleString()} icon="clock" tone="warning" />
        </Col>
        <Col span={3}>
          <StatCard label="Delivered" value={count("Delivered").toLocaleString()} icon="check" tone="success" />
        </Col>
        <Col span={3}>
          <StatCard label="Net revenue" value={money(revenue)} icon="wallet" tone="info" />
        </Col>
      </Row>

      <Row>
        <OrdersScreen orders={ORDERS} />
      </Row>
    </>
  );
}
