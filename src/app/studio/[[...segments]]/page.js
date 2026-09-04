// IMPORTED UNDER ANOTHER NAME, because this file also has to export the route
// segment config `export const dynamic = "force-dynamic"` — and "the name
// `dynamic` is defined multiple times" is a build error, not a shadowing
// warning. Any App Router page that both force-dynamics and code-splits hits
// this, and the fix is the import, never the export: renaming the config would
// silently make the studio statically rendered.
import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { can, NO_SCREEN_YET } from "@/platform/access";
import { withRequest } from "@/platform/http/observability";
import { requestedKey } from "@/shared/studioRoute";
import { shellDict } from "@/shared/studio/shell";
import { sectionName } from "@/shared/studio/sections";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { RecordSkeleton } from "@/components/studio2/RecordSkeleton";
import { studioRequest } from "../_shell";

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
// StudioFrame and LiveProvider are the LAYOUT's now and are not imported here
// at all — see layout.js. Every request renders both, so splitting them would
// buy a round trip and save nothing.
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
const StudioMasterData = nextDynamic(
  () => import("@/components/studio2/StudioMasterData"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioContracts = nextDynamic(
  () => import("@/components/studio2/StudioContracts"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioPipeline = nextDynamic(
  () => import("@/components/studio2/StudioPipeline"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioCustomer = nextDynamic(
  () => import("@/components/studio2/StudioCustomer"),
  // RecordSkeleton, not ScreenSkeleton: this is a record PROFILE, and a
  // department skeleton would reserve a chart where a document is coming,
  // which makes the arrival a jump.
  { loading: () => <RecordSkeleton /> },
);
const StudioSales = nextDynamic(
  () => import("@/components/studio2/StudioSales"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioTicketProfile = nextDynamic(
  () => import("@/components/studio2/StudioTicketProfile"),
  { loading: () => <ScreenSkeleton /> },
);
// THE PROJECT PROFILE IS THE KANBAN BOARD NOW. Full-screen, like the manual and
// the live views — which no longer means "rendered outside StudioFrame": the
// shell is a layout and wraps everything, so it recognises the address instead
// and draws no chrome (shared/studioRoute, isFullScreenPath). dnd-kit and the
// board store ride this chunk, fetched only when a project is opened.
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
  // RESOLVED ONCE FOR THE WHOLE REQUEST, by the same call the layout makes.
  // React's `cache` means the second caller pays nothing — see _shell.js for
  // why that mechanism and not the repo's own request cache, which cannot span
  // a layout and its page.
  //
  // Every refusal except one has already happened inside it, by throwing:
  // no slug 404s, no session and an unfinished questionnaire redirect. Those
  // end the render for the layout and this page alike, so there is no window
  // where one has refused and the other has not.
  const context = await studioRequest();

  // THE NON-MEMBER, WHICH RENDERS RATHER THAN THROWS (invariant 2). The layout
  // draws that screen and does not render `children`, so React never renders
  // this component and returning null costs nothing. It is checked anyway:
  // "the layout will not render me" is an assumption about the framework, and
  // the thing it would be guarding is a studio's contents leaking to somebody
  // who is not in it. Cheap insurance against a rendering-order change.
  if (context.error) return null;

  const { studio, collaborator, access, allSections, sections, locale, admin } = context;

  const { segments = [] } = await params;
  // THE SAME DERIVATION THE SHELL USES, from the other end of the same address.
  // This is `segments[0] || ""` and always was; it is imported rather than
  // written because the shell now has to answer the identical question from
  // `usePathname()` and two copies would be free to disagree.
  const requested = requestedKey(segments);

  // THE FULL-SCREEN SCREENS RETURN A BARE SCREEN, and the shell is what makes
  // that work now. They used to be wrapped here in `FullScreen` (for lang/dir
  // and the locale context) and most of them in a `LiveProvider` of their own,
  // because they rendered OUTSIDE StudioFrame and nothing else would have given
  // them either. They render INSIDE it now — a layout wraps everything below
  // it — and StudioFrame recognises a full-screen address through
  // shared/studioRoute and draws no chrome around them.
  //
  // So both wrappers are gone from every branch below, and the LiveProvider is
  // the one that MATTERS: kept, it would have nested a second EventSource
  // inside the shell's, one per tab, against a browser cap of six
  // (invariant 14). The shell's connection is the studio's only one again.
  //
  // The manual is available to every member regardless of section grants —
  // membership was established in _shell. Checked ahead of the section lookup,
  // so it wins over a section that happened to use the key.
  if (requested === "documentation") {
    return <StudioDocs studio={{ name: studio.name, slug: studio.slug }} locale={locale} />;
  }

  // The two Live views need their section's grant, which their own API calls
  // re-check server-side.
  if (requested === "crm-sales-live") {
    return <StudioSalesLive studio={{ name: studio.name, slug: studio.slug }} />;
  }
  if (requested === "engineering-docs-live") {
    return <StudioTechnicalLive studio={{ name: studio.name, slug: studio.slug }} />;
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
      /* THE TWO ACTION RIGHTS ARE RESOLVED HERE, once, and handed down as
         flags — the same way canSeeEngagements and the Documents screen's
         canCreate/canDelete are (invariant 3: no client re-derives access).
         They are separate keys on purpose: being able to delete a deal must
         not by itself confer the power to take the safety off it, so a
         reader can legitimately hold one and not the other, and the screen
         has to be able to draw that. The server checks both again — these
         flags only decide whether a control is offered. */
      <StudioEngagements
        slug={studio.slug}
        canLock={can(access, "engagements.lock")}
        canDelete={can(access, "engagements.delete")}
      />
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
    const studioProps = { name: studio.name, slug: studio.slug };
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
      return <DocumentView studio={studioProps} documentId={segments[1]} />;
    }

    return (
      <DocumentList
        studio={studioProps}
        canCreate={can(access, "engineeringDocs.register.create")}
        canDelete={can(access, "engineeringDocs.register.delete")}
      />
    );
  }

  // THE PROJECT PROFILE IS THE KANBAN BOARD, and the board is full-screen.
  // /<slug>/projects-list/<id> is one project's board; the /quotation sub-route
  // is left to the in-frame viewer below, so this deliberately does not catch
  // it — and `isFullScreenPath` makes the same exception, or the shell would
  // drop its chrome around a screen that wants it.
  //
  // It rides the projects-list grant: the section must be visible to this person
  // (its /board API re-checks server-side, and the write re-checks the edit
  // right). A refusal falls THROUGH to the framed screens below, which already
  // answer "not granted" — which is why the grant is part of the shell's
  // full-screen test too, rather than the path alone.
  if (
    requested === "projects-list" && segments[1] &&
    segments[2] !== "quotation" && segments[2] !== "plans" &&
    sections.some((s) => s.key === "projects-list")
  ) {
    return <StudioProjectBoard slug={studio.slug} projectId={segments[1]} />;
  }

  // A PROJECT'S PLAN — /<slug>/projects-list/<id>/plans/<planId>. The plan opens
  // full-screen in the planner, reached through the PROJECT'S grant, so no
  // Operations access is needed to see (or, for a project editor, work on) it.
  // Back goes to the project's board.
  if (
    requested === "projects-list" && segments[1] && segments[2] === "plans" && segments[3] &&
    sections.some((s) => s.key === "projects-list")
  ) {
    const planApiBase = `/api/studios/${studio.slug}/projects/${segments[1]}/plans/${segments[3]}`;
    return (
      <StudioPlanner
        slug={studio.slug}
        planApiBase={planApiBase}
        backHref={`/${studio.slug}/projects-list/${segments[1]}`}
        backLabel={shellDict(locale).backToProject}
      />
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
        <StudioPlanner
          slug={studio.slug}
          planApiBase={`/api/studios/${studio.slug}/operations/planner/templates/${segments[2]}`}
          backHref={`/${studio.slug}/projects-planner`}
          backLabel={shellDict(locale).backToPlanner}
        />
      );
    }
    const planId = segments[1] || "";
    const planApiBase = `/api/studios/${studio.slug}/operations/planner/${planId}`;
    return planId
      ? (
        <StudioPlanner
          slug={studio.slug}
          planApiBase={planApiBase}
          backHref={`/${studio.slug}/projects-planner`}
          backLabel={shellDict(locale).backToPlanner}
        />
      )
      : <StudioPlannerList slug={studio.slug} />;
  }

  // A second segment on a crm-sales-tickets URL names ONE ticket: /<slug>/
  // crm-sales-tickets/<id> is that ticket's own page. It still resolves through
  // the crm-sales-tickets section, so the same grant governs it.
  const ticketId = requested === "crm-sales-tickets" ? (segments[1] || "") : "";

  // AND A SECOND SEGMENT ON crm-sales-clients NAMES ONE CUSTOMER. The same
  // shape as the ticket above, and it resolves through the same
  // crm-sales-clients section, so `crmSales.clients.view` governs the page
  // exactly as it governs the list. What the page then SHOWS is gated block by
  // block by the rights over those records — see modules/sales/customer.ts.
  const customerId = requested === "crm-sales-clients" ? (segments[1] || "") : "";
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

  // NO SPECIAL CASES LEFT. People, Access and Studio settings were matched by
  // literal key here and resolved to `active = null`, which is what let them
  // render while their sections were invisible. They are ordinary sections
  // now, so they resolve through the same lookup as everything else — and the
  // admin-only branch that used to guard Access goes with them, because
  // `administration.access.view` answers that question and `deniedSection`
  // below is what says no.
  const active = sections.find((s) => s.key === requested) || sections[0] || null;
  // Asked for a real section they haven't been granted → say so rather than
  // silently showing something else.
  const deniedSection = requested && !sections.some((s) => s.key === requested)
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
  // THE ADMINISTRATION FILTER IS GONE. It excluded the whole prefix because
  // four administration keys were in NO_SCREEN_YET while having real screens
  // reached elsewhere. Three of them are ordinary sections now, and the one
  // still listed — `administration-master` — genuinely has no screen anywhere,
  // so it wants exactly the message this flag produces. Keeping the filter
  // would have told somebody asking for Master data to go and ask an admin for
  // a grant that does not exist.
  const notBuiltYet = deniedSection && NO_SCREEN_YET.includes(requested);

  // Which component to render: a sub-section resolves to its parent's module.
  // The module then decides the screen from the ACTIVE key — Sales does this
  // properly (dashboard / tickets / clients / settings), while the not-yet-
  // ported modules ignore it and show their single combined screen.
  const screenKey = active?.parentId
    ? (allSections.find((s) => s.id === active.parentId)?.key || active.key)
    : active?.key;

  // NO frameProps, AND NO StudioFrame AROUND WHAT FOLLOWS.
  //
  // The shell is the layout's now, so everything that used to be assembled
  // here for it — the studio's name and plan tags, the person's alias and
  // role, the visible sections, the chat allowance, the analytics
  // entitlement — is resolved once per REQUEST rather than once per screen,
  // and is not re-sent in the RSC payload of every navigation.
  //
  // `activeKey` went with it and did not move: the shell derives it from
  // `usePathname()`, because a layout is never handed the route's segments.
  return (
    <>
      {/* ADMINISTRATION'S THREE SCREENS, matched by `active?.key` like
          Procurement's Suppliers and Logistics's Shipments below — and for the
          same reason: `screenKey` collapses a child onto the root its parentId
          names, and `administration` has no dashboard of its own to collapse
          onto. They were literal `requested ===` matches until the fold, which
          is what let them render while their sections were invisible. */}
      {active?.key === "administration-members"
        ? <StudioPeople slug={studio.slug} canAdminister={admin} myCollaboratorId={collaborator.id} />
        : active?.key === "administration-access" ? (
          /* The per-person section grid is gone. It wrote grants, and nothing
             reads grants any more — it would have saved successfully and
             changed nothing, which is worse than a screen that refuses. Access
             is now a role here and an assignment on People. */
          <StudioRoles slug={studio.slug} />
        )
        : active?.key === "administration-master" ? <StudioMasterData slug={studio.slug} />
        : active?.key === "administration-settings" ? <StudioSettings slug={studio.slug} locale={locale} />
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
        // BOTH OF THESE SIT AHEAD OF THE `screenKey === "crm-sales"` CASE for the
        // reason the note above gives about quotations: their PARENT is
        // `crm-sales`, so screenKey collapses and StudioSales — which has no
        // branch for either — would quietly render the department dashboard
        // instead. A section that silently renders the wrong screen is how a
        // right ends up exercising nothing (invariant 16).
        : customerId ? <StudioCustomer slug={studio.slug} clientId={customerId} />
        : active?.key === "crm-sales-pipeline" ? <StudioPipeline slug={studio.slug} />
        : active?.key === "crm-sales-contracts" ? <StudioContracts slug={studio.slug} />
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
    </>
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

// `Denied` IS DELETED. It said "admins only" and had exactly one caller: the
// branch that refused Access to a non-admin, back when the screen was gated on
// canAdminister rather than on a right. Access is a section with an area now,
// so refusing it is `deniedSection` — the same refusal every other section
// gives, in the same words, which is the point of it being a section.
//
// Its `adminsOnly` / `deniedAccessBody` strings stay in the shell dictionary
// for now rather than being removed in the same commit: this file was their
// only reader, but proving that across two languages and the whole dictionary
// is a separate sweep from moving a screen between routes.

