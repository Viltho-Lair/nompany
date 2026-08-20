import { PageHeader, Card, CardBody, Badge, Avatar, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Task Board" };

const COLUMNS = [
  {
    name: "Backlog",
    tone: "muted",
    tasks: [
      { title: "Audit legacy webhook retries", tag: "Platform", tone: "primary", assignee: "Omar Nasser", due: "Apr 24", comments: 3, attachments: 1 },
      { title: "Arabic number formatting in exports", tag: "i18n", tone: "info", assignee: "Maya Tarek", due: "Apr 29", comments: 1 },
      { title: "Deprecate v1 studio API", tag: "API", tone: "warning", assignee: "Yousef Khan", due: "May 08", comments: 7, attachments: 2 },
    ],
  },
  {
    name: "In Progress",
    tone: "primary",
    tasks: [
      { title: "Billing migration — duplicate line items", tag: "Billing", tone: "danger", assignee: "Lina Haddad", due: "Apr 09", comments: 12, attachments: 4 },
      { title: "Rate-limit the invite endpoint", tag: "Security", tone: "danger", assignee: "Sara Al-Otaibi", due: "Apr 11", comments: 2 },
      { title: "Studio onboarding v3 — step 4", tag: "Product", tone: "primary", assignee: "Lina Haddad", due: "Apr 15", comments: 5, attachments: 1 },
    ],
  },
  {
    name: "In Review",
    tone: "warning",
    tasks: [
      { title: "Data warehouse rebuild — cutover plan", tag: "Data", tone: "info", assignee: "Sara Al-Otaibi", due: "Apr 02", comments: 9, attachments: 3 },
      { title: "RTL polish for the Studio shell", tag: "i18n", tone: "info", assignee: "Maya Tarek", due: "Apr 05", comments: 4 },
    ],
  },
  {
    name: "Done",
    tone: "success",
    tasks: [
      { title: "Move super console off the old key scheme", tag: "Platform", tone: "primary", assignee: "Omar Nasser", due: "Mar 28", comments: 6 },
      { title: "Add OTP resend throttling", tag: "Security", tone: "danger", assignee: "Yousef Khan", due: "Mar 25", comments: 2 },
      { title: "Ship release 4.2.0", tag: "Release", tone: "success", assignee: "Lina Haddad", due: "Mar 21", comments: 15, attachments: 2 },
    ],
  },
];

const TONE_FG = {
  primary: "var(--ad-primary)", success: "var(--ad-success)", warning: "var(--ad-warning)",
  info: "var(--ad-info)", danger: "var(--ad-destructive)", muted: "var(--ad-muted-foreground)",
};

export default function TaskBoardPage() {
  return (
    <>
      <PageHeader
        title="Task Board"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Task Board" }]}
        actions={
          <>
            <button type="button" className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="filter" className="h-3.5 w-3.5" /> Filter</button>
            <button type="button" className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="plus" className="h-3.5 w-3.5" /> Add task</button>
          </>
        }
      />

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1000px] grid-cols-4 gap-6">
          {COLUMNS.map((col) => (
            <section key={col.name} className="flex flex-col">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TONE_FG[col.tone] }} />
                <h6 className="text-sm font-600">{col.name}</h6>
                <span className="ad-num text-xs text-[var(--ad-muted-foreground)]">{col.tasks.length}</span>
                <button type="button" className="ad-icon-btn ms-auto h-7 w-7" aria-label={`Add to ${col.name}`}>
                  <Icon name="plus" className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {col.tasks.map((t) => (
                  <Card key={t.title} className="cursor-grab">
                    <CardBody full className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Badge tone={t.tone}>{t.tag}</Badge>
                        <button type="button" className="ad-icon-btn h-6 w-6" aria-label="Task actions">
                          <Icon name="more" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-2.5 text-sm font-500 leading-snug">{t.title}</p>
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <Avatar name={t.assignee} size={26} />
                        <div className="flex items-center gap-3 text-[11px] text-[var(--ad-muted-foreground)]">
                          {t.comments ? (
                            <span className="inline-flex items-center gap-1">
                              <Icon name="chat" className="h-3.5 w-3.5" />
                              {t.comments}
                            </span>
                          ) : null}
                          {t.attachments ? (
                            <span className="inline-flex items-center gap-1">
                              <Icon name="link" className="h-3.5 w-3.5" />
                              {t.attachments}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1">
                            <Icon name="calendar" className="h-3.5 w-3.5" />
                            {t.due}
                          </span>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}

                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm text-[var(--ad-muted-foreground)] transition-colors hover:bg-[var(--ad-accent)]"
                  style={{ borderColor: "var(--ad-border)" }}
                >
                  <Icon name="plus" className="h-4 w-4" /> Add a task
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
