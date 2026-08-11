import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Sample Page" };

export default function SamplePage() {
  return (
    <>
      <PageHeader
        title="Sample Page"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Other" }, { label: "Sample Page" }]}
        actions={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm">Primary action</button>}
      />

      <Row className="mb-6">
        <Col span={12}>
          <Card>
            <CardHead title="Starting point" sub="Copy this file when you add a new screen" />
            <CardBody className="space-y-4 text-sm leading-relaxed">
              <p>
                This is the blank canvas of the console. It carries the page header, the twelve-column grid and one
                card — everything a new screen needs and nothing it doesn't.
              </p>
              <p className="text-[var(--ad-muted-foreground)]">
                Every surface here resolves from the <code className="rounded px-1.5 py-0.5 text-[13px]" style={{ backgroundColor: "var(--ad-muted)" }}>--ad-*</code>{" "}
                tokens defined in <code className="rounded px-1.5 py-0.5 text-[13px]" style={{ backgroundColor: "var(--ad-muted)" }}>src/app/super/super.css</code>,
                so light and dark follow the main website automatically. Use{" "}
                <code className="rounded px-1.5 py-0.5 text-[13px]" style={{ backgroundColor: "var(--ad-muted)" }}>Row</code> and{" "}
                <code className="rounded px-1.5 py-0.5 text-[13px]" style={{ backgroundColor: "var(--ad-muted)" }}>Col</code> for layout and the shared
                primitives for everything else.
              </p>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="mb-6">
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Half-width card" />
            <CardBody className="text-sm text-[var(--ad-muted-foreground)]">
              Cards stretch to the row height when you add <code>h-full</code>, which keeps a row of unequal content
              visually aligned.
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="With an action" action={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm">Action</button>} />
            <CardBody className="text-sm text-[var(--ad-muted-foreground)]">
              The card header takes a title, an optional sub-label and any node in the action slot.
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="With a badge" action={<Badge tone="success">Active</Badge>} />
            <CardBody className="text-sm text-[var(--ad-muted-foreground)]">
              Badges come in six tones and a solid variant. They read correctly in both themes.
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col span={8}>
          <Card className="h-full">
            <CardHead title="Content block" />
            <CardBody>
              <ul className="space-y-4">
                {[
                  { icon: "layers", title: "Composable", body: "Card, CardHead and CardBody stack without extra wrappers." },
                  { icon: "globe", title: "Bidirectional", body: "Use logical properties (ps/pe, ms/me) so RTL mirrors for free." },
                  { icon: "zap", title: "Server-first", body: "Nothing here needs a client boundary unless it holds state." },
                ].map((f) => (
                  <li key={f.title} className="flex gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "rgba(70,128,255,.12)", color: "var(--ad-primary)" }}
                    >
                      <Icon name={f.icon} className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{f.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{f.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="h-full">
            <CardHead title="Sidebar block" />
            <CardBody className="space-y-3">
              <button type="button" className="ad-btn ad-btn-primary w-full">Primary</button>
              <button type="button" className="ad-btn ad-btn-outline w-full">Secondary</button>
              <button type="button" className="ad-btn ad-btn-ghost w-full">Tertiary</button>
              <div className="ad-divider my-2" />
              <p className="text-xs text-[var(--ad-muted-foreground)]">
                Buttons fill their container with <code>w-full</code>.
              </p>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
