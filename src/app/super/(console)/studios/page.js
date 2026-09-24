import { PageHeader, Card, CardHead, Row, Col, Table } from "../../_components/ui";
import { readArr } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { listCollaboratorsMany } from "@/platform/auth/collaborators";
import { listUsers, getProfilesByIds } from "@/platform/auth/users";
import { withRequest } from "@/platform/http/observability";
import { loadCatalogues, planOf } from "@/lib/plans";
import StudiosTable from "@/components/super/StudiosTable";
import { listSubscriptions } from "@/lib/data/subscriptions";
import { seatLimit } from "@/shared/seats";
import { ladderDates, nextStep } from "@/shared/subscription";
// The pair that decides a public listing, asked through the shared predicate so
// the console and the public feed cannot disagree about what consent is.
import { hasConsented } from "@/shared/marketing/showcase";

export const dynamic = "force-dynamic";

// The subscription statuses in words. Kept here rather than imported from
// SubscriptionPanel: that is a client module, and a Server Component importing
// one gets a reference to it, not its object.
// What happens next, in words, for the billing watch.
const STEP_LABEL = {
  "free-period-ends": "Free period ends", closes: "Closes", "shuts-down": "Shuts down", deleted: "Deleted",
};

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
        // USED / LIMIT (24/09/2026): the seats this studio PAID for when its
        // subscription records them, else its package's ceiling — the same
        // rule the join door enforces (shared/seats).
        maxMembers: seatLimit(subs[i].subscription.seats, packages.find((p) => p.id === s.packageId)),
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

  // THE BILLING WATCH — every studio with something coming if nobody pays,
  // soonest first: a free period or paid period ending within 30 days, or any
  // studio already on the ladder. Beside each, the warnings its owner has been
  // sent (shared/subscription's noticesDue keys) and any upgrade it asked for,
  // so "did they know?" and "did they ask to pay?" are answered on one line.
  const watch = studios
    .map((s, i) => {
      const step = nextStep(subs[i].subscription, subs[i].today);
      if (!step) return null;
      const warned = subs[i].sentNotices
        .map((k) => k.split(":"))
        .filter(([, , on]) => on === ladderDates(subs[i].subscription).shutsDownOn || on === ladderDates(subs[i].subscription).deletedOn)
        .map(([kind, days]) => `${kind === "deletion" ? "deletion" : "shut-down"} ${days}d`);
      return {
        id: s.id, name: s.name || "Untitled", slug: s.slug || "",
        status: step.status, step: step.step, on: step.on, daysLeft: step.daysLeft,
        warned, upgradeRequested: Boolean(s.upgradeRequest),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysLeft - b.daysLeft);
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

      <Card className="mb-6">
        <CardHead title="Billing watch" sub={watch.length ? `${watch.length} studio${watch.length === 1 ? "" : "s"} with something coming, soonest first` : "Nothing coming: every studio is paid up, complimentary, or more than 30 days from its next date."} />
        {watch.length > 0 && (
          <Table head={["Studio", "Status", "Next", "On", { label: "Days", align: "end" }, "Warnings sent", "Upgrade asked"]}>
            {watch.map((w) => (
              <tr key={w.id}>
                <td className="font-500">{w.name}<span className="block text-xs text-[var(--ad-muted-foreground)]">/{w.slug}</span></td>
                <td>{SUB_LABEL[w.status] || w.status}</td>
                <td>{STEP_LABEL[w.step]}</td>
                <td className="whitespace-nowrap">{fmtDate(w.on)}</td>
                <td className={`text-end font-500 ${w.daysLeft <= 7 ? "text-[var(--ad-destructive-ink)]" : ""}`}>{w.daysLeft <= 0 ? "now" : w.daysLeft}</td>
                <td className="text-[var(--ad-muted-foreground)]">{w.warned.length ? w.warned.join(" · ") : "none yet"}</td>
                <td>{w.upgradeRequested ? "Yes" : ""}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

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
