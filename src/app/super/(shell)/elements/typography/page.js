import { PageHeader, Card, CardHead, CardBody, Row, Col } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Typography" };

const SCALE = [
  { tag: "h1", cls: "text-4xl font-bold", label: "Heading 1", spec: "2.25rem / 700" },
  { tag: "h2", cls: "text-3xl font-bold", label: "Heading 2", spec: "1.875rem / 700" },
  { tag: "h3", cls: "text-2xl font-semibold", label: "Heading 3", spec: "1.5rem / 600" },
  { tag: "h4", cls: "text-xl font-semibold", label: "Heading 4", spec: "1.25rem / 600" },
  { tag: "h5", cls: "text-lg font-semibold", label: "Heading 5", spec: "1.125rem / 600" },
  { tag: "h6", cls: "text-base font-semibold", label: "Heading 6", spec: "1rem / 600" },
];

const WEIGHTS = [
  { label: "Light", value: 300 },
  { label: "Regular", value: 400 },
  { label: "Medium", value: 500 },
  { label: "Semibold", value: 600 },
  { label: "Bold", value: 700 },
];

export default function TypographyPage() {
  return (
    <>
      <PageHeader
        title="Typography"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Elements" }, { label: "Typography" }]}
      />

      <Row className="mb-6">
        <Col span={7}>
          <Card className="h-full">
            <CardHead title="Type Scale" sub="Inter, the console's single family" />
            <CardBody>
              <ul className="space-y-6">
                {SCALE.map((s) => (
                  <li key={s.tag} className="flex flex-wrap items-baseline justify-between gap-3 border-b pb-5 last:border-0 last:pb-0" style={{ borderColor: "var(--ad-border)" }}>
                    <p className={s.cls}>{s.label}</p>
                    <span className="text-xs text-[var(--ad-muted-foreground)]">
                      &lt;{s.tag}&gt; · {s.spec}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>

        <Col span={5}>
          <div className="flex h-full flex-col gap-6">
            <Card>
              <CardHead title="Font Weights" />
              <CardBody>
                <ul className="space-y-4">
                  {WEIGHTS.map((w) => (
                    <li key={w.value} className="flex items-baseline justify-between gap-4">
                      <span className="text-lg" style={{ fontWeight: w.value }}>
                        The quick brown fox
                      </span>
                      <span className="shrink-0 text-xs text-[var(--ad-muted-foreground)]">
                        {w.label} · {w.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Text Colours" />
              <CardBody>
                <ul className="space-y-3 text-sm">
                  {[
                    { label: "Foreground", v: "var(--ad-foreground)" },
                    { label: "Muted foreground", v: "var(--ad-muted-foreground)" },
                    { label: "Primary", v: "var(--ad-primary)" },
                    { label: "Success", v: "var(--ad-success)" },
                    { label: "Warning", v: "var(--ad-warning)" },
                    { label: "Destructive", v: "var(--ad-destructive)" },
                  ].map((c) => (
                    <li key={c.label} className="flex items-center justify-between gap-4">
                      <span style={{ color: c.v }}>Sample text in {c.label.toLowerCase()}</span>
                      <code className="shrink-0 text-[11px] text-[var(--ad-muted-foreground)]">{c.v}</code>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      <Row>
        <Col span={7}>
          <Card className="h-full">
            <CardHead title="Body Copy" />
            <CardBody className="space-y-4">
              <p className="text-base leading-relaxed">
                A lead paragraph carries the opening idea of a page at 1rem with relaxed leading, so it reads
                comfortably even when the surrounding interface is dense.
              </p>
              <p className="text-sm leading-relaxed text-[var(--ad-muted-foreground)]">
                Regular body copy sits at 0.875rem — the console's default size. Supporting text uses the muted
                foreground token so it recedes without dropping below contrast requirements in either theme.
              </p>
              <blockquote
                className="border-s-4 ps-4 text-sm italic text-[var(--ad-muted-foreground)]"
                style={{ borderColor: "var(--ad-primary)" }}
              >
                Blockquotes take a primary-coloured rule on the leading edge, which mirrors correctly under RTL.
              </blockquote>
              <ul className="list-disc space-y-1.5 ps-5 text-sm">
                <li>Unordered lists inherit the body size.</li>
                <li>Nested content keeps the same rhythm.</li>
                <li>
                  Inline <code className="rounded px-1.5 py-0.5 text-[13px]" style={{ backgroundColor: "var(--ad-muted)" }}>code</code>{" "}
                  uses the muted surface.
                </li>
              </ul>
              <p className="text-xs text-[var(--ad-muted-foreground)]">
                Caption text at 0.75rem for table footnotes and metadata.
              </p>
            </CardBody>
          </Card>
        </Col>

        <Col span={5}>
          <Card className="h-full">
            <CardHead title="Utilities" />
            <CardBody>
              <ul className="space-y-3.5 text-sm">
                {[
                  { cls: "font-semibold", demo: "Semibold emphasis" },
                  { cls: "italic", demo: "Italic emphasis" },
                  { cls: "underline", demo: "Underlined text" },
                  { cls: "line-through", demo: "Struck-through text" },
                  { cls: "uppercase tracking-widest", demo: "Uppercase tracking" },
                  { cls: "truncate", demo: "A very long single line that will be truncated with an ellipsis when it runs out of room" },
                  { cls: "tabular-nums", demo: "1,284,900.00" },
                ].map((u) => (
                  <li key={u.cls} className="grid grid-cols-[1fr_auto] items-center gap-4">
                    <span className={`${u.cls} min-w-0`}>{u.demo}</span>
                    <code className="shrink-0 text-[11px] text-[var(--ad-muted-foreground)]">.{u.cls.split(" ")[0]}</code>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
