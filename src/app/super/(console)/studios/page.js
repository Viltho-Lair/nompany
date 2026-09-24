import { PageHeader, Card, CardHead, Row, Col, Table } from "../../_components/ui";
import { readArr } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { listCollaboratorsMany } from "@/platform/auth/collaborators";
import { listUsers, getProfilesByIds } from "@/platform/auth/users";
import { withRequest } from "@/platform/http/observability";
import { loadCatalogues, planOf } from "@/lib/plans";
import StudiosTable from "@/components/super/StudiosTable";
import { listSubscriptions } from "@/lib/data/subscriptions";
// The pair that decides a public listing, asked through the shared predicate so
// the console and the public feed cannot disagree about what consent is.
import { hasConsented } from "@/shared/marketing/showcase";

export const dynamic = "force-dynamic";

// The subscription statuses in words. Kept here rather than imported from
// SubscriptionPanel: that is a client module, and a Server Component importing
// one gets a reference to it, not its object.
const SUB_LABEL = {
  trial: "Standard free", active: "Active", complimentary: "Complimentary",
  due: "Payment due", closed: "Closed", cancelled: "Cancelled",
  shut_down: "Shut down", expired: "Due for deletion",
};
export const metadata = { title: "Studios" };

// Every studio on the platform, from the registry — real rows, not sample data.
//
// Two summaries first, in the shapes the tables page demonstrates: a COMPACT
// TABLE for the breakdown by plan and a TABLE WITH FOOTER TOTALS for status,
// which is the one that has to add up. The full list follows underneath.
//
// THREE BATCHED READS FOR THE WHOLE TABLE, not three per studio. Each row used
// to ask for its collaborator list, its owner and the owner's profile on its
// own — and the owner lookup (getUserById) reads the ENTIRE user registry, so a
// table of N studios read every user N times. The registry is read once now and
// indexed, and the lists and profiles are one statement each.
const fmtDate = (iso) => {
  const t = Date.parse(iso || "");
  return Number.isFinite(t) ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
};

// Inside withRequest, so a key two helpers both read is fetched once and the
// completion line reports this page's round trips.
export default async function StudiosPage() {
  return withRequest("super-studios", renderStudios);
}

async function renderStudios() {
  const [studios, { packages, tiers }, users] = await Promise.all([
    readArr(REG.studios), loadCatalogues(), listUsers(),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const [lists, profiles, subs] = await Promise.all([
    listCollaboratorsMany(studios.map((s) => s.id)),
    getProfilesByIds(studios.map((s) => String(s.ownerUserId || ""))),
    // ONE BATCHED READ for every studio's subscription, like the two beside it.
    listSubscriptions(studios.map((s) => s.id)),
  ]);
  const extra = studios.map((s, i) => ({
    members: lists[i].length,
    owner: userById.get(s.ownerUserId) || null,
    profile: s.ownerUserId ? profiles[i] : null,
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
        // THE FEATURED-COMPANIES PAIR. `featured` is ours to set here;
        // `hasConsented` is read-only in this console and belongs to the studio,
        // which gives or withdraws it in its own settings. The dialog shows both
        // so somebody flipping the switch can see WHY a studio is or is not on
        // the site, rather than checking the site to find out.
        featured: Boolean(s.featured),
        featuredOrder: Number(s.featuredOrder) || 0,
        hasConsented: hasConsented(s),
        ...plan,
        subStatus: subs[i].status,
        subKind: subs[i].subscription.kind,
        paidUntil: subs[i].subscription.paidUntil,
        paidUntilLabel: fmtDate(subs[i].subscription.paidUntil),
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
  // BY SUBSCRIPTION, not by the registry's own `status` field, which reads
  // "active" on every studio and so answered nothing.
  const byStatus = groupBy("subStatus");
  const totalMembers = rows.reduce((n, r) => n + r.members, 0);

  return (
    <>
      <PageHeader
        title="Studios"
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
            <CardHead title="Table with Footer Totals" sub="Studios by subscription" />
            <div className="w-full overflow-x-auto">
              <table className="ad-table">
                <thead>
                  <tr><th>Status</th><th>Studios</th><th className="text-end">Members</th></tr>
                </thead>
                <tbody>
                  {byStatus.map((r) => (
                    <tr key={r.label}>
                      <td className="font-500">{SUB_LABEL[r.label] || r.label}</td>
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
