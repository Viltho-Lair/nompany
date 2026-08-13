import { PageHeader, Row, Col, StatCard } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import UsersTable from "./UsersTable";
import { listUsersForConsole } from "@/lib/data/users";
import { listSuperAdminEmails } from "@/lib/superAuth";
import {
  statusOf, compareUsers, lastAround, STATUS, SUPER_ROLE, MEMBER_ROLE, ACTIVE_WINDOW_DAYS,
} from "@/lib/platformRoles";

export const metadata = { title: "Users" };

// Real identities from the user registry — every row here is a person who can
// sign in. The list is assembled and SORTED on the server: search, role filter
// and paging are the only things the client decides, so the order the owner
// sees never depends on when the page happened to hydrate.
//
// Status and the "last active" label are computed here too, against one server
// clock. Computing them in the browser would let two viewers disagree about who
// is active, and would mismatch the server markup on hydration.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function lastActiveLabel(t, now) {
  if (!Number.isFinite(t)) return "Never";
  const ago = now - t;
  if (ago < 2 * MINUTE) return "Just now";
  if (ago < HOUR) return `${Math.floor(ago / MINUTE)} min ago`;
  if (ago < DAY) { const h = Math.floor(ago / HOUR); return `${h} hour${h === 1 ? "" : "s"} ago`; }
  const d = Math.floor(ago / DAY);
  if (d === 1) return "Yesterday";
  if (d < 30) return `${d} days ago`;
  const m = Math.floor(d / 30);
  return `${m} month${m === 1 ? "" : "s"} ago`;
}

export default async function UsersPage() {
  const [users, owners] = await Promise.all([listUsersForConsole(), listSuperAdminEmails()]);
  const now = Date.now();

  const rows = users
    .map((u) => {
      // A super admin is a separate owner record that happens to share this
      // address; the label is derived from that, never stored on the user.
      const isSuper = owners.has(String(u.email).toLowerCase());
      return {
        id: u.id,
        name: u.fullName.trim() || u.email.split("@")[0],
        email: u.email,
        role: isSuper ? SUPER_ROLE : u.platformRole || MEMBER_ROLE,
        roleLocked: isSuper,
        status: statusOf(u, now),
        studios: u.studios,
        lastActive: lastActiveLabel(lastAround(u), now),
      };
    })
    .sort(compareUsers);

  const count = (s) => rows.filter((r) => r.status === s).length;

  return (
    <>
      <PageHeader
        title="Users"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Users" }]}
      />

      <Row className="mb-6">
        <Col span={3}><StatCard label="Total users" value={rows.length.toLocaleString()} icon="users" tone="primary" /></Col>
        <Col span={3}><StatCard label={`Active (${ACTIVE_WINDOW_DAYS} days)`} value={count(STATUS.active).toLocaleString()} icon="activity" tone="success" /></Col>
        <Col span={3}><StatCard label="Invited" value={count(STATUS.invited).toLocaleString()} icon="mail" tone="warning" /></Col>
        <Col span={3}><StatCard label="Suspended" value={count(STATUS.suspended).toLocaleString()} icon="lock" tone="danger" /></Col>
      </Row>

      <UsersTable rows={rows} />
    </>
  );
}
