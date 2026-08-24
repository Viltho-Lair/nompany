// IMPORTED UNDER ANOTHER NAME, because this file also has to export the route
// segment config `export const dynamic = "force-dynamic"` — and "the name
// `dynamic` is defined multiple times" is a build error, not a shadowing
// warning. Any App Router page that both force-dynamics and code-splits hits
// this, and the fix is the import, never the export: renaming the config would
// silently make the studio statically rendered.
import nextDynamic from "next/dynamic";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { currentUser, needsQuestionnaire } from "@/platform/auth/identity";
import { studioContext, canAdminister, visibleSections, recordStudioVisit } from "@/lib/studios";
import { sectionManageable, can } from "@/platform/access";
import { listSections } from "@/platform/db/sections";
import { getProfile } from "@/platform/auth/users";
import { loadCatalogues, planOf, hasLiveChat } from "@/lib/plans";
import { chatDisplayName } from "@/lib/chatConstants";
import { studioLocale } from "@/shared/i18n";
import { chatsUsed, allowanceOf } from "@/lib/data/chatUsage";
import StudioFrame from "@/components/studio2/StudioFrame";
import LiveProvider from "@/components/studio2/LiveProvider";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";

// ONE SCREEN IS RENDERED PER REQUEST, SO ONE SCREEN IS DOWNLOADED.
//
// This page is the whole studio: the proxy rewrites /<slug>/… onto it and the
// switch at the bottom picks a department. Imported statically, all twenty-odd
// department components land in this route's client manifest — and this route
// is EVERY route a tenant has, so somebody who only ever opens Sales was paying
// for Projects, Inventory, Operations, HR, Finance, Tasks and the two viewers
// as well. 12,600 lines of client component, and the reason the largest chunk
// is the size it is.
//
// `dynamic()` gives each one its own chunk, fetched when the switch actually
// reaches it. NO `ssr: false` — that is not allowed in a Server Component and
// would be wrong anyway: these screens should still render on the server, they
// simply should not all be shipped at once.
//
// StudioFrame and LiveProvider stay static. Every request renders both, so
// splitting them would buy a round trip and save nothing.
const StudioDocs = nextDynamic(() => import("@/components/studio2/StudioDocs"));
const DocumentList = nextDynamic(() =>
  import("@/components/quality/documents/document-list").then((m) => m.DocumentList));
const DocumentView = nextDynamic(() =>
  import("@/components/quality/documents/document-view").then((m) => m.DocumentView));
