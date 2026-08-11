import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, StatCard, Table, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Products" };

const PRODUCTS = [
  { name: "Wireless Headphones", sku: "AUD-2201", cat: "Audio", price: "$75.00", stock: 142, sold: 1284, status: "Active", tone: "success", from: "#4680ff", to: "#312e81" },
  { name: "Smart Watch Series 6", sku: "WCH-1180", cat: "Wearables", price: "$140.00", stock: 38, sold: 964, status: "Low stock", tone: "warning", from: "#1abc9c", to: "#064e3b" },
  { name: "Mechanical Keyboard", sku: "KEY-3390", cat: "Peripherals", price: "$75.00", stock: 0, sold: 812, status: "Out of stock", tone: "danger", from: "#e58a00", to: "#7c2d12" },
  { name: "4K Webcam", sku: "CAM-7724", cat: "Peripherals", price: "$70.00", stock: 211, sold: 640, status: "Active", tone: "success", from: "#7c4dff", to: "#312e81" },
  { name: "USB-C Hub", sku: "HUB-5510", cat: "Accessories", price: "$40.00", stock: 76, sold: 588, status: "Active", tone: "success", from: "#3ebfea", to: "#0c4a6e" },
  { name: "Portable SSD 2TB", sku: "STO-4402", cat: "Storage", price: "$180.00", stock: 24, sold: 412, status: "Low stock", tone: "warning", from: "#dc2626", to: "#7f1d1d" },
  { name: "Noise-Cancelling Earbuds", sku: "AUD-2290", cat: "Audio", price: "$120.00", stock: 168, sold: 396, status: "Active", tone: "success", from: "#2ca87f", to: "#065f46" },
  { name: "Desk Microphone", sku: "MIC-6613", cat: "Audio", price: "$95.00", stock: 52, sold: 284, status: "Draft", tone: "muted", from: "#e91e63", to: "#831843" },
];

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Products"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "E-commerce" }, { label: "Products" }]}
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="upload" className="h-3.5 w-3.5" /> Import</button>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="plus" className="h-3.5 w-3.5" /> Add product</button>
          </>
        }
      />

      <Row className="mb-6">
        <Col span={3}><StatCard label="Total products" value="248" delta={4.6} deltaLabel="this month" icon="package" tone="primary" /></Col>
        <Col span={3}><StatCard label="Units sold" value="14,738" delta={9.4} deltaLabel="this month" icon="cart" tone="success" /></Col>
        <Col span={3}><StatCard label="Low stock" value="12" icon="alert" tone="warning" /></Col>
        <Col span={3}><StatCard label="Out of stock" value="3" delta={-25} deltaLabel="this month" invert icon="x" tone="danger" /></Col>
      </Row>

      <Row className="mb-6">
        {PRODUCTS.slice(0, 4).map((p) => (
          <Col key={p.sku} span={3}>
            <Card className="overflow-hidden">
              <div className="aspect-[4/3] w-full" style={{ backgroundImage: `linear-gradient(140deg, ${p.from}, ${p.to})` }} />
              <CardBody full className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{p.cat} · {p.sku}</p>
                  </div>
                  <Badge tone={p.tone}>{p.status}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-base font-semibold">{p.price}</span>
                  <span className="text-xs text-[var(--ad-muted-foreground)]">{p.sold.toLocaleString()} sold</span>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <CardHead
          title="All Products"
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ad-muted-foreground)] ltr:left-3 rtl:right-3" />
                <input className="ad-input w-52 ps-9" placeholder="Search products…" aria-label="Search products" />
              </div>
              <select className="ad-select w-36" aria-label="Filter by category" defaultValue="">
                <option value="">All categories</option>
                <option>Audio</option>
                <option>Wearables</option>
                <option>Peripherals</option>
                <option>Storage</option>
                <option>Accessories</option>
              </select>
            </div>
          }
        />
        <Table head={["Product", "Category", "Price", "Stock", "Sold", "Status", { label: "", align: "end" }]}>
          {PRODUCTS.map((p) => (
            <tr key={p.sku}>
              <td>
                <span className="inline-flex items-center gap-3">
                  <span
                    className="h-10 w-10 shrink-0 rounded-lg"
                    style={{ backgroundImage: `linear-gradient(140deg, ${p.from}, ${p.to})` }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block text-xs text-[var(--ad-muted-foreground)]">{p.sku}</span>
                  </span>
                </span>
              </td>
              <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{p.cat}</td>
              <td className="whitespace-nowrap font-medium">{p.price}</td>
              <td>{p.stock}</td>
              <td>{p.sold.toLocaleString()}</td>
              <td><Badge tone={p.tone}>{p.status}</Badge></td>
              <td className="text-end">
                <div className="flex justify-end gap-1">
                  <button type="button" className="ad-icon-btn h-8 w-8" aria-label={`Edit ${p.name}`}><Icon name="edit" className="h-3.5 w-3.5" /></button>
                  <button type="button" className="ad-icon-btn h-8 w-8" aria-label={`Delete ${p.name}`}><Icon name="trash" className="h-3.5 w-3.5" /></button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <p className="text-xs text-[var(--ad-muted-foreground)]">Showing 8 of 248 products</p>
          <div className="flex items-center gap-1">
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm" disabled>Previous</button>
            {[1, 2, 3].map((n) => (
              <button key={n} type="button" className={`ad-btn ad-btn-sm ${n === 1 ? "ad-btn-primary" : "ad-btn-outline"}`}>{n}</button>
            ))}
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm">Next</button>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
