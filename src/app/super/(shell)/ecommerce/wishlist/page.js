import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, StatCard, Icon, Empty } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Wishlist" };

const SAVED = [
  { name: "Portable SSD 2TB", sku: "STO-4402", price: "$180.00", was: "$210.00", stock: "Low stock", tone: "warning", added: "Mar 24", from: "#dc2626", to: "#7f1d1d" },
  { name: "Noise-Cancelling Earbuds", sku: "AUD-2290", price: "$120.00", stock: "In stock", tone: "success", added: "Mar 22", from: "#2ca87f", to: "#065f46" },
  { name: "Mechanical Keyboard", sku: "KEY-3390", price: "$75.00", stock: "Out of stock", tone: "danger", added: "Mar 19", from: "#e58a00", to: "#7c2d12" },
  { name: "Desk Microphone", sku: "MIC-6613", price: "$95.00", stock: "In stock", tone: "success", added: "Mar 15", from: "#e91e63", to: "#831843" },
  { name: "4K Webcam", sku: "CAM-7724", price: "$70.00", was: "$85.00", stock: "In stock", tone: "success", added: "Mar 11", from: "#7c4dff", to: "#312e81" },
  { name: "Smart Watch Series 6", sku: "WCH-1180", price: "$140.00", stock: "Low stock", tone: "warning", added: "Mar 04", from: "#1abc9c", to: "#064e3b" },
];

export default function WishlistPage() {
  return (
    <>
      <PageHeader
        title="Wishlist"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "E-commerce" }, { label: "Wishlist" }]}
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="link" className="h-3.5 w-3.5" /> Share list</button>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="cart" className="h-3.5 w-3.5" /> Add all to cart</button>
          </>
        }
      />

      <Row className="mb-6">
        <Col span={4}><StatCard label="Saved items" value="6" icon="heart" tone="danger" /></Col>
        <Col span={4}><StatCard label="Total value" value="$680.00" icon="wallet" tone="primary" /></Col>
        <Col span={4}><StatCard label="On sale now" value="2" icon="tag" tone="success" /></Col>
      </Row>

      <Row className="mb-6">
        {SAVED.map((s) => (
          <Col key={s.sku} span={4}>
            <Card className="overflow-hidden">
              <div className="relative">
                <div className="aspect-[16/10] w-full" style={{ backgroundImage: `linear-gradient(140deg, ${s.from}, ${s.to})` }} />
                <button
                  type="button"
                  className="absolute top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25 ltr:right-3 rtl:left-3"
                  aria-label={`Remove ${s.name} from wishlist`}
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
                {s.was ? (
                  <span className="absolute top-3 ltr:left-3 rtl:right-3">
                    <Badge tone="danger" solid>Sale</Badge>
                  </span>
                ) : null}
              </div>
              <CardBody full>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{s.sku} · added {s.added}</p>
                  </div>
                  <Badge tone={s.tone}>{s.stock}</Badge>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-lg font-semibold">{s.price}</span>
                  {s.was ? (
                    <span className="text-sm text-[var(--ad-muted-foreground)] line-through">{s.was}</span>
                  ) : null}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="ad-btn ad-btn-primary flex-1"
                    disabled={s.stock === "Out of stock"}
                  >
                    <Icon name="cart" className="h-4 w-4" />
                    {s.stock === "Out of stock" ? "Unavailable" : "Add to cart"}
                  </button>
                  <button type="button" className="ad-btn ad-btn-outline shrink-0" aria-label={`Preview ${s.name}`}>
                    <Icon name="eye" className="h-4 w-4" />
                  </button>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <CardHead title="Price Drop Alerts" sub="We'll notify you when a saved item goes on sale" />
        <Empty
          icon="bell"
          title="No alerts triggered yet"
          sub="Two items are already discounted. Turn on alerts and we'll tell you the moment another one drops."
          action={<button type="button" className="ad-btn ad-btn-primary">Enable price alerts</button>}
        />
      </Card>
    </>
  );
}
