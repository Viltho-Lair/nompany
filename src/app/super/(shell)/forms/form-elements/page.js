import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Form Elements" };

export default function FormElementsPage() {
  return (
    <>
      <PageHeader
        title="Form Elements"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Forms" }, { label: "Form Elements" }]}
      />

      <Row className="mb-6">
        <Col span={6}>
          <Card className="h-full">
            <CardHead title="Text Inputs" />
            <CardBody className="space-y-5">
              <div>
                <label className="ad-label" htmlFor="fe-name">Full name</label>
                <input id="fe-name" className="ad-input" placeholder="Abdullah Abu Hammed" />
              </div>
              <div>
                <label className="ad-label" htmlFor="fe-email">Email</label>
                <input id="fe-email" type="email" className="ad-input" placeholder="you@example.com" />
                <p className="mt-1.5 text-xs text-[var(--ad-muted-foreground)]">We'll never share this address.</p>
              </div>
              <div>
                <label className="ad-label" htmlFor="fe-amount">With prefix</label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-[var(--ad-muted-foreground)] ltr:left-3 rtl:right-3">$</span>
                  <input id="fe-amount" className="ad-input ps-7" placeholder="0.00" inputMode="decimal" />
                </div>
              </div>
              <div>
                <label className="ad-label" htmlFor="fe-error">Invalid state</label>
                <input
                  id="fe-error"
                  className="ad-input"
                  defaultValue="not-an-email"
                  style={{ borderColor: "var(--ad-destructive)" }}
                  aria-invalid="true"
                />
                <p className="mt-1.5 text-xs" style={{ color: "var(--ad-destructive)" }}>Enter a valid email address.</p>
              </div>
              <div>
                <label className="ad-label" htmlFor="fe-disabled">Disabled</label>
                <input id="fe-disabled" className="ad-input" defaultValue="Read only" disabled />
              </div>
              <div>
                <label className="ad-label" htmlFor="fe-textarea">Textarea</label>
                <textarea id="fe-textarea" className="ad-textarea" rows={4} placeholder="Write something…" />
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col span={6}>
          <div className="flex h-full flex-col gap-6">
            <Card>
              <CardHead title="Selects" />
              <CardBody className="space-y-5">
                <div>
                  <label className="ad-label" htmlFor="fe-plan">Plan</label>
                  <select id="fe-plan" className="ad-select" defaultValue="Scale">
                    <option>Starter</option>
                    <option>Growth</option>
                    <option>Scale</option>
                    <option>Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="ad-label" htmlFor="fe-modules">Modules (multiple)</label>
                  <select id="fe-modules" className="ad-select" multiple size={4} defaultValue={["Projects", "Finance"]}>
                    <option>Projects</option>
                    <option>Finance</option>
                    <option>HR</option>
                    <option>Inventory</option>
                    <option>Technical</option>
                  </select>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Choices" />
              <CardBody className="space-y-6">
                <fieldset>
                  <legend className="ad-label">Checkboxes</legend>
                  <div className="space-y-2.5">
                    {["Email notifications", "Push notifications", "Weekly digest"].map((c, i) => (
                      <label key={c} className="flex cursor-pointer items-center gap-2.5 text-sm">
                        <input type="checkbox" className="ad-check" defaultChecked={i < 2} />
                        {c}
                      </label>
                    ))}
                    <label className="flex cursor-not-allowed items-center gap-2.5 text-sm opacity-60">
                      <input type="checkbox" className="ad-check" disabled />
                      Disabled option
                    </label>
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="ad-label">Radio group</legend>
                  <div className="space-y-2.5">
                    {["Monthly billing", "Annual billing (save 20%)", "Custom terms"].map((r, i) => (
                      <label key={r} className="flex cursor-pointer items-center gap-2.5 text-sm">
                        <input type="radio" name="billing" className="ad-check rounded-full" defaultChecked={i === 1} />
                        {r}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label className="ad-label" htmlFor="fe-range">Seat allowance — 148</label>
                  <input id="fe-range" type="range" min={1} max={300} defaultValue={148} className="w-full accent-[var(--ad-primary)]" />
                </div>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>

      <Row>
        <Col span={6}>
          <Card className="h-full">
            <CardHead title="Date & Time" />
            <CardBody className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="ad-label" htmlFor="fe-date">Date</label>
                <input id="fe-date" type="date" className="ad-input" defaultValue="2026-04-08" />
              </div>
              <div>
                <label className="ad-label" htmlFor="fe-time">Time</label>
                <input id="fe-time" type="time" className="ad-input" defaultValue="09:30" />
              </div>
              <div>
                <label className="ad-label" htmlFor="fe-month">Month</label>
                <input id="fe-month" type="month" className="ad-input" defaultValue="2026-04" />
              </div>
              <div>
                <label className="ad-label" htmlFor="fe-color">Colour</label>
                <input id="fe-color" type="color" className="ad-input h-[38px] p-1" defaultValue="#4680ff" />
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="h-full">
            <CardHead title="File Upload" />
            <CardBody className="space-y-5">
              <label
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors hover:bg-[var(--ad-accent)]"
                style={{ borderColor: "var(--ad-border)" }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "var(--ad-muted)" }}>
                  <Icon name="upload" className="h-5 w-5 text-[var(--ad-primary)]" />
                </span>
                <span className="mt-3 text-sm font-medium">Drop files here or click to browse</span>
                <span className="mt-1 text-xs text-[var(--ad-muted-foreground)]">PDF, PNG or JPG · up to 25 MB</span>
                <input type="file" className="sr-only" />
              </label>

              <ul className="space-y-2.5">
                {[
                  { name: "enterprise-agreement.pdf", size: "2.4 MB", tone: "success" },
                  { name: "logo-pack.zip", size: "42 MB", tone: "danger" },
                ].map((f) => (
                  <li
                    key={f.name}
                    className="flex items-center gap-3 rounded-lg border p-3"
                    style={{ borderColor: "var(--ad-border)" }}
                  >
                    <Icon name="file" className="h-4 w-4 shrink-0 text-[var(--ad-muted-foreground)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.name}</span>
                      <span className="block text-xs text-[var(--ad-muted-foreground)]">{f.size}</span>
                    </span>
                    <Badge tone={f.tone}>{f.tone === "success" ? "Uploaded" : "Too large"}</Badge>
                    <button type="button" className="ad-icon-btn h-8 w-8 shrink-0" aria-label={`Remove ${f.name}`}>
                      <Icon name="x" className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex justify-end gap-2 border-t pt-5" style={{ borderColor: "var(--ad-border)" }}>
                <button type="button" className="ad-btn ad-btn-outline">Cancel</button>
                <button type="button" className="ad-btn ad-btn-primary">Save changes</button>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
