import { PageHeader, Card, Avatar, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Email" };

const FOLDERS = [
  { label: "Inbox", icon: "mail", count: 24, active: true },
  { label: "Starred", icon: "star", count: 6 },
  { label: "Sent", icon: "send" },
  { label: "Drafts", icon: "edit", count: 3 },
  { label: "Archive", icon: "package" },
  { label: "Trash", icon: "trash" },
];

const LABELS = [
  { label: "Platform", color: "var(--ad-chart-1)" },
  { label: "Billing", color: "var(--ad-chart-2)" },
  { label: "Security", color: "var(--ad-chart-3)" },
  { label: "Partners", color: "var(--ad-chart-4)" },
];

const MAIL = [
  { from: "Stripe", subject: "Payout of $84,120.00 is on the way", preview: "Your payout should arrive by Apr 03…", time: "12:48", unread: true, starred: true, label: "Billing" },
  { from: "Lina Haddad", subject: "Migration script — ready for review", preview: "Dry run is clean apart from the two duplicate…", time: "12:41", unread: true, label: "Platform" },
  { from: "Security Alerts", subject: "New sign-in from an unrecognised device", preview: "A sign-in to the super console was recorded…", time: "10:04", unread: true, label: "Security" },
  { from: "Falcon Contracting", subject: "Renewal — 148 seats, Enterprise", preview: "We'd like to add another 20 seats before…", time: "09:12", starred: true, label: "Partners" },
  { from: "Omar Nasser", subject: "Reconciliation sheet — March", preview: "Attached the reconciled ledger for March…", time: "Yesterday", label: "Billing" },
  { from: "Vercel", subject: "Deployment succeeded — nompany@4.2.0", preview: "Production deployment completed in 2m 14s…", time: "Yesterday", label: "Platform" },
  { from: "Maya Tarek", subject: "RTL polish — merged", preview: "All Arabic screens now mirror correctly…", time: "Mon", label: "Platform" },
];

const LABEL_COLOR = Object.fromEntries(LABELS.map((l) => [l.label, l.color]));

export default function EmailPage() {
  return (
    <>
      <PageHeader
        title="Email"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Email" }]}
        actions={<button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="edit" className="h-3.5 w-3.5" /> Compose</button>}
      />

      <Card className="overflow-hidden">
        <div className="flex h-[calc(100vh-260px)] min-h-[520px]">
          <div className="hidden w-[220px] shrink-0 flex-col border-e p-4 lg:flex" style={{ borderColor: "var(--ad-border)" }}>
            <nav className="space-y-0.5">
              {FOLDERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--ad-accent)]"
                  style={f.active ? { backgroundColor: "rgba(70,128,255,.1)", color: "var(--ad-primary)", fontWeight: 500 } : undefined}
                >
                  <Icon name={f.icon} className="h-4 w-4" />
                  <span className="flex-1 text-start">{f.label}</span>
                  {f.count ? <span className="text-xs text-[var(--ad-muted-foreground)]">{f.count}</span> : null}
                </button>
              ))}
            </nav>

            <p className="mb-2 mt-7 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--ad-muted-foreground)]">
              Labels
            </p>
            <nav className="space-y-0.5">
              {LABELS.map((l) => (
                <button
                  key={l.label}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--ad-accent)]"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="flex-1 text-start">{l.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto rounded-lg p-3.5" style={{ backgroundColor: "var(--ad-muted)" }}>
              <p className="text-xs font-medium">Storage</p>
              <div className="my-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ad-border)]">
                <div className="h-full rounded-full" style={{ width: "64%", backgroundColor: "var(--ad-primary)" }} />
              </div>
              <p className="text-[11px] text-[var(--ad-muted-foreground)]">9.6 GB of 15 GB used</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--ad-border)" }}>
              <input type="checkbox" className="ad-check" aria-label="Select all" />
              <button type="button" className="ad-icon-btn h-9 w-9" aria-label="Refresh"><Icon name="refresh" className="h-4 w-4" /></button>
              <button type="button" className="ad-icon-btn h-9 w-9" aria-label="Archive"><Icon name="package" className="h-4 w-4" /></button>
              <button type="button" className="ad-icon-btn h-9 w-9" aria-label="Delete"><Icon name="trash" className="h-4 w-4" /></button>
              <div className="relative ms-auto">
                <Icon name="search" className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ad-muted-foreground)] ltr:left-3 rtl:right-3" />
                <input className="ad-input w-48 ps-9 sm:w-64" placeholder="Search mail…" aria-label="Search mail" />
              </div>
            </div>

            <ul className="ad-scrollarea flex-1">
              {MAIL.map((m) => (
                <li key={m.subject}>
                  <div
                    className="flex cursor-pointer items-center gap-3 border-b px-4 py-3.5 transition-colors hover:bg-[var(--ad-accent)]"
                    style={{
                      borderColor: "var(--ad-border)",
                      backgroundColor: m.unread ? "color-mix(in srgb, var(--ad-primary) 4%, transparent)" : undefined,
                    }}
                  >
                    <input type="checkbox" className="ad-check shrink-0" aria-label={`Select ${m.subject}`} />
                    <Icon
                      name="star"
                      className="h-4 w-4 shrink-0"
                      style={{ color: m.starred ? "var(--ad-warning)" : "var(--ad-muted-foreground)", fill: m.starred ? "var(--ad-warning)" : "none" }}
                    />
                    <Avatar name={m.from} size={34} className="hidden shrink-0 sm:inline-flex" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`truncate text-sm ${m.unread ? "font-semibold" : "font-medium"}`}>{m.from}</p>
                        <span
                          className="hidden h-2 w-2 shrink-0 rounded-full sm:inline-block"
                          style={{ backgroundColor: LABEL_COLOR[m.label] }}
                          title={m.label}
                        />
                      </div>
                      <p className={`truncate text-sm ${m.unread ? "font-medium" : "text-[var(--ad-muted-foreground)]"}`}>
                        {m.subject}
                      </p>
                      <p className="truncate text-xs text-[var(--ad-muted-foreground)]">{m.preview}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-[var(--ad-muted-foreground)]">{m.time}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-[var(--ad-muted-foreground)]" style={{ borderColor: "var(--ad-border)" }}>
              <span>1–7 of 248</span>
              <div className="flex gap-1">
                <button type="button" className="ad-icon-btn h-8 w-8" aria-label="Previous page"><Icon name="chevronLeft" className="h-4 w-4" /></button>
                <button type="button" className="ad-icon-btn h-8 w-8" aria-label="Next page"><Icon name="chevronRight" className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
