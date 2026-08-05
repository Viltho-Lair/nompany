import Link from "next/link";
import { Icon } from "@/components/studio/icons";
import { SECTION_CATEGORIES, canAccessSection } from "@/lib/sectionAccessConstants";

// Landing page for non-admins: lists the sections this user's tags unlock,
// grouped the same way as the sidebar.
const HREF_BY_KEY = {
  services: "/studio/services",
  "previous-projects": "/studio/previous-projects",
  gallery: "/studio/gallery",
  projects: "/studio/projects",
  "projects-list": "/studio/projects/list",
  "projects-sla": "/studio/projects/sla",
  careers: "/studio/careers",
  applications: "/studio/applications",
  messages: "/studio/messages",
  reviews: "/studio/reviews",
  settings: "/studio/settings",
  users: "/studio/users",
  access: "/studio/access",
  hr: "/studio/hr",
  employees: "/studio/employees",
  technical: "/studio/technical",
  "technical-quotations": "/studio/technical/quotations",
  "technical-rfq": "/studio/technical/rfq",
  "technical-settings": "/studio/technical/settings",
  "technical-live": "/studio/live/technical",
  sales: "/studio/sales",
  "sales-list": "/studio/sales/tickets",
  "sales-clients": "/studio/sales/clients",
  "sales-live": "/studio/live/sales",
};
const LABEL_BY_KEY = {
  services: "Services", "previous-projects": "Previous Projects", gallery: "Showcase Gallery",
  projects: "Projects", "projects-list": "Project list", "projects-sla": "SLA",
  careers: "Careers", applications: "Applications", messages: "Messages", reviews: "Client Reviews",
  settings: "Company Info", hr: "Human Resources", employees: "Employees", users: "Users", access: "Access Control",
  technical: "Technical", "technical-quotations": "Quotations", "technical-rfq": "RFQ", "technical-settings": "Settings", "technical-live": "Live view",
  sales: "Sales", "sales-list": "Tickets", "sales-clients": "Clients", "sales-live": "Live view",
};

export default function PersonalStudioHome({ user, accessMap }) {
  const groups = SECTION_CATEGORIES
    .map((g) => ({ label: g.label, keys: g.keys.filter((k) => k !== "dashboard" && canAccessSection(user, k, accessMap)) }))
    .filter((g) => g.keys.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-800 text-slate-900 dark:text-white">
          Welcome back, {user?.fullName || user?.userId} 👋
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Here&apos;s what you have access to in Studio.</p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-geex border border-slate-200/70 bg-white p-8 text-center text-sm text-slate-400 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
          No sections have been assigned to your account yet — ask an admin to grant you access.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.label} className="rounded-geex border border-slate-200/70 bg-white p-5 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
              <h3 className="mb-3 font-display text-sm font-700 uppercase tracking-wide text-slate-400 dark:text-slate-500">{g.label}</h3>
              <div className="space-y-1">
                {g.keys.map((k) => (
                  <Link
                    key={k}
                    href={HREF_BY_KEY[k] || "/studio"}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-500 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <Icon name="external" className="h-3.5 w-3.5 text-slate-400" />
                    {LABEL_BY_KEY[k] || k}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
