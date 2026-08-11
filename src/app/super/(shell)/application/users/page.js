import {
  PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Avatar, StatCard, Table, Icon,
} from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import { CURRENT_USER } from "../../../_components/session";

export const metadata = { title: "Users" };

const USERS = [
  { name: CURRENT_USER.name, email: CURRENT_USER.email, role: "Super Admin", tone: "danger", studio: "— platform —", status: "Active", last: "Just now" },
  { name: "Lina Haddad", email: "lina@falcon.sa", role: "Admin", tone: "primary", studio: "Falcon Contracting", status: "Active", last: "12 min ago" },
  { name: "Omar Nasser", email: "omar@nourah.sa", role: "Finance Leader", tone: "info", studio: "Nourah Logistics", status: "Active", last: "1 hour ago" },
  { name: "Sara Al-Otaibi", email: "sara@almanar.sa", role: "Sales", tone: "success", studio: "Dar Almanar", status: "Active", last: "3 hours ago" },
  { name: "Yousef Khan", email: "yousef@tamweel.sa", role: "Technical Leader", tone: "info", studio: "Tamweel Group", status: "Suspended", last: "2 days ago" },
  { name: "Maya Tarek", email: "maya@riyadhtp.sa", role: "HR", tone: "warning", studio: "Riyadh Tech Park", status: "Invited", last: "Never" },
  { name: "Bilal Rahman", email: "bilal@falcon.sa", role: "Presales", tone: "success", studio: "Falcon Contracting", status: "Active", last: "5 hours ago" },
  { name: "Noor Al-Sayed", email: "noor@nourah.sa", role: "Viewer", tone: "muted", studio: "Nourah Logistics", status: "Active", last: "Yesterday" },
];

const STATUS_TONE = { Active: "success", Suspended: "danger", Invited: "warning" };

export default function UsersPage() {
  return (
    <>
      <PageHeader
        title="Users"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Users" }]}
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="download" className="h-3.5 w-3.5" /> Export</button>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="plus" className="h-3.5 w-3.5" /> Invite user</button>
          </>
        }
      />

      <Row className="mb-6">
        <Col span={3}><StatCard label="Total users" value="12,486" delta={5.2} deltaLabel="this month" icon="users" tone="primary" /></Col>
        <Col span={3}><StatCard label="Active this week" value="8,914" delta={3.8} deltaLabel="vs last week" icon="activity" tone="success" /></Col>
        <Col span={3}><StatCard label="Pending invites" value="164" icon="mail" tone="warning" /></Col>
        <Col span={3}><StatCard label="Suspended" value="38" delta={-11.4} deltaLabel="this month" icon="lock" tone="danger" /></Col>
      </Row>

      <Card>
        <CardHead
          title="All Users"
          sub="Every identity across every studio"
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ad-muted-foreground)] ltr:left-3 rtl:right-3" />
                <input className="ad-input w-56 ps-9" placeholder="Search users…" aria-label="Search users" />
              </div>
              <select className="ad-select w-36" aria-label="Filter by role" defaultValue="">
                <option value="">All roles</option>
                <option>Super Admin</option>
                <option>Admin</option>
                <option>Leader</option>
                <option>Viewer</option>
              </select>
            </div>
          }
        />
        <Table head={["User", "Role", "Studio", "Status", "Last active", { label: "", align: "end" }]}>
          {USERS.map((u) => (
            <tr key={u.email}>
              <td>
                <span className="inline-flex items-center gap-3">
                  <Avatar name={u.name} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{u.name}</span>
                    <span className="block truncate text-xs text-[var(--ad-muted-foreground)]">{u.email}</span>
                  </span>
                </span>
              </td>
              <td><Badge tone={u.tone}>{u.role}</Badge></td>
              <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{u.studio}</td>
              <td><Badge tone={STATUS_TONE[u.status]}>{u.status}</Badge></td>
              <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{u.last}</td>
              <td className="text-end">
                <button type="button" className="ad-icon-btn h-8 w-8" aria-label={`Actions for ${u.name}`}>
                  <Icon name="more" className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </Table>
        <CardBody className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <p className="text-xs text-[var(--ad-muted-foreground)]">Showing 8 of 12,486 users</p>
          <div className="flex items-center gap-1">
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm" disabled>Previous</button>
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                type="button"
                className={`ad-btn ad-btn-sm ${p === 1 ? "ad-btn-primary" : "ad-btn-outline"}`}
              >
                {p}
              </button>
            ))}
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm">Next</button>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
