import { PageHeader, Card, CardHead, CardBody, Row, Col, Badge, Avatar, Progress, Table, Icon } from "../../../_components/ui";
import { Donut } from "../../../_components/charts";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "File Manager" };

const TREE = [
  { label: "All files", icon: "folder", count: 1284, active: true },
  { label: "Documents", icon: "file", count: 486 },
  { label: "Images", icon: "image", count: 512 },
  { label: "Contracts", icon: "invoice", count: 148 },
  { label: "Exports", icon: "download", count: 96 },
  { label: "Shared with me", icon: "users", count: 42 },
  { label: "Trash", icon: "trash", count: 18 },
];

const FOLDERS = [
  { name: "Studio contracts", items: 148, size: "2.4 GB", tone: "primary" },
  { name: "Brand assets", items: 312, size: "8.1 GB", tone: "info" },
  { name: "Finance exports", items: 96, size: "640 MB", tone: "success" },
  { name: "Legal & compliance", items: 74, size: "1.2 GB", tone: "warning" },
];

const FILES = [
  { name: "Falcon-Enterprise-Agreement.pdf", type: "PDF", size: "2.4 MB", owner: "Lina Haddad", modified: "Today, 12:41", icon: "file", tone: "danger" },
  { name: "Q1-2026-revenue-export.xlsx", type: "Spreadsheet", size: "812 KB", owner: "Omar Nasser", modified: "Today, 09:18", icon: "table", tone: "success" },
  { name: "platform-architecture-v4.png", type: "Image", size: "6.1 MB", owner: "Sara Al-Otaibi", modified: "Yesterday", icon: "image", tone: "info" },
  { name: "onboarding-walkthrough.mp4", type: "Video", size: "184 MB", owner: "Maya Tarek", modified: "Yesterday", icon: "play", tone: "warning" },
  { name: "security-review-notes.md", type: "Document", size: "24 KB", owner: "Yousef Khan", modified: "Mon", icon: "edit", tone: "primary" },
  { name: "studio-logos.zip", type: "Archive", size: "42 MB", owner: "Bilal Rahman", modified: "Mon", icon: "package", tone: "muted" },
];

const STORAGE = [
  { label: "Images", value: 42 },
  { label: "Video", value: 28 },
  { label: "Documents", value: 18 },
  { label: "Other", value: 12 },
];

const TONE_FG = {
  primary: "var(--ad-primary)", success: "var(--ad-success)", warning: "var(--ad-warning)",
  info: "var(--ad-info)", danger: "var(--ad-destructive)", muted: "var(--ad-muted-foreground)",
};
const TONE_BG = {
  primary: "rgba(70,128,255,.14)", success: "rgba(44,168,127,.16)", warning: "rgba(229,138,0,.16)",
  info: "rgba(4,169,245,.16)", danger: "rgba(220,38,38,.14)", muted: "var(--ad-muted)",
};

export default function FileManagerPage() {
  return (
    <>
      <PageHeader
        title="File Manager"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "File Manager" }]}
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="folder" className="h-3.5 w-3.5" /> New folder</button>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="upload" className="h-3.5 w-3.5" /> Upload</button>
          </>
        }
      />

      <Row>
        <Col span={3}>
          <div className="flex flex-col gap-6">
            <Card>
              <CardBody full className="p-3">
                <nav className="space-y-0.5">
                  {TREE.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--ad-accent)]"
                      style={t.active ? { backgroundColor: "rgba(70,128,255,.1)", color: "var(--ad-primary)", fontWeight: 500 } : undefined}
                    >
                      <Icon name={t.icon} className="h-4 w-4" />
                      <span className="flex-1 text-start">{t.label}</span>
                      <span className="text-xs text-[var(--ad-muted-foreground)]">{t.count}</span>
                    </button>
                  ))}
                </nav>
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Storage" sub="9.6 GB of 15 GB used" />
              <CardBody className="flex flex-col items-center">
                <Donut
                  size={150}
                  thickness={20}
                  data={STORAGE}
                  center={
                    <>
                      <span className="text-lg font-semibold">64%</span>
                      <span className="text-[11px] text-[var(--ad-muted-foreground)]">used</span>
                    </>
                  }
                />
                <ul className="mt-5 w-full space-y-2.5 text-sm">
                  {STORAGE.map((s, i) => (
                    <li key={s.label} className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-[var(--ad-muted-foreground)]">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--ad-chart-${i + 1})` }} />
                        {s.label}
                      </span>
                      <span className="font-medium">{s.value}%</span>
                    </li>
                  ))}
                </ul>
                <button type="button" className="ad-btn ad-btn-outline mt-5 w-full ad-btn-sm">Upgrade storage</button>
              </CardBody>
            </Card>
          </div>
        </Col>

        <Col span={9}>
          <div className="flex flex-col gap-6">
            <Row>
              {FOLDERS.map((f) => (
                <Col key={f.name} span={3}>
                  <Card>
                    <CardBody full className="p-4">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: TONE_BG[f.tone], color: TONE_FG[f.tone] }}
                      >
                        <Icon name="folder" className="h-5 w-5" />
                      </span>
                      <p className="mt-3 truncate text-sm font-medium">{f.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{f.items} files · {f.size}</p>
                    </CardBody>
                  </Card>
                </Col>
              ))}
            </Row>

            <Card>
              <CardHead
                title="Recent Files"
                action={
                  <div className="flex items-center gap-2">
                    <button type="button" className="ad-icon-btn h-9 w-9" aria-label="Grid view"><Icon name="grid" className="h-4 w-4" /></button>
                    <button type="button" className="ad-icon-btn h-9 w-9" aria-label="List view"><Icon name="list" className="h-4 w-4" /></button>
                  </div>
                }
              />
              <Table head={["Name", "Type", "Size", "Owner", "Modified", { label: "", align: "end" }]}>
                {FILES.map((f) => (
                  <tr key={f.name}>
                    <td>
                      <span className="inline-flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: TONE_BG[f.tone], color: TONE_FG[f.tone] }}
                        >
                          <Icon name={f.icon} className="h-4 w-4" />
                        </span>
                        <span className="truncate font-medium">{f.name}</span>
                      </span>
                    </td>
                    <td><Badge tone="muted">{f.type}</Badge></td>
                    <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{f.size}</td>
                    <td>
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        <Avatar name={f.owner} size={26} />
                        <span className="text-[var(--ad-muted-foreground)]">{f.owner}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{f.modified}</td>
                    <td className="text-end">
                      <button type="button" className="ad-icon-btn h-8 w-8" aria-label={`Actions for ${f.name}`}>
                        <Icon name="more" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            </Card>

            <Card>
              <CardHead title="Uploads in Progress" />
              <CardBody>
                <ul className="space-y-5">
                  {[
                    { name: "annual-report-2026.pdf", pct: 82, size: "18.4 MB" },
                    { name: "studio-demo-recording.mov", pct: 47, size: "412 MB" },
                    { name: "brand-refresh-assets.zip", pct: 12, size: "1.2 GB" },
                  ].map((u) => (
                    <li key={u.name}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium">{u.name}</span>
                        <span className="shrink-0 text-xs text-[var(--ad-muted-foreground)]">{u.pct}% of {u.size}</span>
                      </div>
                      <Progress value={u.pct} tone={u.pct > 70 ? "success" : "primary"} />
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>
    </>
  );
}
