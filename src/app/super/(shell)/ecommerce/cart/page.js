import Link from "next/link";
import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Cart" };

const ITEMS = [
  { name: "Wireless Headphones", sku: "AUD-2201", price: 75, qty: 2, from: "#4680ff", to: "#312e81", stock: "In stock" },
  { name: "Smart Watch Series 6", sku: "WCH-1180", price: 140, qty: 1, from: "#1abc9c", to: "#064e3b", stock: "Only 38 left" },
  { name: "USB-C Hub", sku: "HUB-5510", price: 40, qty: 3, from: "#3ebfea", to: "#0c4a6e", stock: "In stock" },
];

const SUGGESTED = [
  { name: "Portable SSD 2TB", price: "$180.00", from: "#dc2626", to: "#7f1d1d" },
  { name: "4K Webcam", price: "$70.00", from: "#7c4dff", to: "#312e81" },
  { name: "Desk Microphone", price: "$95.00", from: "#e91e63", to: "#831843" },
];

const subtotal = ITEMS.reduce((a, i) => a + i.price * i.qty, 0);
const shipping = 25;
const vat = subtotal * 0.15;
const total = subtotal + shipping + vat;
const money = (n) => `$${n.toFixed(2)}`;

export default function CartPage() {
  return (
    <>
      <PageHeader
        title="Cart"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "E-commerce" }, { label: "Cart" }]}
      />

      <Row>
        <Col span={8}>
          <div className="flex flex-col gap-6">
            <Card>
              <CardHead
                title={`Shopping Cart (${ITEMS.length} items)`}
                action={
                  <Link href={`${BASE}/ecommerce/products`} className="text-sm font-medium text-[var(--ad-primary)] hover:underline">
                    Continue shopping
                  </Link>
                }
              />
              <CardBody>
                <ul className="divide-y" style={{ borderColor: "var(--ad-border)" }}>
                  {ITEMS.map((it) => (
                    <li key={it.sku} className="flex flex-wrap items-center gap-4 py-5 first:pt-0 last:pb-0">
                      <span
                        className="h-20 w-20 shrink-0 rounded-lg"
                        style={{ backgroundImage: `linear-gradient(140deg, ${it.from}, ${it.to})` }}
                      />
                      <div className="min-w-[160px] flex-1">
                        <p className="font-medium">{it.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{it.sku}</p>
                        <p className="mt-1.5">
                          <Badge tone={it.stock === "In stock" ? "success" : "warning"}>{it.stock}</Badge>
                        </p>
                      </div>
                      <div className="inline-flex items-center rounded-md border" style={{ borderColor: "var(--ad-border)" }}>
                        <button type="button" className="px-3 py-1.5 text-[var(--ad-muted-foreground)] hover:text-[var(--ad-foreground)]" aria-label="Decrease quantity">
                          <Icon name="minus" className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-8 text-center text-sm font-medium">{it.qty}</span>
                        <button type="button" className="px-3 py-1.5 text-[var(--ad-muted-foreground)] hover:text-[var(--ad-foreground)]" aria-label="Increase quantity">
                          <Icon name="plus" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="w-24 text-end">
                        <p className="font-semibold">{money(it.price * it.qty)}</p>
                        <p className="text-xs text-[var(--ad-muted-foreground)]">{money(it.price)} each</p>
                      </div>
                      <button type="button" className="ad-icon-btn h-9 w-9 shrink-0" aria-label={`Remove ${it.name}`}>
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHead title="You might also like" />
              <CardBody>
                <div className="grid gap-4 sm:grid-cols-3">
                  {SUGGESTED.map((s) => (
                    <div key={s.name} className="rounded-xl border p-3" style={{ borderColor: "var(--ad-border)" }}>
                      <div className="aspect-[4/3] w-full rounded-lg" style={{ backgroundImage: `linear-gradient(140deg, ${s.from}, ${s.to})` }} />
                      <p className="mt-3 truncate text-sm font-medium">{s.name}</p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-sm font-semibold">{s.price}</span>
                        <button type="button" className="ad-btn ad-btn-outline ad-btn-sm">Add</button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </Col>

        <Col span={4}>
          <div className="flex flex-col gap-6">
            <Card>
              <CardHead title="Order Summary" />
              <CardBody>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[var(--ad-muted-foreground)]">Subtotal</dt>
                    <dd>{money(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--ad-muted-foreground)]">Shipping</dt>
                    <dd>{money(shipping)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--ad-muted-foreground)]">VAT (15%)</dt>
                    <dd>{money(vat)}</dd>
                  </div>
                  <div
                    className="flex justify-between border-t pt-3 text-base font-semibold"
                    style={{ borderColor: "var(--ad-border)" }}
                  >
                    <dt>Total</dt>
                    <dd>{money(total)}</dd>
                  </div>
                </dl>

                <div className="mt-5 flex gap-2">
                  <input className="ad-input" placeholder="Promo code" aria-label="Promo code" />
                  <button type="button" className="ad-btn ad-btn-outline shrink-0">Apply</button>
                </div>

                <button type="button" className="ad-btn ad-btn-primary mt-5 w-full">
                  Proceed to checkout <Icon name="arrowRight" className="h-4 w-4" />
                </button>

                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--ad-muted-foreground)]">
                  <Icon name="lock" className="h-3.5 w-3.5" /> Secure checkout
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Delivery" />
              <CardBody>
                <ul className="space-y-3">
                  {[
                    { label: "Standard", eta: "5–7 business days", price: "$25.00", checked: true },
                    { label: "Express", eta: "2–3 business days", price: "$60.00" },
                    { label: "Next day", eta: "Order before 14:00", price: "$120.00" },
                  ].map((d) => (
                    <li key={d.label}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-[var(--ad-accent)]" style={{ borderColor: "var(--ad-border)" }}>
                        <input type="radio" name="delivery" defaultChecked={d.checked} className="ad-check rounded-full" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{d.label}</span>
                          <span className="block text-xs text-[var(--ad-muted-foreground)]">{d.eta}</span>
                        </span>
                        <span className="shrink-0 text-sm font-medium">{d.price}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>
    </>
  );
}
