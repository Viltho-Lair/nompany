// IMPORTED UNDER ANOTHER NAME, because this file also has to export the route
// segment config `export const dynamic = "force-dynamic"` — and "the name
// `dynamic` is defined multiple times" is a build error, not a shadowing
// warning. Any App Router page that both force-dynamics and code-splits hits
// this, and the fix is the import, never the export: renaming the config would
// silently make the studio statically rendered.
import nextDynamic from "next/dynamic";
import { cookies, headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { currentUser, needsQuestionnaire } from "@/platform/auth/identity";
import { studioContext, canAdminister, visibleSections, recordStudioVisit } from "@/lib/studios";
import { can, NO_SCREEN_YET } from "@/platform/access";
import { withRequest } from "@/platform/http/observability";
import { getProfile } from "@/platform/auth/users";
import { loadCatalogues, planOf, hasLiveChat } from "@/lib/plans";
import { chatDisplayName } from "@/lib/chatConstants";
import { studioLocale, preferredLocale, dirFor, UI_LANG_COOKIE } from "@/shared/i18n";
import { shellDict } from "@/shared/studio/shell";
import { sectionName } from "@/shared/studio/sections";
import { StudioLocaleProvider } from "@/components/studio2/locale";
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
const StudioEngagements = nextDynamic(
  () => import("@/components/studio2/StudioEngagements"),
  { loading: () => <ScreenSkeleton /> },
);

export const dynamic = "force-dynamic";
export const metadata = { title: "Studio", robots: { index: false, follow: false } };

// THE PAGE GETS THE SAME SCOPE EVERY API ROUTE ALREADY HAD.
//
// `withRequest` establishes the request cache, the command counter and the
// completion line. Until now the ONLY thing that called it was the route
// wrapper (platform/http/route.ts), so all 96 API routes were de-duplicated and
// measured and the single most-rendered surface in the product — this page, on
// every section click — was neither.
//
// The de-duplication is the half with a number on it. `withRequestCache` holds
// PROMISES, so two reads of one key inside a `Promise.all` collapse into one
// command rather than two (see requestCache.ts), which is precisely the shape
// this render has: the shell's reads and the screen's reads overlap and neither
// side knows the other ran.
//
// The counting is the half that keeps it fixed. Invariant: a route regressing
// from 2 round trips to 8 fails the build — a ceiling this page could not have
// been held to, because nothing was counting it. Now the completion line reports
// `pgQueries` for a section click the same way it does for /api/…, so the next
// duplicate read is visible the day it lands instead of the day somebody
// profiles the studio again.
export default async function StudioPage({ params }) {
  return withRequest("studio-page", () => renderStudio(params));
}

// THE STUDIO. Served at the tenant's own address — www.nompany.com/<slug> — via
// the proxy rewrite; this internal folder name never appears in the browser.
//
// Tenancy is SLUG-DRIVEN: the URL names the tenant (x-studio-slug, set by the
// proxy) and MEMBERSHIP authorises it. Section access is then filtered per
// person, default-deny, so a member only ever sees what they were granted.
async function renderStudio(params) {
  const slug = (await headers()).get("x-studio-slug") || "";
  // READ ONCE. The screens that fire before a studio is resolved — you are
  // not a member of this one — still have to be in the reader's language,
  // and they have no tenant default to fall back to. Everything below that
  // does have one reuses this value rather than reading the jar again.
  const uiLang = (await cookies()).get(UI_LANG_COOKIE)?.value;
  if (!slug) notFound();

  const user = await currentUser();
  // BOTH DESTINATIONS ARE LOCALE-ADDRESSED and both were pinned to /en, so an
  // Arabic reader bounced out of a studio landed on an English login and an
  // English survey. There is no studio record to consult on either path — the
  // person is not signed in, or has not finished registering — so the cookie is
  // the only thing that knows, and it is exactly what it is for.
  if (!user) redirect(`/${preferredLocale(uiLang)}/login`);
  // Same gate as the account hub, checked BEFORE membership: someone who has
  // not answered the survey has no business inside a studio either, and this
  // way the studio's own 404-for-non-members never fires first and hides why.
  if (await needsQuestionnaire(user.id)) redirect(`/${preferredLocale(uiLang)}/questionnaire`);

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
    if (context.error === "forbidden") return <NotAMember slug={slug} locale={preferredLocale(uiLang)} />;
    notFound();
  }

  // `access` comes from studioContext; dropping it here is what silently
  // disarms every check downstream.
  //
  // AND SO DO THE SECTIONS. studioContext reads them in the same wave as the
  // collaborator and the roles, and returns them for its callers — `access`
  // itself is resolved from the roles and does not consult them. This
  // destructure used to stop at `access`, and the wave below then called
  // `listSections(studio.id)` a second time for the identical rows: one
  // guaranteed extra round trip on every section click, and under
  // PG_TRANSPORT=gateway a round trip is a whole HTTPS call to Cloud Run,
  // because the gateway sends one statement per call and never batches.
  const { studio, collaborator, access, sections: allSections } = context;

  // WHICH LANGUAGE THIS PERSON READS THE SHELL IN — resolved here, as soon as
  // the studio record exists, because the full-screen screens below return
  // before the shell is ever built and they need it too.
  //
  // The studio's own setting is the default — what the company was set up in —
  // and a cookie the person set from the header menu overrides it. Resolved on
  // the server so `lang`/`dir` and the dictionaries all ship in the first byte
  // of HTML: a shell that mirrored itself after paint would flash the whole
  // layout the wrong way round on every load.
  //
  // Costs no Redis hop: the studio record is already in hand and the cookie
  // rode in on the request. See preferredLocale in shared/locale for why this
  // is a cookie and not a field on the collaborator.
  const locale = preferredLocale(uiLang, studioLocale(studio));

  // Tally the visit so the account overview can rank studios by how much this
  // person actually uses them. Fire-and-forget: ranking is a convenience, and a
  // failed tally must never cost the page a render or a millisecond of latency.
  recordStudioVisit(user.id, studio.id).catch(() => {});

  const admin = canAdminister(access);
  const [catalogues, profile] = await Promise.all([
    loadCatalogues(), getProfile(user.id),
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
    return (
      <FullScreen locale={locale}>
        <StudioDocs studio={{ name: studio.name, slug: studio.slug }} locale={locale} />
      </FullScreen>
    );
  }

  // Sales Live view is full-screen too, so it also returns before the shell.
  // It needs the Sales grant, which its own API call re-checks server-side.
  //
  // Each carries its OWN LiveProvider. StudioFrame normally supplies it, and
  // these two deliberately render outside the shell — so without this they
  // would be the only boards in the studio with no live connection, which on a
  // screen literally called "Live view" is the worst possible place for it.
  if (requested === "crm-sales-live") {
    return (
      <FullScreen locale={locale}>
        <LiveProvider slug={studio.slug}>
          <StudioSalesLive studio={{ name: studio.name, slug: studio.slug }} />
        </LiveProvider>
      </FullScreen>
    );
  }
  if (requested === "engineering-docs-live") {
    return (
      <FullScreen locale={locale}>
        <LiveProvider slug={studio.slug}>
          <StudioTechnicalLive studio={{ name: studio.name, slug: studio.slug }} />
        </LiveProvider>
      </FullScreen>
    );
  }

  // ENGAGEMENTS IS NOT A SECTION, deliberately. Making it one would give Main a
  // child, and sectionViewable's "a heading with neither areas nor children has
  // nothing to protect" fallthrough is the only reason Main is visible to every
  // member — a child would gate the parent and hide Main from everybody without
  // the engagements right. So it rides its own key, checked here, the same way
  // documentation and the two Live views do (design §3).
  if (requested === "engagements") {
    if (!can(access, "engagements.view")) notFound();
    return (
      <FullScreen locale={locale}>
      <LiveProvider slug={studio.slug}>
        {/* THE TWO ACTION RIGHTS ARE RESOLVED HERE, once, and handed down as
            flags — the same way canSeeEngagements and the Documents screen's
            canCreate/canDelete are (invariant 3: no client re-derives access).
            They are separate keys on purpose: being able to delete a deal must
            not by itself confer the power to take the safety off it, so a
            reader can legitimately hold one and not the other, and the screen
            has to be able to draw that. The server checks both again — these
            flags only decide whether a control is offered. */}
        <StudioEngagements
          slug={studio.slug}
          canLock={can(access, "engagements.lock")}
          canDelete={can(access, "engagements.delete")}
        />
      </LiveProvider>
      </FullScreen>
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
  if (requested === "engineering-docs-register" && sections.some((s) => s.key === "engineering-docs-register")) {
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
      return (
        <FullScreen locale={locale}>
          <DocumentView studio={shell} documentId={segments[1]} />
        </FullScreen>
      );
    }

    return (
      <FullScreen locale={locale}>
        <DocumentList
          studio={shell}
          canCreate={can(access, "engineeringDocs.register.create")}
          canDelete={can(access, "engineeringDocs.register.delete")}
        />
      </FullScreen>
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
      <FullScreen locale={locale}>
        <LiveProvider slug={studio.slug}>
          <StudioProjectBoard slug={studio.slug} projectId={segments[1]} />
        </LiveProvider>
      </FullScreen>
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
    return (
      <FullScreen locale={locale}>
        <LiveProvider slug={studio.slug}>
          <StudioPlanner
            planApiBase={planApiBase}
            backHref={`/${studio.slug}/projects-list/${segments[1]}`}
            backLabel={shellDict(locale).backToProject}
          />
        </LiveProvider>
      </FullScreen>
    );
  }

  // THE PLANNER APP — /<slug>/projects-planner is the full-screen list of every
  // plan; /<slug>/projects-planner/<planId> is one plan, editable by anyone who
  // holds the planner's edit right. It is a grantable sub-section of its own, so
  // the gate is that section's visibility (operations.planner.view); its own APIs
  // re-check. A refusal falls through to the shell's "nothing granted" below.
  if (requested === "projects-planner" && sections.some((s) => s.key === "projects-planner")) {
    // A WBS TEMPLATE, edited in the planner — /projects-planner/templates/<id>.
    // It IS the planner, pointed at the template document instead of a plan.
    if (segments[1] === "templates" && segments[2]) {
      return (
        <FullScreen locale={locale}>
          <LiveProvider slug={studio.slug}>
            <StudioPlanner
              planApiBase={`/api/studios/${studio.slug}/operations/planner/templates/${segments[2]}`}
              backHref={`/${studio.slug}/projects-planner`}
              backLabel={shellDict(locale).backToPlanner}
            />
          </LiveProvider>
        </FullScreen>
      );
    }
    const planId = segments[1] || "";
    const planApiBase = `/api/studios/${studio.slug}/operations/planner/${planId}`;
    return (
      <FullScreen locale={locale}>
        <LiveProvider slug={studio.slug}>
          {planId
            ? <StudioPlanner
                planApiBase={planApiBase}
                backHref={`/${studio.slug}/projects-planner`}
                backLabel={shellDict(locale).backToPlanner}
              />
            : <StudioPlannerList slug={studio.slug} />}
        </LiveProvider>
      </FullScreen>
    );
  }

  // A second segment on a crm-sales-tickets URL names ONE ticket: /<slug>/
  // crm-sales-tickets/<id> is that ticket's own page. It still resolves through
  // the crm-sales-tickets section, so the same grant governs it.
  const ticketId = requested === "crm-sales-tickets" ? (segments[1] || "") : "";
  // And a THIRD segment names one of that ticket's quotations:
  // /<slug>/crm-sales-tickets/<id>/quotations/<quotationId> is the Sales-side
  // viewer — the document as Sales reads it, view only. It hangs off the ticket
  // rather than living under Technical because that is whose record it is about,
  // and it resolves through the same crm-sales-tickets grant as the page above it.
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
  // Keyed "administration-settings", not bare "settings": that is the real
  // catalog key SECTION_DEFS gives the Administration & Settings section's own
  // Studio settings child (keys.ts). Reusing that exact key costs nothing —
  // this branch short-circuits BEFORE the `sections.find` lookup below ever
  // runs, so there is no risk of this special-cased screen and a real section
  // row resolving the same request two different ways. Formerly this was a
  // deliberately DISTINCT key (`studio-settings`, before this restructure gave
  // Administration & Settings a real "administration-settings" child of its
  // own) so this screen could never be shadowed by a catalog key of the same
  // name — that concern is moot now that the catalog key IS this screen.
  const isSettings = requested === "administration-settings";

  // Admin-only screens.
  if (isAccess && !admin) {
    return (
      <Denied studio={studio} sections={sections} me={collaborator} admin={admin}
        canSeeEngagements={can(access, "engagements.view")} locale={locale} />
    );
  }

  const active = isPeople || isAccess || isSettings ? null : (sections.find((s) => s.key === requested) || sections[0] || null);
  // Asked for a real section they haven't been granted → say so rather than
  // silently showing something else.
  const deniedSection = !isPeople && !isAccess && !isSettings && requested && !sections.some((s) => s.key === requested)
    && allSections.some((s) => s.key === requested);
  // ONE OF THE ORDERING-ONLY ROOTS — NO_SCREEN_YET names eight keys (platform/
  // access/resolve.ts), but the four administration ones DO have real screens
  // reached elsewhere (see that constant's own comment); only a key OUTSIDE
  // that group has no screen ANYWHERE, for anyone. Filtered here rather than
  // hardcoding the other four keys a second time — fix round 1 imported
  // NO_SCREEN_YET for exactly this and then didn't use it, which is the
  // "two lists that must agree" drift this restructure keeps finding. Filtering
  // by the administration prefix, not by naming the four placeholders again,
  // also means a ninth placeholder added to NO_SCREEN_YET later gets this
  // copy automatically instead of needing a third list kept in step.
  //
  // "Ask an admin to grant it" is a false promise for these — there is no
  // permission behind the key to hold, admin included, confirmed in the
  // sandbox walk where even the studio's Owner sees this. A distinct message
  // says so instead of implying a grant would help.
  const notBuiltYet = deniedSection
    && NO_SCREEN_YET.includes(requested) && !requested.startsWith("administration");

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
    me: {
      alias: collaborator.alias || "", role: collaborator.role, canAdminister: admin,
      // Resolved once, here, the same way `admin` is — StudioFrame draws the
      // nav entry off this flag rather than re-deriving access itself.
      canSeeEngagements: can(access, "engagements.view"),
    },
    // parentId drives the expandable nav.
    sections: sections.map((s) => ({ id: s.id, key: s.key, name: s.name, enabled: s.enabled, parentId: s.parentId || null })),
    activeKey: isPeople ? "people" : isAccess ? "access" : isSettings ? "administration-settings" : (active?.key || ""),
    chat,
    // NOT THE URL'S — a studio's address is its slug, so there is nowhere in it
    // to put a locale. The tenant's setting, overridden by this person's own
    // choice; resolved above.
    locale,
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
        : isSettings ? <StudioSettings slug={studio.slug} locale={locale} />
        : deniedSection ? <NoSectionAccess locale={locale} notBuiltYet={notBuiltYet} />
        : quotationId ? <SalesQuotationViewer slug={studio.slug} ticketId={ticketId} quotationId={quotationId} />
        : ticketId ? <StudioTicketProfile slug={studio.slug} ticketId={ticketId} />
        : isSheets ? <StudioSheetViewer slug={studio.slug} sheetId={sheetId} perspective="inventory" />
        : projectQuotation ? <StudioSheetViewer slug={studio.slug} projectId={projectId} perspective="projects" />
        // CRM & SALES'S QUOTATIONS ARE STILL RENDERED BY TECHNICAL, by key
        // rather than by screenKey, same pattern and same reason as Procurement's
        // Suppliers and Logistics's Shipments below. Quotations moved to CRM &
        // Sales (SECTION_DEFS: "the offer is a sales act") but the screen that
        // builds and lists them — QuotationBuilder, NewQuotation — never moved;
        // it still lives in StudioTechnical.js, which already has a
        // `view === "crm-sales-quotations"` branch waiting (and
        // technicalContext already resolves it through the new section:
        // `sub: { quotations: "crm-sales-quotations" }` in technical.ts).
        // `crm-sales-quotations`'s PARENT is `crm-sales`, so `screenKey`
        // collapses to "crm-sales" and would otherwise hand this to
        // StudioSales, which has no such branch — a silent fall-through to
        // the CRM & Sales dashboard that left `crmSales.quotations.create`/
        // `.edit` as rights nothing could exercise (invariant 16). Checked
        // ahead of the `screenKey === "crm-sales"` case below for that reason.
        : active?.key === "crm-sales-quotations" ? (
          <StudioTechnical slug={studio.slug} view={active?.key}
            sectionNames={Object.fromEntries(sections.map((x) => [x.key, x.name]))} />
        )
        : screenKey === "crm-sales" ? <StudioSales slug={studio.slug} view={active?.key} />
        : screenKey === "engineering-docs" ? (
          // THE STUDIO'S OWN NAMES FOR ITS SECTIONS, so a quotation's origin tag
          // can say where it came from in the words this tenant uses rather than
          // the word the code was written with. Key → stored name, from the
          // sections this person may open; the screen falls back to its own
          // label for a section they cannot. Cheap enough to hand down as a
          // prop — the alternative was widening the technical payload for two
          // strings the page already holds.
          <StudioTechnical slug={studio.slug} view={active?.key}
            sectionNames={Object.fromEntries(sections.map((x) => [x.key, x.name]))} />
        )
        : screenKey === "projects" ? <StudioProjects slug={studio.slug} view={active?.key} />
        : screenKey === "hr" ? <StudioHr slug={studio.slug} view={active?.key} />
        // PROCUREMENT'S SUPPLIERS AND LOGISTICS'S SHIPMENTS ARE STILL RENDERED
        // HERE, by key rather than by screenKey. Both moved out of Inventory
        // (SECTION_DEFS: Suppliers to Procurement & Subcontracting, the AWB
        // screen to Logistics & Fleet) and inventoryContext's `sub` map
        // (inventory.ts) already resolves each through its OWN new section —
        // StudioInventory.js's `view === "procurement-suppliers"` / `"logistics-
        // shipments"` branches were already there, waiting to be reached, and
        // without this they fell through to the empty generic SectionDashboard:
        // a heading with no data and no error. `active?.key`, NOT screenKey —
        // screenKey collapses a child to the ROOT its parentId points at
        // ("procurement", "logistics"), and those two roots have no dashboard
        // of their own the way Inventory does, so their OWN root screen still
        // wants the generic SectionDashboard (a heading and its subsection
        // cards), not the whole Inventory dashboard wearing their name.
        : active?.key === "procurement-suppliers" || active?.key === "logistics-shipments"
          ? <StudioInventory slug={studio.slug} view={active?.key} />
        : screenKey === "inventory" ? <StudioInventory slug={studio.slug} view={active?.key} />
        : screenKey === "finance" ? <StudioFinance slug={studio.slug} view={active?.key} />
        : screenKey === "tasks" ? <StudioTasks slug={studio.slug} view={active?.key} />
        : screenKey === "field-service" ? <StudioOperations slug={studio.slug} view={active?.key} />
        : screenKey === "main" ? <StudioMain slug={studio.slug} />
        : active ? <SectionDashboard section={active} studio={studio} locale={locale}
            subsections={sections.filter((s) => s.parentId === active.id)} />
        : <NothingGranted admin={admin} slug={studio.slug} locale={locale} />}
    </StudioFrame>
  );
}

// EVERY section owns a dashboard, and this is the one for sections that have no
// module of their own yet — Main, and any section a studio appends later. It is
// deliberately empty of analytics: it exists so that clicking a section always
// lands somewhere that belongs to that SectionID rather than nowhere at all.
// Sub-sections, when the section has any, are the way onward from here.
// NO `canManage`, and it is not an oversight. One was computed and passed here
// on every render — `sectionManageable(access, active.key, sections.map(...))`,
// allocating an array to answer a question nothing asked — and destructured
// without ever being read. This dashboard draws a heading and read-only links
// to sub-sections; there is no control on it to gate. If one is ever added, the
// right comes back with it rather than waiting here for it.
function SectionDashboard({ section, studio, subsections = [], locale = "en" }) {
  return (
    <div className="rounded-geex border border-slate-200/70 bg-white p-8 dark:border-white/10 dark:bg-[#20202c]">
      <h2 className="font-display text-xl font-800 text-slate-900 dark:text-white">{sectionName(section.key, section.name, locale)}</h2>

      {subsections.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {subsections.map((s) => (
            <Link key={s.id} href={`/${studio.slug}/${s.key}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-500 dark:border-white/15 dark:bg-[#191921] dark:hover:border-brand-500/40">
              <p className="font-display text-sm font-700 text-slate-900 dark:text-white">{sectionName(s.key, s.name, locale)}</p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-400 dark:text-slate-500">{s.key}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// EVERY SCREEN THAT RENDERS OUTSIDE StudioFrame NEEDS THIS.
//
// The manual, the two live views, Engagements, Documents, the project board
// and the planner all return before the shell is built — they are full-screen
// by design. The shell is where `lang`/`dir` and the locale context normally
// come from, so without a wrapper each of them was a screen with no direction
// and no language: an Arabic reader got left-to-right layout and English
// chrome on six of the studio's screens, and the bug was invisible until you
// opened one.
//
// One component rather than six copies, so the seventh full-screen screen
// somebody adds inherits it by wrapping rather than by remembering.
function FullScreen({ locale, children }) {
  return (
    <div lang={locale} dir={dirFor(locale)} className="min-h-screen">
      <StudioLocaleProvider locale={locale}>{children}</StudioLocaleProvider>
    </div>
  );
}

function NoSectionAccess({ locale = "en", notBuiltYet = false }) {
  const t = shellDict(locale);
  return (
    <div className="rounded-geex border border-slate-200/70 bg-white p-8 text-center dark:border-white/10 dark:bg-[#20202c]">
      <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">
        {notBuiltYet ? t.sectionNotBuiltYet : t.noSectionAccess}
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {notBuiltYet ? t.sectionNotBuiltYetBody : t.noSectionAccessBody}
      </p>
    </div>
  );
}

function NothingGranted({ admin, slug, locale = "en" }) {
  const t = shellDict(locale);
  return (
    <div className="rounded-geex border border-slate-200/70 bg-white p-8 text-center dark:border-white/10 dark:bg-[#20202c]">
      <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{t.nothingGranted}</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.nothingGrantedBody}</p>
      {admin && (
        <Link href={`/${slug}/access`} className="mt-5 inline-block rounded-full bg-brand-700 px-5 py-2.5 font-display text-sm font-600 text-white hover:bg-brand-950">
          {t.openAccess}
        </Link>
      )}
    </div>
  );
}

function Denied({ studio, sections, me, admin, canSeeEngagements = false, locale = "en" }) {
  const t = shellDict(locale);
  return (
    <StudioFrame
      studio={{ name: studio.name, slug: studio.slug }}
      me={{ alias: me.alias || "", role: me.role, canAdminister: admin, canSeeEngagements }}
      sections={sections.map((s) => ({ id: s.id, key: s.key, name: s.name, enabled: s.enabled }))}
      activeKey=""
      locale={locale}
    >
      <div className="rounded-geex border border-slate-200/70 bg-white p-8 text-center dark:border-white/10 dark:bg-[#20202c]">
        <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{t.adminsOnly}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.deniedAccessBody}</p>
      </div>
    </StudioFrame>
  );
}

function NotAMember({ slug, locale = "en" }) {
  const t = shellDict(locale);
  return (
    /* THIS SCREEN CARRIES ITS OWN lang/dir. Everything else in the studio
       inherits them from StudioFrame, and this is the one screen that
       renders outside it — a non-member has no shell. Without them an
       Arabic reader got mirrored copy in a left-to-right box. */
    <main lang={locale} dir={dirFor(locale)} className="flex min-h-screen items-center justify-center bg-[var(--geex-page)] px-5">
      <div className="max-w-md rounded-geex border border-slate-200/70 bg-white p-8 text-center dark:border-white/10 dark:bg-[#20202c]">
        <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">{t.notAMember}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t.notAMemberBefore}<span className="font-mono">{slug}</span>{t.notAMemberAfter}
        </p>
        <Link href={`/${locale}/account`} className="mt-5 inline-block rounded-full bg-brand-600 px-5 py-2.5 font-display text-sm font-700 text-white hover:bg-brand-700">
          {t.backToAccount}
        </Link>
      </div>
    </main>
  );
}
