import { PageHeader, Card, CardHead, Row, Col, Table } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import { readArr } from "@/lib/data/store";
import { REG } from "@/lib/data/keys";
import { listCollaborators } from "@/lib/data/collaborators";
import { getUserById, getProfile } from "@/lib/data/users";
import { loadCatalogues, planOf } from "@/lib/plans";
import StudiosTable from "@/components/super/StudiosTable";

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
  const [studios, { packages, tiers }] = await Promise.all([readArr(REG.studios), loadCatalogues()]);

  // Per studio: its members, and who owns it. Both are reads per row, which is
  // fine for a console listing tens of studios and is the line to revisit if it
  // ever lists thousands.
  const extra = await Promise.all(studios.map(async (s) => {
    const [members, owner, profile] = await Promise.all([
      listCollaborators(s.id).then((c) => c.length),
      getUserById(s.ownerUserId),
      getProfile(s.ownerUserId),
    ]);
    return { members, owner, profile };
  }));

  const rows = studios
    .map((s, i) => {
      const plan = planOf(s, packages, tiers);
      const { members, owner, profile } = extra[i];
      return {
        id: s.id,
        name: s.name || "Untitled",
        slug: s.slug || "",
        status: s.status || "active",
        members,
        ownerName: (profile?.fullName || "").trim() || (owner?.email || "").split("@")[0] || "",
        ownerEmail: owner?.email || "",
        ownerPhone: profile?.phone || "",
        createdAt: s.createdAt || "",
        created: fmtDate(s.createdAt),
        ...plan,
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  // "Plans are packages" — the breakdown groups by the package a studio is on,
  // not by the old free-text plan field.
  const groupBy = (key) => {
    const map = new Map();
    for (const r of rows) {
      const k = r[key] || "—";
      const cur = map.get(k) || { label: k, studios: 0, members: 0 };
      cur.studios += 1;
      cur.members += r.members;
      map.set(k, cur);
    }
    return [...map.values()].sort((a, b) => b.studios - a.studios);
  };
  const byPackage = groupBy("packageName");
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
            <CardHead title="Compact Table" sub="Studios by package" />
            <Table head={["Package", "Studios", { label: "Members", align: "end" }]}>
              {byPackage.length === 0 ? (
                <tr><td colSpan={3} className="text-[var(--ad-muted-foreground)]">No studios yet.</td></tr>
              ) : byPackage.map((r) => (
                <tr key={r.label}>
                  <td className="font-500">{r.label}</td>
                  <td className="text-[var(--ad-muted-foreground)]">{r.studios.toLocaleString()}</td>
                  <td className="text-end font-500">{r.members.toLocaleString()}</td>
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
                      <td className="font-500 capitalize">{r.label}</td>
                      <td className="text-[var(--ad-muted-foreground)]">{r.studios.toLocaleString()}</td>
                      <td className="text-end font-500">{r.members.toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* The totals are summed from the same rows above them, so the
                      footer can never disagree with the body. */}
                  <tr style={{ backgroundColor: "var(--ad-muted)" }}>
                    <td className="font-600">Total</td>
                    <td className="font-600">{rows.length.toLocaleString()}</td>
                    <td className="text-end font-600">{totalMembers.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Search, the row dialog and the plan edit are all client-side; the data
          above is resolved on the server so the first paint is already right. */}
      <StudiosTable
        rows={rows}
        packages={packages.map((p) => ({ id: p.id, name: p.name, color: p.color, maxEmployees: p.maxEmployees }))}
        tiers={tiers.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
      />
    </>
  );
}