const StudioSalesLive = nextDynamic(() => import("@/components/studio2/StudioSalesLive"));
const StudioTechnicalLive = nextDynamic(() => import("@/components/studio2/StudioTechnicalLive"));
const StudioPeople = nextDynamic(
  () => import("@/components/studio2/StudioPeople"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioRoles = nextDynamic(
  () => import("@/components/studio2/StudioRoles"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioSettings = nextDynamic(
  () => import("@/components/studio2/StudioSettings"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioSales = nextDynamic(
  () => import("@/components/studio2/StudioSales"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioTicketProfile = nextDynamic(
  () => import("@/components/studio2/StudioTicketProfile"),
  { loading: () => <ScreenSkeleton /> },
);
// THE PROJECT PROFILE IS THE KANBAN BOARD NOW. Full-screen, so it renders
// outside StudioFrame like the manual and the live views (see the early-return
// below). dnd-kit and the board store ride this chunk, fetched only when a
// project is opened.
const StudioProjectBoard = nextDynamic(
  () => import("@/components/studio2/StudioProjectBoard"),
  { loading: () => <ScreenSkeleton /> },
);
// The project planner — a full-screen app (the list) and one plan's schedule.
// Reached through Operations (the whole app) and through a project (its own
// plans), so both the studio route branches below hand it the plan's API base.
const StudioPlanner = nextDynamic(
  () => import("@/components/studio2/StudioPlanner"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioPlannerPrint = nextDynamic(
  () => import("@/components/studio2/StudioPlannerPrint"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioPlannerList = nextDynamic(
  () => import("@/components/studio2/StudioPlannerList"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioSheetViewer = nextDynamic(
  () => import("@/components/studio2/StudioSheetViewer"),
  { loading: () => <ScreenSkeleton /> },
);
const SalesQuotationViewer = nextDynamic(
  () => import("@/components/studio2/SalesQuotationViewer"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioTechnical = nextDynamic(
  () => import("@/components/studio2/StudioTechnical"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioProjects = nextDynamic(
  () => import("@/components/studio2/StudioProjects"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioHr = nextDynamic(
  () => import("@/components/studio2/StudioHr"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioInventory = nextDynamic(
  () => import("@/components/studio2/StudioInventory"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioFinance = nextDynamic(
  () => import("@/components/studio2/StudioFinance"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioTasks = nextDynamic(
  () => import("@/components/studio2/StudioTasks"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioOperations = nextDynamic(
  () => import("@/components/studio2/StudioOperations"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioMain = nextDynamic(
  () => import("@/components/studio2/StudioMain"),
  { loading: () => <ScreenSkeleton /> },
);

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
  // THESE TWO ARE NOT THE SAME SCREEN, and the comment that used to sit here
  // claimed they were. A missing slug 404s; a real studio you are not in gets
  // NotAMember, which names the slug and tells you to ask an admin.
  //
  // That is deliberate, not a leak. A slug is a public address — requestJoinByCode
  // exists so somebody can type one they were told — so existence was never the
  // secret. The contents are: no row, no name, no count, no section reaches
  // anyone who is not a collaborator.
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

  const admin = canAdminister(access);
  const [allSections, catalogues, profile] = await Promise.all([
    listSections(studio.id), loadCatalogues(), getProfile(user.id),
  ]);
  const plan = planOf(studio, catalogues.packages, catalogues.tiers);
  const sections = visibleSections(studio, collaborator, allSections, access);

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

  // Quality -> Documents is full-screen as well, and unlike the manual it is a
  // SECTION, so the grant decides. `sections` is already filtered to what this
  // person may see, so asking it answers both questions at once — the grant and
  // whether the section is enabled at all.
  //
  // A refusal deliberately falls THROUGH rather than returning something here:
  // the shell below already answers "you asked for a section you weren't
  // granted" for every other section, and a second refusal screen of its own
  // would be the same sentence in a different voice.
  if (requested === "quality-documents" && sections.some((s) => s.key === "quality-documents")) {
    const shell = { name: studio.name, slug: studio.slug };
    // NO SETUP SCREEN. Document types, prefixes, department codes and the
    // studio letterhead were all settings the old builder needed: it could not
    // number a document without a type, and it drew one letterhead for every
    // document because a document had no page of its own. The editor that
    // replaced it gives every document its own paper, margins, bands and
    // fonts, so there is nothing left for a studio-wide setting to decide.
    //
    // ONE EDITOR, NO SEPARATE READER. The builder and the viewer used to be two
    // screens because the canvas could not show what the paper would do; the
    // editor that replaced them lays the document out on real sheets and prints
    // exactly what it draws, so there is nothing left for a second screen to
    // show. /<id>/preview is gone with it.
    if (segments[1]) {
      return <DocumentView studio={shell} documentId={segments[1]} />;
    }

    return (
      <DocumentList
        studio={shell}
        canCreate={can(access, "quality.documents.create")}
        canDelete={can(access, "quality.documents.delete")}
      />
    );
  }

  // THE PROJECT PROFILE IS THE KANBAN BOARD, and the board is full-screen — so,
  // like the manual and the live views, it renders OUTSIDE StudioFrame and
  // returns before the shell is built. /<slug>/projects-list/<id> is one
  // project's board; the /quotation sub-route is left to the in-frame viewer
  // below, so this deliberately does not catch it.
  //
  // It rides the projects-list grant: the section must be visible to this person
  // (its /board API re-checks server-side, and the write re-checks the edit
  // right). It carries its OWN LiveProvider, because it renders outside the shell
  // that usually supplies one and the sidebar's live updates need it. A refusal
  // falls THROUGH to the shell below, which already answers "not granted".
  if (
    requested === "projects-list" && segments[1] &&
    segments[2] !== "quotation" && segments[2] !== "plans" &&
    sections.some((s) => s.key === "projects-list")
  ) {
    return (
      <LiveProvider slug={studio.slug}>
        <StudioProjectBoard slug={studio.slug} projectId={segments[1]} />
      </LiveProvider>
    );
  }

  // A PROJECT'S PLAN — /<slug>/projects-list/<id>/plans/<planId>. The plan opens
  // full-screen in the planner, reached through the PROJECT'S grant, so no
  // Operations access is needed to see (or, for a project editor, work on) it.
  // Its own LiveProvider, like every screen outside the shell. Back goes to the
  // project's board.
  if (
    requested === "projects-list" && segments[1] && segments[2] === "plans" && segments[3] &&
    sections.some((s) => s.key === "projects-list")
  ) {
    const planApiBase = `/api/studios/${studio.slug}/projects/${segments[1]}/plans/${segments[3]}`;
    const planHref = `/${studio.slug}/projects-list/${segments[1]}/plans/${segments[3]}`;
    // /…/plans/<planId>/print is the printable page of that same plan.
    if (segments[4] === "print") {
      return (
        <LiveProvider slug={studio.slug}>
          <StudioPlannerPrint slug={studio.slug} planApiBase={planApiBase} backHref={planHref} />
        </LiveProvider>
      );
    }
    return (
      <LiveProvider slug={studio.slug}>
        <StudioPlanner
          slug={studio.slug}
          planApiBase={planApiBase}
          backHref={`/${studio.slug}/projects-list/${segments[1]}`}
          backLabel="Project"
          printHref={`${planHref}/print`}
        />
      </LiveProvider>
    );
  }

  // THE PLANNER APP — /<slug>/operations-planner is the full-screen list of every
  // plan; /<slug>/operations-planner/<planId> is one plan, editable by anyone who
  // holds the planner's edit right. It is a grantable sub-section of its own, so
  // the gate is that section's visibility (operations.planner.view); its own APIs
  // re-check. A refusal falls through to the shell's "nothing granted" below.
  if (requested === "operations-planner" && sections.some((s) => s.key === "operations-planner")) {
    // A WBS TEMPLATE, edited in the planner — /operations-planner/templates/<id>.
    // It IS the planner, pointed at the template document instead of a plan.
    if (segments[1] === "templates" && segments[2]) {
      return (
        <LiveProvider slug={studio.slug}>
          <StudioPlanner
            slug={studio.slug}
            planApiBase={`/api/studios/${studio.slug}/operations/planner/templates/${segments[2]}`}
            backHref={`/${studio.slug}/operations-planner`}
            backLabel="Planner"
          />
        </LiveProvider>
      );
    }
    const planId = segments[1] || "";
    const planApiBase = `/api/studios/${studio.slug}/operations/planner/${planId}`;
    const planHref = `/${studio.slug}/operations-planner/${planId}`;
    // /operations-planner/<planId>/print is the printable page of that plan.
    if (planId && segments[2] === "print") {
      return (
        <LiveProvider slug={studio.slug}>
          <StudioPlannerPrint slug={studio.slug} planApiBase={planApiBase} backHref={planHref} />
        </LiveProvider>
      );
    }
    return (
      <LiveProvider slug={studio.slug}>
        {planId
          ? <StudioPlanner
              slug={studio.slug}
              planApiBase={planApiBase}
              backHref={`/${studio.slug}/operations-planner`}
              backLabel="Planner"
              printHref={`${planHref}/print`}
            />
          : <StudioPlannerList slug={studio.slug} />}
      </LiveProvider>
    );
  }

  // A second segment on a sales-tickets URL names ONE ticket: /<slug>/
  // sales-tickets/<id> is that ticket's own page. It still resolves through
  // the sales-tickets section, so the same grant governs it.
  const ticketId = requested === "sales-tickets" ? (segments[1] || "") : "";
  // And a THIRD segment names one of that ticket's quotations:
  // /<slug>/sales-tickets/<id>/quotations/<quotationId> is the Sales-side
  // viewer — the document as Sales reads it, view only. It hangs off the ticket
  // rather than living under Technical because that is whose record it is about,
  // and it resolves through the same sales-tickets grant as the page above it.
  const quotationId = ticketId && segments[2] === "quotations" ? (segments[3] || "") : "";

  // THE SAME SHAPE FOR PROJECTS. /<slug>/projects-list/<id> is one project's own
  // page, resolving through the projects-list section so the same grant governs
  // it — a project is one row of a list, exactly as a ticket is.
  const projectId = requested === "projects-list" ? (segments[1] || "") : "";
  // And a THIRD segment opens that project's own QUOTATION VIEWER:
  // /<slug>/projects-list/<id>/quotation is the Projects version — the
  // quotation's rows without prices, with the columns Projects owns.
  const projectQuotation = projectId && segments[2] === "quotation";

  // PROJECT SHEETS ARE INVENTORY'S, and the sub-section IS the workspace:
  // /<slug>/inventory-sheets opens it empty, and /<slug>/inventory-sheets/<id>
  // opens it with that sheet in the work portion. Both render the same screen —
  // the bar along the bottom never goes away, because it is how you get from
  // one project to the next.
  const isSheets = requested === "inventory-sheets";
  const sheetId = isSheets ? (segments[1] || "") : "";

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
    // THE TENANT'S LANGUAGE, not the visitor's and not the URL's — a studio's
    // address is its slug, so there is nowhere in it to put a locale. See
    // studioLocale in shared/i18n for why it is one setting per company.
    locale: studioLocale(studio),
    // The studio's dashboard entitlement, resolved once here (the shell already
    // reads the plan for the package/tier tags), so dashboards can gate paid
    // components without a per-request read that would add a Redis hop. The tier
    // sells dashboards by selection — a master switch and a per-component list —
    // so the three fields ride down and the client resolves the visible set.
    analytics: {
      analyticsEnabled: plan.analyticsEnabled,
      dashboardWidgets: plan.dashboardWidgets,
      analyticsLevel: plan.analyticsLevel,
    },
    // Whether this studio's package includes Nova — the shell shows the assistant
    // launcher only when it does. The endpoint re-checks this, so the flag is a
    // convenience for the UI, not the gate.
    novaEnabled: plan.novaEnabled,
  };

  return (
    <StudioFrame {...frameProps}>
      {isPeople ? <StudioPeople slug={studio.slug} canAdminister={admin} myCollaboratorId={collaborator.id} />
        : isAccess ? (
          /* The per-person section grid is gone. It wrote grants, and nothing
             reads grants any more — it would have saved successfully and
             changed nothing, which is worse than a screen that refuses. Access
             is now a role here and an assignment on People. */
          <StudioRoles slug={studio.slug} />
        )
        : isSettings ? <StudioSettings slug={studio.slug} />
        : deniedSection ? <NoSectionAccess />
        : quotationId ? <SalesQuotationViewer slug={studio.slug} ticketId={ticketId} quotationId={quotationId} />
        : ticketId ? <StudioTicketProfile slug={studio.slug} ticketId={ticketId} />
        : isSheets ? <StudioSheetViewer slug={studio.slug} sheetId={sheetId} perspective="inventory" />
        : projectQuotation ? <StudioSheetViewer slug={studio.slug} projectId={projectId} perspective="projects" />
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
            canManage={sectionManageable(access, active.key, sections.map((x) => x.key))} />
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
