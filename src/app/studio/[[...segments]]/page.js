import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { currentUser, needsQuestionnaire } from "@/lib/identity";
import { studioContext, canAdminister, visibleSections, canManageSection, listGrants, recordStudioVisit } from "@/lib/studios";
import { listSections } from "@/lib/data/sections";
import { getProfile } from "@/lib/data/users";
import { loadCatalogues, planOf, hasLiveChat } from "@/lib/plans";
import { chatDisplayName } from "@/lib/chatConstants";
import { chatsUsed, allowanceOf } from "@/lib/data/chatUsage";
import StudioFrame from "@/components/studio2/StudioFrame";
import LiveProvider from "@/components/studio2/LiveProvider";
import StudioDocs from "@/components/studio2/StudioDocs";
import StudioSalesLive from "@/components/studio2/StudioSalesLive";
import StudioTechnicalLive from "@/components/studio2/StudioTechnicalLive";
import StudioPeople from "@/components/studio2/StudioPeople";
import StudioAccess from "@/components/studio2/StudioAccess";
import StudioSettings from "@/components/studio2/StudioSettings";
import StudioSales from "@/components/studio2/StudioSales";
import StudioTicketProfile from "@/components/studio2/StudioTicketProfile";
import StudioTechnical from "@/components/studio2/StudioTechnical";
import StudioProjects from "@/components/studio2/StudioProjects";
import StudioHr from "@/components/studio2/StudioHr";
import StudioInventory from "@/components/studio2/StudioInventory";
import StudioFinance from "@/components/studio2/StudioFinance";
import StudioTasks from "@/components/studio2/StudioTasks";
import StudioOperations from "@/components/studio2/StudioOperations";
import StudioMain from "@/components/studio2/StudioMain";

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
  // Same gate as the account hub, checked BEFORE membership: someone who has
  // not answered the survey has no business inside a studio either, and this
  // way the studio's own 404-for-non-members never fires first and hides why.
  if (await needsQuestionnaire(user.id)) redirect(`/en/questionnaire`);

  const context = await studioContext(user, slug);
  // "No such studio" and "not a member" both render 404 on purpose — membership
  // is not discoverable from the outside.
  if (context.error) {
    if (context.error === "forbidden") return <NotAMember slug={slug} />;
    notFound();
  }

  // `access` comes from studioContext; dropping it here is what silently
  // disarms every check downstream.
  const { studio, collaborator, access } = context;

  // Tally the visit so the account overview can rank studios by how much this
  // person actually uses them. Fire-and-forget: ranking is a convenience, and a
  // failed tally must never cost the page a render or a millisecond of latency.
  recordStudioVisit(user.id, studio.id).catch(() => {});

  const admin = canAdminister(studio, collaborator);
  const [allSections, grants, catalogues, profile] = await Promise.all([
    listSections(studio.id), listGrants(studio.id), loadCatalogues(), getProfile(user.id),
  ]);
  const plan = planOf(studio, catalogues.packages, catalogues.tiers);
  const sections = visibleSections(studio, collaborator, allSections, grants, access);

  // Live chat with nompany: every package except Free. Computed here so the
  // shell knows whether to draw the button at all; /api/chat/start decides the
  // same question again for the request, which is the answer that binds.
  // Whether the package includes chat at all, and how much of this month's
  // allowance is left. The button is DRAWN whenever the package has chat and
  // disabled when the allowance is spent — a button that vanishes leaves
  // somebody wondering what they did wrong.
  const chatUsed = hasLiveChat(plan) ? await chatsUsed(studio.id) : 0;
  const chat = {
    enabled: hasLiveChat(plan),
    userName: chatDisplayName({ alias: collaborator.alias, profile, email: user.email }),
    ...allowanceOf(chatUsed, plan.chatPerMonth),
  };

  const { segments = [] } = await params;
  const requested = segments[0] || "";

  // The manual is full-screen: it renders OUTSIDE StudioFrame, so it returns
  // before the shell is built. Membership was already established above, so it
  // is available to every member regardless of section grants. Checked ahead of
  // the section lookup, so it wins over a section that happened to use the key.
  if (requested === "documentation") {
    return <StudioDocs studio={{ name: studio.name, slug: studio.slug }} />;
  }

  // Sales Live view is full-screen too, so it also returns before the shell.
  // It needs the Sales grant, which its own API call re-checks server-side.
  //
  // Each carries its OWN LiveProvider. StudioFrame normally supplies it, and
  // these two deliberately render outside the shell — so without this they
  // would be the only boards in the studio with no live connection, which on a
  // screen literally called "Live view" is the worst possible place for it.
  if (requested === "sales-live") {
    return (
      <LiveProvider slug={studio.slug}>
        <StudioSalesLive studio={{ name: studio.name, slug: studio.slug }} />
      </LiveProvider>
    );
  }
  if (requested === "technical-live") {
    return (
      <LiveProvider slug={studio.slug}>
        <StudioTechnicalLive studio={{ name: studio.name, slug: studio.slug }} />
      </LiveProvider>
    );
  }

  // A second segment on a sales-tickets URL names ONE ticket: /<slug>/
  // sales-tickets/<id> is that ticket's own page. It still resolves through
  // the sales-tickets section, so the same grant governs it.
  const ticketId = requested === "sales-tickets" ? (segments[1] || "") : "";

  const isPeople = requested === "people";
  const isAccess = requested === "access";
  // Keyed "studio-settings", not "settings": section keys are tenant data, and a
  // studio is free to name a section "settings" (Sales already has a settings
  // sub-section). A distinct key means this screen can never shadow one.
  const isSettings = requested === "studio-settings";

  // Admin-only screens.
  if (isAccess && !admin) return <Denied studio={studio} sections={sections} me={collaborator} admin={admin} what="manage access" />;

  const active = isPeople || isAccess || isSettings ? null : (sections.find((s) => s.key === requested) || sections[0] || null);
  // Asked for a real section they haven't been granted → say so rather than
  // silently showing something else.
  const deniedSection = !isPeople && !isAccess && !isSettings && requested && !sections.some((s) => s.key === requested)
    && allSections.some((s) => s.key === requested);

  // Which component to render: a sub-section resolves to its parent's module.
  // The module then decides the screen from the ACTIVE key — Sales does this
  // properly (dashboard / tickets / clients / settings), while the not-yet-
  // ported modules ignore it and show their single combined screen.
  const screenKey = active?.parentId
    ? (allSections.find((s) => s.id === active.parentId)?.key || active.key)
    : active?.key;

  const frameProps = {
    studio: {
      name: studio.name, slug: studio.slug, logo: studio.logo || "",
      packageName: plan.packageName, packageColor: plan.packageColor,
      tierName: plan.tierName, tierColor: plan.tierColor,
    },
    me: { alias: collaborator.alias || "", role: collaborator.role, canAdminister: admin },
    // parentId drives the expandable nav.
    sections: sections.map((s) => ({ id: s.id, key: s.key, name: s.name, enabled: s.enabled, parentId: s.parentId || null })),
    activeKey: isPeople ? "people" : isAccess ? "access" : isSettings ? "studio-settings" : (active?.key || ""),
    chat,
  };

  return (
    <StudioFrame {...frameProps}>
      {isPeople ? <StudioPeople slug={studio.slug} canAdminister={admin} myCollaboratorId={collaborator.id} />
        : isAccess ? <StudioAccess slug={studio.slug} />
        : isSettings ? <StudioSettings slug={studio.slug} />
        : deniedSection ? <NoSectionAccess />
        : ticketId ? <StudioTicketProfile slug={studio.slug} ticketId={ticketId} />
        : screenKey === "sales" ? <StudioSales slug={studio.slug} view={active?.key} />
        : screenKey === "technical" ? <StudioTechnical slug={studio.slug} view={active?.key} />
        : screenKey === "projects" ? <StudioProjects slug={studio.slug} view={active?.key} />
        : screenKey === "hr" ? <StudioHr slug={studio.slug} view={active?.key} />
        : screenKey === "inventory" ? <StudioInventory slug={studio.slug} view={active?.key} />
        : screenKey === "finance" ? <StudioFinance slug={studio.slug} view={active?.key} />
        : screenKey === "tasks" ? <StudioTasks slug={studio.slug} view={active?.key} />
        : screenKey === "operations" ? <StudioOperations slug={studio.slug} view={active?.key} />
        : screenKey === "main" ? <StudioMain slug={studio.slug} />
        : active ? <SectionDashboard section={active} studio={studio}
            subsections={sections.filter((s) => s.parentId === active.id)}
            canManage={canManageSection(studio, collaborator, active.id, grants)} />
        : <NothingGranted admin={admin} slug={studio.slug} />}
    </StudioFrame>
  );
}

// EVERY section owns a dashboard, and this is the one for sections that have no
// module of their own yet — Main, and any section a studio appends later. It is
// deliberately empty of analytics: it exists so that clicking a section always
// lands somewhere that belongs to that SectionID rather than nowhere at all.
// Sub-sections, when the section has any, are the way onward from here.
function SectionDashboard({ section, studio, subsections = [], canManage }) {
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
        An overview of this section. Nothing is reported here yet — it has its own SectionID
        (<code className="font-mono text-xs">{section.id}</code>) and its records are stored under it,
        scoped to {studio.name}.
      </p>

      {subsections.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {subsections.map((s) => (
            <Link key={s.id} href={`/${studio.slug}/${s.key}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-500 dark:border-white/15 dark:bg-[#191921] dark:hover:border-brand-500/40">
              <p className="font-display text-sm font-700 text-slate-900 dark:text-white">{s.name}</p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-400 dark:text-slate-500">{s.key}</p>
            </Link>
          ))}
        </div>
      )}
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
