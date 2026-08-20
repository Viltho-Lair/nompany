import { PageHeader, Row, Col, StatCardSkeleton } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import SuperDataGridSkeleton from "@/components/super/SuperDataGrid.skeleton";
import { USERS_COLUMNS, USERS_PAGE_SIZE } from "./columns";

// The Users screen while the registry is being read.
//
// It renders the SAME PageHeader as the page — the title and breadcrumb are
// known before the data is, so there is no reason to make them arrive with it —
// then four stat-card placeholders and a grid placeholder built from the page's
// own column definitions. What lands next occupies these exact boxes.
//
// There is no spinner here on purpose. A spinner says "something is happening";
// a skeleton says "a table of ten users, six columns wide, is happening", which
// is the difference between waiting and knowing what you are waiting for.

export default function LoadingUsers() {
  return (
    <>
      <PageHeader
        title="Users"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Users" }]}
      />

      <Row className="mb-6">
        {[0, 1, 2, 3].map((i) => (
          <Col key={i} span={3}>
            <StatCardSkeleton />
          </Col>
        ))}
      </Row>

      <SuperDataGridSkeleton columns={USERS_COLUMNS} rows={USERS_PAGE_SIZE} label="Loading users" />
    </>
  );
}
