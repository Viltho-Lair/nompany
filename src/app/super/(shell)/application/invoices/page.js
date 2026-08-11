import {
  PageHeader, Card, CardHead, CardBody, Row, Col, Badge, StatCard, Table, Icon,
} from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Invoices" };

const INVOICES = [
  { id: "INV-2291", client: "Falcon Contracting", issued: "Mar 05", due: "Apr 04", amount: "$42,400.00", status: "Paid", tone: "success" },
  { id: "INV-2290", client: "Nourah Logistics", issued: "Mar 10", due: "Apr 09", amount: "$18,900.00", status: "Sent", tone: "info" },
  { id: "INV-2289", client: "Riyadh Tech Park", issued: "Mar 02", due: "Apr 01", amount: "$12,080.00", status: "Paid", tone: "success" },
  { id: "INV-2288", client: "Dar Almanar", issued: "Feb 28", due: "Mar 30", amount: "$67,250.00", status: "Overdue", tone: "danger" },
  { id: "INV-2287", client: "Tamweel Group", issued: "Mar 16", due: "Apr 15", amount: "$31,600.00", status: "Draft", tone: "muted" },
  { id: "INV-2286", client: "Falcon Contracting", issued: "Feb 12", due: "Mar 14", amount: "$28,900.00", status: "Paid", tone: "success" },
];

const LINES = [
  { desc: "Platform subscription — Enterprise (148 seats)", qty: 1, rate: "$28,400.00", total: "$28,400.00" },
  { desc: "Additional storage — 4 TB", qty: 4, rate: "$1,200.00", total: "$4,800.00" },
  { desc: "Implementation services", qty: 40, rate: "$180.00", total: "$7,200.00" },
  { desc: "Priority support — annual", qty: 1, rate: "$2,000.00", total: "$2,000.00" },
];

export default function InvoicesPage() {
  return (
    <>
      <PageHeader
        title="Invoices"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Invoices" }]}
        actions={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="plus" className="h-3.5 w-3.5" /> Create invoice</button>}
      />

      <Row className="mb-6">
        <Col span={3}><StatCard label="Total invoiced" value="$201,130" delta={7.9} deltaLabel="this month" icon="invoice" tone="primary" /></Col>
        <Col span={3}><StatCard label="Paid" value="$83,380" delta={12.4} deltaLabel="this month" icon="check" tone="success" /></Col>
        <Col span={3}><StatCard label="Outstanding" value="$50,500" icon="clock" tone="warning" /></Col>
        <Col span={3}><StatCard label="Overdue" value="$67,250" delta={4.1} deltaLabel="this month" icon="alert" tone="danger" /></Col>
      </Row>

      <Row>
        <Col span={7}>
          <Card className="h-full">
            <CardHead
              title="All Invoices"
              action={
                <select className="ad-select w-32" aria-label="Filter by status" defaultValue="">
                  <option value="">All statuses</option>
                  <option>Paid</option>
                  <option>Sent</option>
                  <option>Overdue</option>
                  <option>Draft</option>
                </select>
              }
            />
            <Table head={["Invoice", "Client", "Due", "Amount", { label: "Status", align: "end" }]}>
              {INVOICES.map((v) => (
                <tr key={v.id}>
                  <td className="whitespace-nowrap font-medium text-[var(--ad-primary)]">{v.id}</td>
                  <td className="whitespace-nowrap">{v.client}</td>
                  <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{v.due}</td>
                  <td className="whitespace-nowrap font-medium">{v.amount}</td>
                  <td className="text-end"><Badge tone={v.tone}>{v.status}</Badge></td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>

        <Col span={5}>
          <Card className="h-full">
            <CardHead
              title="INV-2291"
              sub="Falcon Contracting"
              action={
                <>
                  <button type="button" className="ad-icon-btn h-9 w-9" aria-label="Print"><Icon name="file" className="h-4 w-4" /></button>
                  <button type="button" className="ad-icon-btn h-9 w-9" aria-label="Download"><Icon name="download" className="h-4 w-4" /></button>
                </>
              }
            />
            <CardBody>
              <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--ad-muted-foreground)]">Billed to</p>
                  <p className="mt-1.5 font-medium">Falcon Contracting Co.</p>
                  <p className="text-[var(--ad-muted-foreground)]">King Fahd Rd, Riyadh 12271</p>
                  <p className="text-[var(--ad-muted-foreground)]">VAT 3102847719300003</p>
                </div>
                <div className="text-end">
                  <p className="text-xs uppercase tracking-wider text-[var(--ad-muted-foreground)]">Details</p>
                  <p className="mt-1.5">Issued <span className="font-medium">Mar 05, 2026</span></p>
                  <p>Due <span className="font-medium">Apr 04, 2026</span></p>
                  <div className="mt-2 flex justify-end"><Badge tone="success">Paid</Badge></div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Qty</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LINES.map((l) => (
                      <tr key={l.desc}>
                        <td>
                          <p className="font-medium">{l.desc}</p>
                          <p className="text-xs text-[var(--ad-muted-foreground)]">{l.rate} each</p>
                        </td>
                        <td>{l.qty}</td>
                        <td className="whitespace-nowrap text-end font-medium">{l.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="mt-6 space-y-2.5 border-t pt-5 text-sm" style={{ borderColor: "var(--ad-border)" }}>
                <div className="flex justify-between">
                  <dt className="text-[var(--ad-muted-foreground)]">Subtotal</dt>
                  <dd>$42,400.00</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--ad-muted-foreground)]">VAT (15%)</dt>
                  <dd>$6,360.00</dd>
                </div>
                <div className="flex justify-between border-t pt-2.5 text-base font-semibold" style={{ borderColor: "var(--ad-border)" }}>
                  <dt>Total</dt>
                  <dd>$48,760.00</dd>
                </div>
              </dl>

              <button type="button" className="ad-btn ad-btn-primary mt-6 w-full">
                <Icon name="send" className="h-4 w-4" /> Send to client
              </button>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
