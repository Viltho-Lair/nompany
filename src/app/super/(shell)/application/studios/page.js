import { PageHeader, Card, CardHead, CardBody, Row, Col, Table, Badge } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import { readArr } from "@/lib/data/store";
import { REG } from "@/lib/data/keys";
import { listCollaborators } from "@/lib/data/collaborators";

export const dynamic = "force-dynamic";
export const metadata = { title: "Studios" };

// Every studio on the platform, from the registry — real rows, not sample data.
//
// Two summaries first, in the shapes the tables page demonstrates: a COMPACT
// TABLE for the breakdown by plan and a TABLE WITH FOOTER TOTALS for status,
// which is the one that has to add up. The full list follows underneath.
//
// Member counts mean reading each studio's collaborator list, which is one read
// per studio. Fine for a console listing tens of studios; if it ever lists
// thousands, this is the line that needs a stored count instead.
const fmtDate = (iso) => {
  const t = Date.parse(iso || "");
  return Number.isFinite(t) ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
};

export default async function StudiosPage() {
  const studios = await readArr(REG.studios);
  const counts = await Promise.all(studios.map(async (s) => (await listCollaborators(s.id)).length));
  const rows = studios
    .map((s, i) => ({
      id: s.id,
      name: s.name || "Untitled",
      slug: s.slug || "",
      plan: s.plan || "free",
      status: s.status || "active",
      members: counts[i],
      createdAt: s.createdAt || "",
    }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const groupBy = (key) => {
    const map = new Map();
    for (const r of rows) {
      const k = r[key];
      const cur = map.get(k) || { label: k, studios: 0, members: 0 };
      cur.studios += 1;
      cur.members += r.members;
      map.set(k, cur);
    }
    return [...map.values()].sort((a, b) => b.studios - a.studios);
  };
  const byPlan = groupBy("plan");
  const byStatus = groupBy("status");
  const totalMembers = rows.reduce((n, r) => n + r.members, 0);

  return (
    <>
      <PageHeader
        title="Studios"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Studios" }]}
      />

      <Row className="mb-6">
        <Col span={6}>
          <Card className="h-full">
            <CardHead title="Compact Table" sub="Studios by plan" />
            <Table head={["Plan", "Studios", { label: "Members", align: "end" }]}>
              {byPlan.length === 0 ? (
                <tr><td colSpan={3} className="text-[var(--ad-muted-foreground)]">No studios yet.</td></tr>
              ) : byPlan.map((r) => (
                <tr key={r.label}>
                  <td className="font-medium capitalize">{r.label}</td>
                  <td className="text-[var(--ad-muted-foreground)]">{r.studios.toLocaleString()}</td>
                  <td className="text-end font-medium">{r.members.toLocaleString()}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="h-full">
            <CardHead title="Table with Footer Totals" sub="Studios by status" />
            <div className="w-full overflow-x-auto">
              <table className="ad-table">
                <thead>
                  <tr><th>Status</th><th>Studios</th><th className="text-end">Members</th></tr>
                </thead>
                <tbody>
                  {byStatus.map((r) => (
                    <tr key={r.label}>
                      <td className="font-medium capitalize">{r.label}</td>
                      <td className="text-[var(--ad-muted-foreground)]">{r.studios.toLocaleString()}</td>
                      <td className="text-end font-medium">{r.members.toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* The totals are summed from the same rows above them, so the
                      footer can never disagree with the body. */}
                  <tr style={{ backgroundColor: "var(--ad-muted)" }}>
                    <td className="font-semibold">Total</td>
                    <td className="font-semibold">{rows.length.toLocaleString()}</td>
                    <td className="text-end font-semibold">{totalMembers.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </Col>
      </Row>

      <Card>
        <CardHead title="All studios" sub={`${rows.length} registered`} />
        <CardBody full>
          <Table head={["Studio", "Address", "Plan", "Status", "Members", { label: "Created", align: "end" }]}>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="text-[var(--ad-muted-foreground)]">No studios yet.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className="font-medium">{r.name}</span>
                  <span className="block font-mono text-xs text-[var(--ad-muted-foreground)]">{r.id}</span>
                </td>
                <td className="font-mono text-xs">nompany.com/{r.slug}</td>
                <td className="capitalize">{r.plan}</td>
                <td><Badge tone={r.status === "active" ? "success" : "secondary"}>{r.status}</Badge></td>
                <td className="text-[var(--ad-muted-foreground)]">{r.members}</td>
                <td className="text-end whitespace-nowrap text-[var(--ad-muted-foreground)]">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
