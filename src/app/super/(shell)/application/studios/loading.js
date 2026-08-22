import { PageHeader, Row, Col, Card, CardHead, Skeleton } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import SuperDataGridSkeleton from "@/components/super/SuperDataGrid.skeleton";
import { STUDIOS_COLUMNS, STUDIOS_PAGE_SIZE } from "@/components/super/studiosColumns";

// The Studios screen while the registry, every studio's collaborator list and
// the plan catalogues are being read — the slowest page in the console, and the
// one that most needed a placeholder shaped like its answer.
//
// The two summary cards above the grid are reserved as well. Reserving only the
// grid would have let the cards drop in above it and push the whole table down
// the moment they arrived, which is the exact shift a skeleton exists to
// prevent.

// A summary table is three-ish rows of two columns plus a totals row. Same
// heights as `.ad-table`: 0.75rem either side of the head, 0.875rem of a row.
function SummaryCardSkeleton({ title, sub, rows = 4 }) {
  return (
    <Card className="h-full overflow-hidden">
      <CardHead title={title} sub={sub} />
      <div className="grid items-center gap-4 border-b border-[var(--ad-border)] px-6" style={{ gridTemplateColumns: "1fr 80px 100px", height: 40 }}>
        <Skeleton className="skel-text h-2 w-16 opacity-70" />
        <Skeleton className="skel-text h-2 w-12 opacity-70" />
        <Skeleton className="skel-text h-2 w-12 justify-self-end opacity-70" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="grid items-center gap-4 px-6"
          style={{
            gridTemplateColumns: "1fr 80px 100px",
            height: 46,
            borderBottom: i === rows - 1 ? "none" : "1px solid var(--ad-border)",
          }}
        >
          <Skeleton className="skel-text h-2.5 w-24" />
          <Skeleton className="skel-text h-2.5 w-8" />
          <Skeleton className="skel-text h-2.5 w-10 justify-self-end" />
        </div>
      ))}
    </Card>
  );
}

export default function LoadingStudios() {
  return (
    // `aria-busy` marks the region as still settling; the ONE live region that
    // actually announces is the grid skeleton at the bottom. Two `role="status"`
    // nodes on one screen means the same wait is read out twice.
    <div aria-busy="true">
      <PageHeader
        title="Studios"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Studios" }]}
      />

      <Row className="mb-6">
        <Col span={6}>
          <SummaryCardSkeleton title="Compact Table" sub="Studios by package" />
        </Col>
        <Col span={6}>
          <SummaryCardSkeleton title="Table with Footer Totals" sub="Studios by status" />
        </Col>
      </Row>

      <SuperDataGridSkeleton columns={STUDIOS_COLUMNS} rows={STUDIOS_PAGE_SIZE} actions={1} label="Loading studios" />
    </div>
  );
}
