import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Avatar, Progress, Table, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Data Tables" };

const STUDIOS = [
  { name: "Falcon Contracting", slug: "falcon", owner: "Lina Haddad", plan: "Enterprise", seats: 148, usage: 92, mrr: "$4,240", status: "Active", tone: "success", created: "Jan 12, 2025" },
  { name: "Nourah Logistics", slug: "nourah", owner: "Omar Nasser", plan: "Scale", seats: 62, usage: 74, mrr: "$1,860", status: "Active", tone: "success", created: "Mar 04, 2025" },
  { name: "Dar Almanar", slug: "almanar", owner: "Sara Al-Otaibi", plan: "Growth", seats: 24, usage: 48, mrr: "$720", status: "Past due", tone: "danger", created: "Jun 21, 2025" },
  { name: "Tamweel Group", slug: "tamweel", owner: "Yousef Khan", plan: "Scale", seats: 78, usage: 81, mrr: "$2,340", status: "Active", tone: "success", created: "Aug 08, 2025" },
  { name: "Riyadh Tech Park", slug: "riyadhtp", owner: "Maya Tarek", plan: "Starter", seats: 9, usage: 31, mrr: "$180", status: "Trialing", tone: "info", created: "Feb 18, 2026" },
  { name: "Bahr Marine", slug: "bahr", owner: "Bilal Rahman", plan: "Growth", seats: 31, usage: 63, mrr: "$930", status: "Active", tone: "success", created: "Nov 02, 2025" },
  { name: "Najd Foods", slug: "najd", owner: "Noor Al-Sayed", plan: "Growth", seats: 18, usage: 22, mrr: "$540", status: "Suspended", tone: "warning", created: "Sep 15, 2025" },
  { name: "Qasr Interiors", slug: "qasr", owner: "Hala Ibrahim", plan: "Starter", seats: 6, usage: 12, mrr: "$120", status: "Active", tone: "success", created: "Jan 30, 2026" },
];

const COLUMNS = ["Studio", "Owner", "Plan", "Seats", "Usage", "MRR", "Status", "Created"];

