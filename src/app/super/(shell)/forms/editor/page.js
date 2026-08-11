import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Avatar, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Editor" };

const TOOLS = [
  ["bold", "italic", "underline", "strike"],
  ["h1", "h2", "quote", "code"],
  ["list", "ordered", "link", "image"],
  ["align-left", "align-center", "align-right"],
];

const TOOL_ICON = {
  bold: "type", italic: "type", underline: "type", strike: "minus",
  h1: "type", h2: "type", quote: "chat", code: "code",
  list: "list", ordered: "list", link: "link", image: "image",
  "align-left": "list", "align-center": "list", "align-right": "list",
};

export default function EditorPage() {
  return (
    <>
      <PageHeader
        title="Editor"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Forms" }, { label: "Editor" }]}
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="eye" className="h-3.5 w-3.5" /> Preview</button>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="check" className="h-3.5 w-3.5" /> Publish</button>
          </>
        }
      />

      <Row>
        <Col span={8}>
          <Card>
            <CardBody full className="p-0">
              <div className="border-b p-5" style={{ borderColor: "var(--ad-border)" }}>
                <input
                  className="w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-[var(--ad-muted-foreground)]"
                  defaultValue="Announcing the new super admin console"
                  aria-label="Post title"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone="primary">Product</Badge>
                  <Badge tone="muted">Release notes</Badge>
                  <button type="button" className="ad-btn ad-btn-ghost ad-btn-sm">
                    <Icon name="plus" className="h-3 w-3" /> Add tag
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 border-b p-2.5" style={{ borderColor: "var(--ad-border)" }}>
                {TOOLS.map((group, gi) => (
                  <div key={gi} className="flex items-center gap-0.5">
                    {gi > 0 ? <span className="mx-1.5 h-5 w-px" style={{ backgroundColor: "var(--ad-border)" }} /> : null}
                    {group.map((t) => (
                      <button
                        key={t}
                        type="button"
                        title={t}
                        aria-label={t}
                        className="flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-[var(--ad-accent)]"
                      >
                        <Icon name={TOOL_ICON[t]} className="h-4 w-4 text-[var(--ad-muted-foreground)]" />
                      </button>
                    ))}
                  </div>
                ))}
                <div className="ms-auto flex items-center gap-2 pe-1 text-xs text-[var(--ad-muted-foreground)]">
                  <Icon name="check" className="h-3.5 w-3.5 text-[var(--ad-success)]" /> Saved
                </div>
              </div>

              <div
                className="min-h-[420px] space-y-4 p-6 text-sm leading-relaxed"
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                aria-label="Post body"
              >
                <p>
                  The super admin console is now the single place to see every studio on the platform — subscriptions,
                  usage, incidents and identity, all in one shell.
                </p>
                <h3 className="text-lg font-semibold">What's new</h3>
                <ul className="list-disc space-y-1.5 ps-5">
                  <li>A unified sidebar covering dashboards, applications and platform settings.</li>
                  <li>Light, dark and system themes inherited from the main website.</li>
                  <li>Right-to-left support across every screen.</li>
                </ul>
                <blockquote className="border-s-4 ps-4 italic text-[var(--ad-muted-foreground)]" style={{ borderColor: "var(--ad-primary)" }}>
                  Everything is keyboard reachable, and ⌘K jumps straight to any page.
                </blockquote>
                <p>
                  Rollout begins with internal accounts this week, then widens to platform operators once the audit log
                  lands.
                </p>
              </div>

              <div className="flex items-center justify-between border-t px-6 py-4 text-xs text-[var(--ad-muted-foreground)]" style={{ borderColor: "var(--ad-border)" }}>
                <span>128 words · ~1 min read</span>
                <span>Last edited 2 minutes ago</span>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col span={4}>
          <div className="flex flex-col gap-6">
            <Card>
              <CardHead title="Publishing" />
              <CardBody className="space-y-5">
                <div>
                  <label className="ad-label" htmlFor="ed-status">Status</label>
                  <select id="ed-status" className="ad-select" defaultValue="Draft">
                    <option>Draft</option>
                    <option>Scheduled</option>
                    <option>Published</option>
                  </select>
                </div>
                <div>
                  <label className="ad-label" htmlFor="ed-date">Publish at</label>
                  <input id="ed-date" type="datetime-local" className="ad-input" defaultValue="2026-04-12T09:00" />
                </div>
                <div>
                  <label className="ad-label" htmlFor="ed-visibility">Visibility</label>
                  <select id="ed-visibility" className="ad-select" defaultValue="Platform operators">
                    <option>Everyone</option>
                    <option>Platform operators</option>
                    <option>Internal only</option>
                  </select>
                </div>
                <label className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" className="ad-check" defaultChecked />
                  Notify subscribers on publish
                </label>
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Author" />
              <CardBody className="flex items-center gap-3">
                <Avatar name="Abdullah Abu Hammed" size={44} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">Abdullah Abu Hammed</p>
                  <p className="truncate text-xs text-[var(--ad-muted-foreground)]">Super Admin</p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Cover Image" />
              <CardBody>
                <div
                  className="aspect-[16/9] w-full rounded-lg"
                  style={{ backgroundImage: "linear-gradient(140deg, var(--ad-chart-1), var(--ad-chart-4))" }}
                />
                <div className="mt-3 flex gap-2">
                  <button type="button" className="ad-btn ad-btn-outline flex-1 ad-btn-sm">Replace</button>
                  <button type="button" className="ad-btn ad-btn-ghost flex-1 ad-btn-sm">Remove</button>
                </div>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>
    </>
  );
}
