import Link from "next/link";
import { requireSection } from "@/lib/session";
import { getSectionAccess } from "@/lib/sectionAccess";
import { canAccessSection } from "@/lib/sectionAccessConstants";
import { getCollection } from "@/lib/db";
import { Icon } from "@/components/studio/icons";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const card = "rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm transition-colors hover:border-brand-500/40 dark:border-white/10 dark:bg-[#20202c]";

export default async function Page() {
  const actor = await requireSection("hr");
  if (!actor) redirect("/studio");
  const accessMap = await getSectionAccess();

  const [employees, users, careers, applications] = await Promise.all([
    getCollection("employees"),
    getCollection("users"),
    getCollection("careers"),
    getCollection("applications"),
  ]);

  const openApps = applications.filter((a) => a.status !== "rejected").length;
  const cards = [
    { key: "employees", href: "/studio/employees", label: "Employees", icon: "team", value: employees.length, sub: `${employees.length} on record` },
    { key: "users", href: "/studio/users", label: "Users", icon: "team", value: users.length, sub: `${users.length} login accounts` },
    { key: "careers", href: "/studio/careers", label: "Careers", icon: "careers", value: careers.length, sub: `${careers.length} open roles` },
    { key: "applications", href: "/studio/applications", label: "Applications", icon: "applications", value: applications.length, sub: `${openApps} open` },
  ].filter((c) => canAccessSection(actor, c.key, accessMap));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-800 text-slate-900 dark:text-white">Human Resources</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Employees, user accounts, careers and applications.</p>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-geex border border-slate-200/70 bg-white p-10 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-[#20202c]">
          You have the HR dashboard but no sub-sections yet — ask an admin to grant them.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.key} href={c.href} className={card}>
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                <Icon name={c.icon} className="h-5 w-5" />
              </span>
              <p className="font-display text-3xl font-800 text-slate-900 dark:text-white">{c.value}</p>
              <p className="mt-0.5 font-600 text-slate-800 dark:text-slate-100">{c.label}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{c.sub}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
