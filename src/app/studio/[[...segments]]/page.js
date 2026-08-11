import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/identity";
import { studioContext, canAdminister, visibleSections, canManageSection, listGrants } from "@/lib/studios";
import { listSections } from "@/lib/data/sections";
import StudioFrame from "@/components/studio2/StudioFrame";
import StudioPeople from "@/components/studio2/StudioPeople";
import StudioAccess from "@/components/studio2/StudioAccess";
import StudioSales from "@/components/studio2/StudioSales";
import StudioTechnical from "@/components/studio2/StudioTechnical";
import StudioProjects from "@/components/studio2/StudioProjects";
import StudioHr from "@/components/studio2/StudioHr";
import StudioInventory from "@/components/studio2/StudioInventory";
import StudioFinance from "@/components/studio2/StudioFinance";
import StudioTasks from "@/components/studio2/StudioTasks";
import StudioOperations from "@/components/studio2/StudioOperations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Studio", robots: { index: false, follow: false } };

// THE STUDIO. Served at the tenant's own address — www.nompany.com/<slug> — via
// the proxy rewrite; this internal folder name never appears in the browser.
//
// Tenancy is SLUG-DRIVEN: the URL names the tenant (x-studio-slug, set by the
// proxy) and MEMBERSHIP authorises it. Section access is then filtered per
// person, default-deny, so a member only ever sees what they were granted.
export default async function StudioPage({ params }) {
  const slug = (await headers()).get("x-studio-slug") || "";
  if (!slug) notFound();

  const user = await currentUser();
  if (!user) redirect(`/en/login`);

  const context = await studioContext(user, slug);
  // "No such studio" and "not a member" both render 404 on purpose — membership
  // is not discoverable from the outside.
  if (context.error) {
    if (context.error === "forbidden") return <NotAMember slug={slug} />;
    notFound();
  }

  const { studio, collaborator } = context;
  const admin = canAdminister(studio, collaborator);
  const [allSections, grants] = await Promise.all([listSections(studio.id), listGrants(studio.id)]);
  const sections = visibleSections(studio, collaborator, allSections, grants);

  const { segments = [] } = await params;
  const requested = segments[0] || "";
  const isPeople = requested === "people";
  const isAccess = requested === "access";

  // Admin-only screens.
  if (isAccess && !admin) return <Denied studio={studio} sections={sections} me={collaborator} admin={admin} what="manage access" />;

  const active = isPeople || isAccess ? null : (sections.find((s) => s.key === requested) || sections[0] || null);
  // Asked for a real section they haven't been granted → say so rather than
  // silently showing something else.
  const deniedSection = !isPeople && !isAccess && requested && !sections.some((s) => s.key === requested)
    && allSections.some((s) => s.key === requested);

  const frameProps = {
    studio: { name: studio.name, slug: studio.slug },
    me: { alias: collaborator.alias || "", role: collaborator.role, canAdminister: admin },
    sections: sections.map((s) => ({ id: s.id, key: s.key, name: s.name, enabled: s.enabled })),
    activeKey: isPeople ? "people" : isAccess ? "access" : (active?.key || ""),
  };

  return (
    <StudioFrame {...frameProps}>
      {isPeople ? <StudioPeople slug={studio.slug} canAdminister={admin} myCollaboratorId={collaborator.id} />
        : isAccess ? <StudioAccess slug={studio.slug} />
        : deniedSection ? <NoSectionAccess />
        : active?.key === "sales" ? <StudioSales slug={studio.slug} />
        : active?.key === "technical" ? <StudioTechnical slug={studio.slug} />
        : active?.key === "projects" ? <StudioProjects slug={studio.slug} />
        : active?.key === "hr" ? <StudioHr slug={studio.slug} />
        : active?.key === "inventory" ? <StudioInventory slug={studio.slug} />
        : active?.key === "finance" ? <StudioFinance slug={studio.slug} />
        : active?.key === "tasks" ? <StudioTasks slug={studio.slug} />
        : active?.key === "operations" ? <StudioOperations slug={studio.slug} />
        : active ? <SectionPlaceholder section={active} studio={studio}
            canManage={canManageSection(studio, collaborator, active.id, grants)} />
        : <NothingGranted admin={admin} slug={studio.slug} />}
    </StudioFrame>
  );
}

function SectionPlaceholder({ section, studio, canManage }) {
  return (
    <div className="rounded-geex border border-slate-200/70 bg-white p-8 dark:border-white/10 dark:bg-[#20202c]">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-800 text-slate-900 dark:text-white">{section.name}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${canManage
          ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
          : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"}`}>
          {canManage ? "You can manage this" : "View only"}
        </span>
      </div>
      <p className="mt-2 max-w-prose text-sm text-slate-500 dark:text-slate-400">
        This section is live on the new data model — it has its own SectionID
        (<code className="font-mono text-xs">{section.id}</code>) and its records will be stored under it,
        scoped to {studio.name}. The module's screens are being rebuilt on this foundation.
      </p>
    </div>
  );
}

function NoSectionAccess() {
  return (
    <div className="rounded-geex border border-slate-200/70 bg-white p-8 text-center dark:border-white/10 dark:bg-[#20202c]">
      <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">You don't have access to that section</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Ask an admin of this studio to grant it to you.</p>
    </div>
  );
}

function NothingGranted({ admin, slug }) {
  return (
    <div className="rounded-geex border border-slate-200/70 bg-white p-8 text-center dark:border-white/10 dark:bg-[#20202c]">
      <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">Nothing has been shared with you yet</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        You're a member of this studio, but no sections have been granted to you. An admin can do that from
        {admin ? " " : " the "}Access.
      </p>
      {admin && (
        <Link href={`/${slug}/access`} className="mt-5 inline-block rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white hover:bg-brand-950">
          Open Access
        </Link>
      )}
    </div>
  );
}

function Denied({ studio, sections, me, admin, what }) {
  return (
    <StudioFrame
      studio={{ name: studio.name, slug: studio.slug }}
      me={{ alias: me.alias || "", role: me.role, canAdminister: admin }}
      sections={sections.map((s) => ({ id: s.id, key: s.key, name: s.name, enabled: s.enabled }))}
      activeKey=""
    >
      <div className="rounded-geex border border-slate-200/70 bg-white p-8 text-center dark:border-white/10 dark:bg-[#20202c]">
        <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">Admins only</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">You need to be an admin of this studio to {what}.</p>
      </div>
    </StudioFrame>
  );
}

function NotAMember({ slug }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--geex-page)] px-5">
      <div className="max-w-md rounded-geex border border-slate-200/70 bg-white p-8 text-center dark:border-white/10 dark:bg-[#20202c]">
        <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">You're not in this studio</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Ask an admin of <span className="font-mono">{slug}</span> to approve your request, then try again.
        </p>
        <Link href="/en/account" className="mt-5 inline-block rounded-full bg-brand-600 px-5 py-2.5 font-display text-sm font-700 text-white hover:bg-brand-700">
          Back to your account
        </Link>
      </div>
    </main>
  );
}
