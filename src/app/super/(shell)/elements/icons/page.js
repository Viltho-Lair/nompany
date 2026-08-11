import { PageHeader, Card, CardHead, CardBody, Row, Col, Icon } from "../../../_components/ui";
import { iconNames } from "../../../_components/Icon";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Icons" };

const SIZES = [
  { label: "14", cls: "h-3.5 w-3.5" },
  { label: "16", cls: "h-4 w-4" },
  { label: "18", cls: "h-[18px] w-[18px]" },
  { label: "20", cls: "h-5 w-5" },
  { label: "24", cls: "h-6 w-6" },
  { label: "32", cls: "h-8 w-8" },
];

const TONES = [
  { label: "Foreground", v: "var(--ad-foreground)" },
  { label: "Muted", v: "var(--ad-muted-foreground)" },
  { label: "Primary", v: "var(--ad-primary)" },
  { label: "Success", v: "var(--ad-success)" },
  { label: "Warning", v: "var(--ad-warning)" },
  { label: "Destructive", v: "var(--ad-destructive)" },
];

export default function IconsPage() {
  return (
    <>
      <PageHeader
        title="Icons"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Elements" }, { label: "Icons" }]}
      />

      <Row className="mb-6">
        <Col span={6}>
          <Card className="h-full">
            <CardHead title="Sizes" sub="Stroked on a 24 grid; scale by class" />
            <CardBody className="flex flex-wrap items-end gap-8">
              {SIZES.map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-2">
                  <Icon name="rocket" className={s.cls} />
                  <span className="text-[11px] text-[var(--ad-muted-foreground)]">{s.label}px</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="h-full">
            <CardHead title="Colour" sub="Icons inherit currentColor" />
            <CardBody className="flex flex-wrap items-end gap-8">
              {TONES.map((t) => (
                <div key={t.label} className="flex flex-col items-center gap-2" style={{ color: t.v }}>
                  <Icon name="shield" className="h-6 w-6" />
                  <span className="text-[11px]">{t.label}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Card>
        <CardHead
          title="Icon Library"
          sub={`${iconNames.length} icons available to the console`}
          action={
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ad-muted-foreground)] ltr:left-3 rtl:right-3" />
              <input className="ad-input w-52 ps-9" placeholder="Search icons…" aria-label="Search icons" />
            </div>
          }
        />
        <CardBody>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
            {iconNames.map((n) => (
              <button
                key={n}
                type="button"
                title={n}
                className="flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-[var(--ad-accent)]"
                style={{ borderColor: "var(--ad-border)" }}
              >
                <Icon name={n} className="h-5 w-5" />
                <span className="w-full truncate text-center text-[10px] text-[var(--ad-muted-foreground)]">{n}</span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
