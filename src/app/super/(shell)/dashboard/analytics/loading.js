import { PageHeader, Row, Col, Card, CardHead, CardBody, Skeleton } from "../../../_components/ui";
import { ChartSkeleton } from "@/components/charts";
import { BASE } from "../../../_components/nav";

// The Analytics dashboard while the server reads the active-user counters.
//
// The page's own header and every CARD FRAME are known before the data is —
// titles, subtitles, the 8/4 column split — so they render immediately and only
// the contents are reserved. That is the difference between a skeleton and a
// blank page: the reader can already see which card is where, and the layout
// does not move when the numbers arrive.
//
// The four KPI tiles are reserved at their real height rather than as generic
// boxes. A KpiTile is a solid block with an 11×11 disc and three lines of text;
// anything shorter and the whole page below it jumps when they land.

function KpiTileSkeleton() {
  return (
    <div className="rounded-geex bg-[var(--ad-muted)] p-6">
      <div className="flex items-center gap-4">
        <span className="skel skel-circle block h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <Skeleton className="skel-text h-2.5 w-24" />
          <Skeleton className="mt-2 h-6 w-28 rounded-md" />
          <Skeleton className="skel-text mt-2.5 h-2 w-32" />
        </div>
      </div>
    </div>
  );
}

export default function LoadingAnalytics() {
  return (
    <div aria-busy="true">
      <PageHeader
        title="Analytics"
        breadcrumb={[
          { label: "Home", href: `${BASE}/dashboard/analytics` },
          { label: "Dashboard" },
          { label: "Analytics" },
        ]}
      />

      <Row className="mb-6" role="status" aria-label="Loading analytics">
        <span className="sr-only">Loading analytics…</span>
        {[0, 1, 2, 3].map((i) => (
          <Col key={i} span={3}>
            <KpiTileSkeleton />
          </Col>
        ))}
      </Row>

      <Row className="mb-6">
        <Col span={12}>
          <Card>
            <CardHead title="Exchange rates" sub="One USD table a day" />
            <CardBody>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i}>
                    <Skeleton className="skel-text h-2 w-12" />
                    <Skeleton className="mt-2 h-5 w-20 rounded-md" />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead title="Real-time Analytics" />
            <CardBody>
              <ChartSkeleton height={280} bars={12} yLabels={6} labels={12} />
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Device Analytics" sub="Share of sessions by device" />
            <CardBody>
              {/* A donut, then three legend rows — the shape DeviceAnalytics
                  renders. */}
              <div className="flex flex-col items-center">
                <Skeleton className="skel-circle h-[180px] w-[180px]" />
                <div className="mt-6 w-full space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <Skeleton className="skel-text h-2.5 w-24" />
                      <Skeleton className="skel-text h-2.5 w-10" />
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-6">
        <Col span={8}>
          <Card>
            <CardHead title="Global User Distribution" />
            <CardBody>
              <div className="grid gap-6 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-6 w-20 rounded-md" />
                    <Skeleton className="skel-text mt-2 h-2 w-16" />
                    <Skeleton className="mt-2.5 h-1.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <ChartSkeleton height={180} bars={12} yLabels={0} labels={12} />
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Satisfaction" />
            <CardBody>
              <div className="flex flex-col items-center py-4">
                <Skeleton className="skel-circle h-[120px] w-[120px]" />
                <Skeleton className="skel-text mt-5 h-2.5 w-32" />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
