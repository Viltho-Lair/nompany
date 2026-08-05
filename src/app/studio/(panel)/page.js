import Link from "next/link";
import { getCollection, getSettings } from "@/lib/db";
import StatCard from "@/components/studio/StatCard";
import DonutChart from "@/components/studio/DonutChart";
import { Icon } from "@/components/studio/icons";
import PersonalStudioHome from "@/components/studio/PersonalStudioHome";
import MainAnalytics from "@/components/studio/MainAnalytics";
import { currentUser } from "@/lib/session";
import { getSectionAccess } from "@/lib/sectionAccess";
import { canAccessSection } from "@/lib/sectionAccessConstants";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const newThisWeek = (rows) => {
  const now = Date.now();
  return rows.filter((r) => r.createdAt && now - new Date(r.createdAt).getTime() < WEEK).length;
};
const byNewest = (rows) =>
  [...rows].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
const fmtDate = (v) => {
  try {
    return new Date(v).toLocaleDateString("en-GB");
  } catch {
    return "";
  }
};

export default async function StudioDashboard() {
  const actor = await currentUser();
  if (!actor) redirect("/studio/login");
  const accessMap = await getSectionAccess();
  // Only users granted the "dashboard" section (or admin) see this main
  // dashboard. Everyone else is ALWAYS sent to the first section they can
  // reach — RULE: a user entering the studio lands on their assigned
  // department/section, never on a generic page. The list below must cover
  // EVERY section key (department top-levels first, then every sub-section)
  // so no accessible user can fall through.
  if (!canAccessSection(actor, "dashboard", accessMap)) {
    const LANDING = [
      ["projects-overtimes", "/studio/projects/overtime"],
      // Department top-levels (a user's most likely "home").
      ["projects", "/studio/projects"],
      ["technical", "/studio/technical"],
      ["sales", "/studio/sales"],
      ["operations", "/studio/operations"],
      ["operations-tracking", "/studio/operations/tracking"],
      ["operations-settings", "/studio/operations/settings"],
      ["finance", "/studio/finance"],
      ["cash", "/studio/finance/cash"],
      ["finance-settings", "/studio/finance/settings"],
      ["inventory", "/studio/inventory"],
      ["hr", "/studio/hr"],
      // Sub-sections (for users granted only a leaf, not its parent).
      ["projects-list", "/studio/projects/list"],
      ["projects-sla", "/studio/projects/sla"],
      ["projects-settings", "/studio/projects/settings"],
      ["technical-quotations", "/studio/technical/quotations"],
      ["technical-rfq", "/studio/technical/rfq"],
      ["technical-settings", "/studio/technical/settings"],
      ["technical-live", "/studio/live/technical"],
      ["sales-list", "/studio/sales/tickets"],
      ["sales-clients", "/studio/sales/clients"],
      ["sales-live", "/studio/live/sales"],
      ["sales-settings", "/studio/sales/settings"],
      ["inventory-stock", "/studio/inventory/stock"],
      ["inventory-vendors", "/studio/inventory/vendors"],
      ["inventory-items", "/studio/inventory/items"],
      ["inventory-sheets", "/studio/inventory/sheets"],
      ["inventory-awb", "/studio/inventory/awb"],
      ["employees", "/studio/employees"],
      ["users", "/studio/users"],
      ["careers", "/studio/careers"],
      ["applications", "/studio/applications"],
      ["services", "/studio/services"],
      ["previous-projects", "/studio/previous-projects"],
      ["gallery", "/studio/gallery"],
      ["messages", "/studio/messages"],
      ["reviews", "/studio/reviews"],
      ["content-statistics", "/studio/content/statistics"],
      ["chat", "/studio/chat"],
      ["documentation", "/studio/documentation"],
      ["documentation-settings", "/studio/documentation/settings"],
      ["access", "/studio/access"],
      ["company", "/studio/settings"],
      ["settings", "/studio/settings"],
      ["tasks", "/studio/tasks"], // universal — the ultimate fallback
    ];
    for (const [key, href] of LANDING) {
      if (canAccessSection(actor, key, accessMap)) redirect(href);
    }
    return <PersonalStudioHome user={actor} accessMap={accessMap} />;
  }

  const [services, previousProjects, projects, careers, applications, messages, reviews, settings] =
    await Promise.all([
      getCollection("services"),
      getCollection("previousProjects"),
      getCollection("projects"),
      getCollection("careers"),
      getCollection("applications"),
      getCollection("messages"),
      getCollection("reviews"),
      getSettings(),
    ]);

  const appNew = newThisWeek(applications);
  const msgNew = newThisWeek(messages);
  const openApps = applications.filter((a) => a.status !== "rejected").length;
  const reviewsPending = reviews.filter((r) => r.status !== "approved").length;

  const stats = [
    { label: "Services", value: services.length, icon: "services", accent: "blue", href: "/studio/services" },
    { label: "Projects", value: projects.length, icon: "projects", accent: "navy", href: "/studio/projects" },
    { label: "Open roles", value: careers.length, icon: "careers", accent: "green", href: "/studio/careers" },
    {
      label: "Applications",
      value: applications.length,
      icon: "applications",
      accent: "amber",
      href: "/studio/applications",
      sub: appNew > 0 ? `${appNew} new this week` : `${openApps} awaiting review`,
    },
    {
      label: "Messages",
      value: messages.length,
      icon: "messages",
      accent: "rose",
      href: "/studio/messages",
      sub: msgNew > 0 ? `${msgNew} new this week` : "All caught up",
    },
    {
      label: "Client reviews",
      value: reviews.length,
      icon: "star",
      accent: "amber",
      href: "/studio/reviews",
      sub: reviewsPending > 0 ? `${reviewsPending} awaiting approval` : "All approved",
    },
    { label: "Case-study videos", value: previousProjects.length, icon: "video", accent: "slate", href: "/studio/previous-projects" },
  ];

  const donut = [
    { label: "Services", value: services.length, color: "#0159ae" },
    { label: "Projects", value: projects.length, color: "#0ea5e9" },
    { label: "Careers", value: careers.length, color: "#059669" },
    { label: "Videos", value: previousProjects.length, color: "#94a3b8" },
  ].filter((d) => d.value > 0);
  const contentTotal = donut.reduce((a, d) => a + d.value, 0);

  const recentMessages = byNewest(messages).slice(0, 5);
  const recentApplications = byNewest(applications).slice(0, 5);

  const quickActions = [
    { label: "Add a service", href: "/studio/services", icon: "services" },
    { label: "Add a project", href: "/studio/projects", icon: "projects" },
    { label: "Post a case-study video", href: "/studio/previous-projects", icon: "video" },
    { label: "Open a job role", href: "/studio/careers", icon: "careers" },
    { label: "Edit company info", href: "/studio/settings", icon: "settings" },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-800 text-slate-900 dark:text-white">Welcome back 👋</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Here&apos;s what&apos;s happening across {settings?.name_en || "MegaTech Arabia"} today.
          </p>
        </div>
        <span className="text-sm font-500 text-slate-400 dark:text-slate-500">
          {new Date().toLocaleDateString("en-GB")}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Content distribution + quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c] lg:col-span-2">
          <h3 className="mb-6 font-display text-base font-700 text-slate-900 dark:text-white">Content overview</h3>
          {contentTotal > 0 ? (
            <DonutChart data={donut} total={contentTotal} centerLabel="items" />
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">No content yet.</p>
          )}
        </div>
        <div className="rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
          <h3 className="mb-4 font-display text-base font-700 text-slate-900 dark:text-white">Quick actions</h3>
          <div className="space-y-1">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-500 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                  <Icon name={a.icon} className="h-4 w-4" />
                </span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentPanel
          title="Recent messages"
          href="/studio/messages"
          empty="No messages yet."
          rows={recentMessages}
          columns={["From", "Subject", ""]}
          render={(m) => (
            <>
              <td className="py-3 pe-3 font-500 text-slate-900 dark:text-white">{m.name}</td>
              <td className="max-w-[220px] truncate py-3 pe-3 text-slate-500 dark:text-slate-400">{m.subject || "—"}</td>
              <td className="py-3 text-end text-xs text-slate-400 dark:text-slate-500">{fmtDate(m.createdAt)}</td>
            </>
          )}
        />
        <RecentPanel
          title="Recent applications"
          href="/studio/applications"
          empty="No applications yet."
          rows={recentApplications}
          columns={["Applicant", "Role", "Status"]}
          render={(a) => (
            <>
              <td className="py-3 pe-3 font-500 text-slate-900 dark:text-white">{a.name}</td>
              <td className="max-w-[160px] truncate py-3 pe-3 text-slate-500 dark:text-slate-400">{a.jobTitle || "—"}</td>
              <td className="py-3 text-end">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-600 ${
                    a.status === "rejected"
                      ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                  }`}
                >
                  {a.status === "rejected" ? "Rejected" : "New"}
                </span>
              </td>
            </>
          )}
        />
      </div>

      {/* Org-wide analytics */}
      <div>
        <h3 className="mb-3 font-display text-base font-700 text-slate-900 dark:text-white">Analytics</h3>
        <MainAnalytics />
      </div>
    </div>
  );
}

function RecentPanel({ title, href, rows, columns, render, empty }) {
  return (
    <div className="rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{title}</h3>
        <Link href={href} className="text-xs font-600 text-brand-600 hover:underline dark:text-brand-400">
          View all →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-start text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:text-slate-500">
              {columns.map((c, i) => (
                <th key={i} className={`pb-2 font-600 ${i === columns.length - 1 ? "text-end" : "text-start"}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 dark:border-white/5">
                {render(row)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
