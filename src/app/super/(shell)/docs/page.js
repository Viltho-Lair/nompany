import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Icon, toneBg, toneInk } from "../../_components/ui";
import { BASE } from "../../_components/nav";

export const metadata = { title: "Documentation" };

const SECTIONS = [
  {
    title: "Getting started",
    icon: "rocket",
    tone: "primary",
    links: ["What the console is for", "Signing in", "Roles and access", "Keyboard shortcuts"],
  },
  {
    title: "Design system",
    icon: "palette",
    tone: "info",
    links: ["Colour tokens", "Typography", "Components", "Icons", "Charts"],
  },
  {
    title: "Studios",
    icon: "briefcase",
    tone: "success",
    links: ["Creating a studio", "Plans and seats", "Modules", "Suspending a studio"],
  },
  {
    title: "Billing",
    icon: "wallet",
    tone: "warning",
    links: ["Invoices", "Payment methods", "Refunds", "Tax and VAT"],
  },
  {
    title: "Security",
    icon: "shield",
    tone: "danger",
    links: ["Two-factor authentication", "Session management", "API keys", "Audit log"],
  },
  {
    title: "Platform",
    icon: "server",
    tone: "primary",
    links: ["Environments", "Deployments", "Status page", "Incident response"],
  },
];

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Open the command palette" },
  { keys: ["G", "D"], label: "Go to dashboards" },
  { keys: ["G", "S"], label: "Go to settings" },
  { keys: ["["], label: "Collapse the sidebar" },
  { keys: ["?"], label: "Show this list" },
];

// The tone table, built from the console's ONE tone helper rather than being a
// ninth copy of the same hand-mixed rgba() values. See toneBg/toneFg in
// _components/ui: the tint composes from the semantic token, so it follows the
// design system and the theme instead of freezing the template's palette.
const TONE_NAMES = ["primary", "success", "warning", "info", "danger"];
const TONE_FG = Object.fromEntries(TONE_NAMES.map((t) => [t, toneInk(t)]));
const TONE_BG = Object.fromEntries(TONE_NAMES.map((t) => [t, toneBg(t)]));

export default function DocsPage() {
  return (
    <>
      <PageHeader
        title="Documentation"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Support" }, { label: "Documentation" }]}
        actions={<button type="button" className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="link" className="h-3.5 w-3.5" /> Open changelog</button>}
      />

      <Card className="mb-6">
        <CardBody full className="py-10 text-center">
          <h2 className="text-2xl font-600">How can we help?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--ad-muted-foreground)]">
            Everything about running the platform — the console itself, studios, billing and security.
          </p>
          <div className="relative mx-auto mt-6 max-w-md">
            <Icon name="search" className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ad-muted-foreground)] start-4" />
            <input className="ad-input py-3 ps-11" placeholder="Search the documentation…" aria-label="Search documentation" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--ad-muted-foreground)]">
            <span>Popular:</span>
            {["Invite a super admin", "Suspend a studio", "Rotate an API key", "Refund an invoice"].map((t) => (
              <button key={t} type="button" className="rounded-full px-2.5 py-1" style={{ backgroundColor: "var(--ad-muted)" }}>
                {t}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Row className="mb-6">
        {SECTIONS.map((s) => (
          <Col key={s.title} span={4}>
            <Card className="h-full">
              <CardBody full>
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: TONE_BG[s.tone], color: TONE_FG[s.tone] }}
                >
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <h6 className="mt-3.5 text-base font-600">{s.title}</h6>
                <ul className="mt-3 space-y-2">
                  {s.links.map((l) => (
                    <li key={l}>
                      <span className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[var(--ad-muted-foreground)] hover:text-[var(--ad-primary)]">
                        <Icon name="chevronRight" className="h-3 w-3" />
                        {l}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <Row>
        <Col span={5}>
          <Card className="h-full">
            <CardHead title="Keyboard Shortcuts" />
            <CardBody>
              <ul className="space-y-3.5">
                {SHORTCUTS.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-[var(--ad-muted-foreground)]">{s.label}</span>
                    <span className="flex shrink-0 gap-1">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="rounded border px-1.5 py-0.5 text-[11px] font-500"
                          style={{ borderColor: "var(--ad-border)", backgroundColor: "var(--ad-muted)" }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Col>

        <Col span={7}>
          <div className="flex h-full flex-col gap-6">
            <Card>
              <CardHead title="Design Notes" sub="How this console is put together" />
              <CardBody className="space-y-3.5 text-sm text-[var(--ad-muted-foreground)]">
                <p>
                  The whole surface is scoped to a single <code className="rounded px-1.5 py-0.5 text-[13px]" style={{ backgroundColor: "var(--ad-muted)" }}>.admindek</code> wrapper.
                  Colour, spacing and radius come from <code className="rounded px-1.5 py-0.5 text-[13px]" style={{ backgroundColor: "var(--ad-muted)" }}>--ad-*</code> custom
                  properties, so nothing here can leak into the public site or the Studio.
                </p>
                <p>
                  Light, dark and system modes are inherited: the root layout toggles{" "}
                  <code className="rounded px-1.5 py-0.5 text-[13px]" style={{ backgroundColor: "var(--ad-muted)" }}>html.dark</code> from the site-wide{" "}
                  <code className="rounded px-1.5 py-0.5 text-[13px]" style={{ backgroundColor: "var(--ad-muted)" }}>theme</code> cookie, and the header's theme control
                  writes that same cookie.
                </p>
                <p>
                  Charts are hand-drawn SVG rather than a charting library, so the console adds no dependencies and
                  renders entirely on the server.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Still stuck?" action={<Badge tone="success">Avg. reply 2h</Badge>} />
              <CardBody className="flex flex-wrap items-center gap-3">
                <button type="button" className="ad-btn ad-btn-primary">
                  <Icon name="chat" className="h-4 w-4" /> Start a conversation
                </button>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>
    </>
  );
}