export default function DataTablesPage() {
  return (
    <>
      <PageHeader
        title="Data Tables"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Tables" }, { label: "Data Tables" }]}
        actions={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="download" className="h-3.5 w-3.5" /> Export CSV</button>}
      />

      <Card className="mb-6">
        <CardHead
          title="Studios"
          sub="Sortable, filterable, paginated"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ad-muted-foreground)] ltr:left-3 rtl:right-3" />
                <input className="ad-input w-52 ps-9" placeholder="Search studios…" aria-label="Search studios" />
              </div>
              <select className="ad-select w-32" aria-label="Filter by plan" defaultValue="">
                <option value="">All plans</option>
                <option>Starter</option>
                <option>Growth</option>
                <option>Scale</option>
                <option>Enterprise</option>
              </select>
              <button type="button" className="ad-btn ad-btn-outline ad-btn-sm">
                <Icon name="filter" className="h-3.5 w-3.5" /> Filters
              </button>
            </div>
          }
        />

        <div className="w-full overflow-x-auto">
          <table className="ad-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" className="ad-check" aria-label="Select all rows" />
                </th>
                {COLUMNS.map((c, i) => (
                  <th key={c} className={i >= 6 ? "text-end" : undefined}>
                    <span className="inline-flex cursor-pointer items-center gap-1 hover:text-[var(--ad-foreground)]">
                      {c}
                      <Icon name={i === 5 ? "chevronDown" : "chevronUp"} className="h-3 w-3 opacity-40" />
                    </span>
                  </th>
                ))}
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {STUDIOS.map((s) => (
                <tr key={s.slug}>
                  <td>
                    <input type="checkbox" className="ad-check" aria-label={`Select ${s.name}`} />
                  </td>
                  <td>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="text-xs text-[var(--ad-muted-foreground)]">/{s.slug}</p>
                    </div>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
                      <Avatar name={s.owner} size={30} />
                      <span className="text-[var(--ad-muted-foreground)]">{s.owner}</span>
                    </span>
                  </td>
                  <td><Badge tone="primary">{s.plan}</Badge></td>
                  <td>{s.seats}</td>
                  <td>
                    <div className="flex min-w-[110px] items-center gap-2">
                      <Progress value={s.usage} tone={s.usage >= 80 ? "warning" : "primary"} height={5} />
                      <span className="w-8 shrink-0 text-xs text-[var(--ad-muted-foreground)]">{s.usage}%</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-end font-medium">{s.mrr}</td>
                  <td className="text-end"><Badge tone={s.tone}>{s.status}</Badge></td>
                  <td className="whitespace-nowrap text-end text-[var(--ad-muted-foreground)]">{s.created}</td>
                  <td className="text-end">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="ad-icon-btn h-8 w-8" aria-label={`View ${s.name}`}><Icon name="eye" className="h-3.5 w-3.5" /></button>
                      <button type="button" className="ad-icon-btn h-8 w-8" aria-label={`Edit ${s.name}`}><Icon name="edit" className="h-3.5 w-3.5" /></button>
                      <button type="button" className="ad-icon-btn h-8 w-8" aria-label={`More for ${s.name}`}><Icon name="more" className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CardBody className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2 text-xs text-[var(--ad-muted-foreground)]">
            <span>Rows per page</span>
            <select className="ad-select w-16 py-1" aria-label="Rows per page" defaultValue="10">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
            <span className="ms-2">1–8 of 4,746</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="ad-icon-btn h-8 w-8" aria-label="First page" disabled><Icon name="chevronLeft" className="h-4 w-4" /></button>
            {[1, 2, 3, 4].map((n) => (
              <button key={n} type="button" className={`ad-btn ad-btn-sm ${n === 1 ? "ad-btn-primary" : "ad-btn-ghost"}`}>{n}</button>
            ))}
            <span className="px-1 text-xs text-[var(--ad-muted-foreground)]">…</span>
            <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm">594</button>
            <button type="button" className="ad-icon-btn h-8 w-8" aria-label="Next page"><Icon name="chevronRight" className="h-4 w-4" /></button>
          </div>
        </CardBody>
      </Card>

      <Row>
        <Col span={6}>
          <Card className="h-full">
            <CardHead title="Compact Table" sub="Dense rows for reference data" />
            <Table head={["Code", "Region", "Studios", { label: "MRR", align: "end" }]}>
              {[
                { c: "SA-RUH", r: "Riyadh", s: 1842, m: "$118,400" },
                { c: "SA-JED", r: "Jeddah", s: 964, m: "$61,200" },
                { c: "AE-DXB", r: "Dubai", s: 712, m: "$48,900" },
                { c: "QA-DOH", r: "Doha", s: 388, m: "$24,600" },
                { c: "KW-KWI", r: "Kuwait City", s: 241, m: "$15,100" },
              ].map((r) => (
                <tr key={r.c}>
                  <td className="font-mono text-xs">{r.c}</td>
                  <td className="font-medium">{r.r}</td>
                  <td className="text-[var(--ad-muted-foreground)]">{r.s.toLocaleString()}</td>
                  <td className="text-end font-medium">{r.m}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="h-full">
            <CardHead title="Table with Footer Totals" />
            <div className="w-full overflow-x-auto">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Studios</th>
                    <th className="text-end">MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { p: "Starter", s: 2184, m: 43680 },
                    { p: "Growth", s: 1566, m: 46980 },
                    { p: "Scale", s: 712, m: 106800 },
                    { p: "Enterprise", s: 284, m: 87150 },
                  ].map((r) => (
                    <tr key={r.p}>
                      <td className="font-medium">{r.p}</td>
                      <td className="text-[var(--ad-muted-foreground)]">{r.s.toLocaleString()}</td>
                      <td className="text-end font-medium">${r.m.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: "var(--ad-muted)" }}>
                    <td className="font-semibold">Total</td>
                    <td className="font-semibold">4,746</td>
                    <td className="text-end font-semibold">$284,610</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );
}
