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
import { requestedKey, SETTINGS_KEY } from "@/shared/studioRoute";
import { isSystemSection } from "@/platform/db/keys";
import { shellDict } from "@/shared/studio/shell";
import { sectionName } from "@/shared/studio/sections";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { RecordSkeleton } from "@/components/studio2/RecordSkeleton";
import { studioRequest } from "../_shell";
// THE FIRST SCREEN THAT COMPOSES ITS OWN PAYLOAD HERE rather than letting the
// browser fetch it. Server-only, all three: the module resolves a context and
// reads rows, the ceiling is consulted before anything is handed down, and `log`
// records the one case where it is not. See the design in
// docs/superpowers/specs/2026-09-06-server-rendered-first-payload-design.md.
import { tenderingContext, tendersView } from "@/modules/tendering/tenders";
import { fitsInRscPayload } from "@/shared/rscPayload";
import { log } from "@/platform/http/observability";
// THE REST OF THE SCREENS' FIRST PAYLOADS COME FROM THEIR OWN ROUTES — the very
// GET the screen would have fetched, answered inside this render through
// `firstPayload` (platform/http/route.ts says why the route and not a view
// function). One import per converted screen, named for the screen it feeds.
import { GET as mainRoute } from "@/app/api/studios/[slug]/main/route";
import { GET as salesRoute } from "@/app/api/studios/[slug]/sales/route";
import { GET as pipelineRoute } from "@/app/api/studios/[slug]/sales/pipeline/route";
import { GET as insightsRoute } from "@/app/api/studios/[slug]/sales/insights/route";
import { GET as salesOrdersRoute } from "@/app/api/studios/[slug]/sales/orders/route";
import { GET as contractsRoute } from "@/app/api/studios/[slug]/sales/contracts/route";
import { GET as changeOrdersRoute } from "@/app/api/studios/[slug]/sales/change-orders/route";
import { GET as customerRoute } from "@/app/api/studios/[slug]/sales/customer/route";
import { GET as salesQuotationRoute } from "@/app/api/studios/[slug]/sales/quotations/route";
import { GET as technicalRoute } from "@/app/api/studios/[slug]/technical/route";
import { GET as engagementsRoute } from "@/app/api/studios/[slug]/main/engagements/route";
import { GET as permitsRoute } from "@/app/api/studios/[slug]/quality/permits/route";
import { GET as ratesRoute } from "@/app/api/studios/[slug]/tendering/rates/route";
import { GET as productionRoute } from "@/app/api/studios/[slug]/manufacturing/planning/route";
import { GET as posSettingsRoute } from "@/app/api/studios/[slug]/pos/settings/route";
import { GET as posReturnsRoute } from "@/app/api/studios/[slug]/pos/returns/route";
import { GET as posPromotionsRoute } from "@/app/api/studios/[slug]/pos/promotions/route";
import { GET as allocationsRoute } from "@/app/api/studios/[slug]/assets/allocations/route";
import { GET as engineeringDashboardRoute } from "@/app/api/studios/[slug]/engineering/dashboard/route";
import { GET as sectionSummaryRoute } from "@/app/api/studios/[slug]/records/summary/route";
import { GET as safetyRoute } from "@/app/api/studios/[slug]/quality/safety/route";
import { GET as landedCostRoute } from "@/app/api/studios/[slug]/logistics/landed-cost/route";
import { GET as recordsRoute } from "@/app/api/studios/[slug]/records/[typeKey]/route";
import { GET as boqRoute } from "@/app/api/studios/[slug]/tendering/boq/route";
import { GET as plannerListRoute } from "@/app/api/studios/[slug]/operations/planner/route";
import { GET as qualityDocsRoute } from "@/app/api/studios/[slug]/quality/docs/route";
import { GET as inventoryRoute } from "@/app/api/studios/[slug]/inventory/route";
import { GET as collaboratorsRoute } from "@/app/api/studios/[slug]/collaborators/route";
import { GET as rolesRoute } from "@/app/api/studios/[slug]/roles/route";
import { GET as studioSettingsRoute } from "@/app/api/studios/[slug]/settings/route";
import { GET as hrRoute } from "@/app/api/studios/[slug]/hr/route";
import { GET as projectsRoute } from "@/app/api/studios/[slug]/projects/route";
import { GET as resourceLoadRoute } from "@/app/api/studios/[slug]/operations/planner/resources/route";
import { GET as approvalsRoute } from "@/app/api/studios/[slug]/approvals/route";
import { GET as approvalsSettingsRoute } from "@/app/api/studios/[slug]/approvals/settings/route";
import { GET as operationsRoute } from "@/app/api/studios/[slug]/operations/route";
import { GET as scheduleRoute } from "@/app/api/studios/[slug]/operations/schedule/route";
import { GET as financeRoute } from "@/app/api/studios/[slug]/finance/route";
import { GET as billsRoute } from "@/app/api/studios/[slug]/finance/bills/route";
import { GET as fixedAssetsRoute } from "@/app/api/studios/[slug]/finance/assets/route";
import { GET as ledgerRoute } from "@/app/api/studios/[slug]/finance/ledger/route";
import { GET as financeSettingsRoute } from "@/app/api/studios/[slug]/finance/settings/route";
import { GET as treasuryRoute } from "@/app/api/studios/[slug]/finance/treasury/route";
import { GET as financeReportsRoute } from "@/app/api/studios/[slug]/finance/reports/route";
import { GET as budgetsRoute } from "@/app/api/studios/[slug]/finance/budgets/route";
import { GET as procurementDashboardRoute } from "@/app/api/studios/[slug]/procurement/dashboard/route";
import { GET as subcontractsRoute } from "@/app/api/studios/[slug]/procurement/subcontracts/route";
import { GET as suppliersRoute } from "@/app/api/studios/[slug]/procurement/suppliers/route";
import { GET as receivingRoute } from "@/app/api/studios/[slug]/procurement/receiving/route";
import { GET as expeditingRoute } from "@/app/api/studios/[slug]/procurement/expediting/route";
import { GET as procurementRfqRoute } from "@/app/api/studios/[slug]/procurement/rfq/route";
import { GET as requisitionsRoute } from "@/app/api/studios/[slug]/procurement/requisitions/route";
import { GET as purchaseOrdersRoute } from "@/app/api/studios/[slug]/inventory/orders/route";
import { GET as maintenanceDashboardRoute } from "@/app/api/studios/[slug]/maintenance/dashboard/route";
import { GET as workRequestsRoute } from "@/app/api/studios/[slug]/maintenance/requests/route";
import { GET as workOrdersRoute } from "@/app/api/studios/[slug]/maintenance/orders/route";
import { GET as pmPlansRoute } from "@/app/api/studios/[slug]/maintenance/plans/route";
import { GET as machinesRoute } from "@/app/api/studios/[slug]/maintenance/assets/route";
import { GET as serviceContractsRoute } from "@/app/api/studios/[slug]/maintenance/contracts/route";
import { GET as marketingDashboardRoute } from "@/app/api/studios/[slug]/marketing/dashboard/route";
import { GET as campaignsRoute } from "@/app/api/studios/[slug]/marketing/campaigns/route";
import { GET as marketingCalendarRoute } from "@/app/api/studios/[slug]/marketing/calendar/route";
import { GET as marketingPartnersRoute } from "@/app/api/studios/[slug]/marketing/partners/route";
import { GET as marketingContentRoute } from "@/app/api/studios/[slug]/marketing/assets/route";
import { GET as marketingEventsRoute } from "@/app/api/studios/[slug]/marketing/events/route";
import { GET as audiencesRoute } from "@/app/api/studios/[slug]/marketing/audiences/route";
import { GET as marketingBudgetRoute } from "@/app/api/studios/[slug]/marketing/budget/route";
import { GET as formsRoute } from "@/app/api/studios/[slug]/marketing/forms/route";

// THE DEPARTMENT SCREENS THAT DRAW A DIFFERENT SUB-SCREEN PER `view`, and
// the route each view reads first. A view absent here (Finance's tax screen
// reads two routes; Inventory's sheets are a screen of their own) fetches.
const VIEW_FIRST_PAYLOAD = {
  hr: () => [hrRoute, "hr"],
  // Every Projects view, a project's quotation sheet and Inventory's sheet
  // workspace all read the one projects list.
  projects: () => [projectsRoute, "projects"],
  inventory: () => [inventoryRoute, "inventory"],
  approvals: (view) => (view === "approvals-settings"
    ? [approvalsSettingsRoute, "approvals/settings"] : [approvalsRoute, "approvals"]),
  "field-service": (view) => (view === "field-service-schedule"
    ? [scheduleRoute, "operations/schedule"] : [operationsRoute, "operations"]),
  finance: (view) => ({
    "finance": [financeRoute, "finance"],
    "finance-receivables": [financeRoute, "finance"],
    "finance-payables": [billsRoute, "finance/bills"],
    "finance-assets": [fixedAssetsRoute, "finance/assets"],
    "finance-ledger": [ledgerRoute, "finance/ledger"],
    "finance-settings": [financeSettingsRoute, "finance/settings"],
    "finance-cash": [treasuryRoute, "finance/treasury"],
    "finance-reports": [financeReportsRoute, "finance/reports"],
    "finance-budgets": [budgetsRoute, "finance/budgets"],
  })[view || "finance"],
};

// THE SCREENS THE RENDER CHAIN PICKS BY `active?.key` ALONE — one screen per key,
// no second segment and no `view` — and the route each one reads first. Only a
// key whose branch below renders exactly that screen belongs here: the payload
// is handed to whichever screen the key draws, so a row naming the wrong route
// would give a screen another screen's body.
const KEYED_FIRST_PAYLOAD = {
  "administration-members": [collaboratorsRoute, "collaborators"],
  "administration-access": [rolesRoute, "roles"],
  // Master data's locations list is Field Operations' own body.
  "administration-master": [operationsRoute, "operations"],
  "administration-settings": [studioSettingsRoute, "settings"],
  "quality-hse-permits": [permitsRoute, "quality/permits"],
  "tendering-rates": [ratesRoute, "tendering/rates"],
  "manufacturing": [productionRoute, "manufacturing/planning"],
  "pos-settings": [posSettingsRoute, "pos/settings"],
  "pos-returns": [posReturnsRoute, "pos/returns"],
  "pos-promotions": [posPromotionsRoute, "pos/promotions"],
  "crm-sales-pipeline": [pipelineRoute, "sales/pipeline"],
  // THE DEFAULT CHOICES, spelled as the screen asks on mount: the handler reads
  // them, so a payload without them would be a different answer.
  "crm-sales-insights": [insightsRoute, "sales/insights?unit=month&measure=value&current=0"],
  "crm-sales-orders": [salesOrdersRoute, "sales/orders"],
  "procurement": [procurementDashboardRoute, "procurement/dashboard"],
  "procurement-subcontracts": [subcontractsRoute, "procurement/subcontracts"],
  "procurement-suppliers": [suppliersRoute, "procurement/suppliers"],
  "procurement-receiving": [receivingRoute, "procurement/receiving"],
  "procurement-expediting": [expeditingRoute, "procurement/expediting"],
  "procurement-rfq": [procurementRfqRoute, "procurement/rfq"],
  "procurement-requisitions": [requisitionsRoute, "procurement/requisitions"],
  "procurement-orders": [purchaseOrdersRoute, "inventory/orders"],
  "maintenance": [maintenanceDashboardRoute, "maintenance/dashboard"],
  "maintenance-requests": [workRequestsRoute, "maintenance/requests"],
  "maintenance-orders": [workOrdersRoute, "maintenance/orders"],
  "maintenance-plans": [pmPlansRoute, "maintenance/plans"],
  "maintenance-assets": [machinesRoute, "maintenance/assets"],
  "maintenance-contracts": [serviceContractsRoute, "maintenance/contracts"],
  "marketing": [marketingDashboardRoute, "marketing/dashboard"],
  "marketing-campaigns": [campaignsRoute, "marketing/campaigns"],
  "marketing-planning": [marketingCalendarRoute, "marketing/calendar?weeks=12"],
  "marketing-partners": [marketingPartnersRoute, "marketing/partners"],
  "marketing-content": [marketingContentRoute, "marketing/assets"],
  "marketing-events": [marketingEventsRoute, "marketing/events"],
  "marketing-audiences": [audiencesRoute, "marketing/audiences?q=&channel=&state="],
  "marketing-budget": [marketingBudgetRoute, "marketing/budget"],
  "marketing-forms": [formsRoute, "marketing/forms"],
};

// ONE SCREEN IS RENDERED PER REQUEST, SO ONE SCREEN IS DOWNLOADED.
//
// This page is the whole studio: the proxy rewrites /<slug>/… onto it and the
// switch at the bottom picks a department. Imported statically, all twenty-odd
// department components land in this route's client manifest — and this route
// is EVERY route a tenant has, so somebody who only ever opens Sales was paying
// for Projects, Inventory, Operations, HR, Finance, Approvals and the two viewers
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
// AND `dynamic()` HERE IS NOT ENOUGH, which took a measurement to see. In a
// Server Component it defers the SERVER render and nothing else: every client
// module on this route carries the same chunk list, so the browser fetches all
// of them whichever screen is named. The four heaviest — the document editor
// and the planner, together TipTap and MUI's date pickers — declare their split
// inside a client module instead, where `import()` survives to runtime.
// components/studio2/HeavyScreens holds the measurement and the reasoning.
//
// EVERY CLIENT SCREEN LIVES THERE NOW (26/09/2026), not just the four heaviest:
// measured, the thirty-four client screens that were still declared below had
// become ONE 302 KB chunk on every tenant page. What stays below is only the
// screens that are themselves Server Components — a client module cannot import
// one — and their own client children still ride this route's first load, so
// the next saving is inside those wrappers, not here.
import {
  DocumentList, DocumentView, DocumentPrint, StudioPlanner, StudioPlannerList, PlanPrint, StudioPos,
  PosDashboard, StudioPosSales, StudioPosShifts, StudioPosSettings, StudioPosReturns, StudioPosPromotions,
  StudioSectionSummary, StudioLandedCost, StudioSafety, StudioSalesLive, StudioTechnicalLive,
  StudioPeople, StudioRoles, StudioSettings, CustomerInsightsDashboard, StudioProjectHub,
  StudioMarketingCalendar, StudioMarketingPartners, StudioMarketingContent,
  StudioMarketingEvents, StudioAudiences, StudioMarketingBudget, StudioForms,
  StudioPurchaseOrders, StudioPermits, StudioPlantAllocation, StudioProduction, StudioSales,
  StudioTicketProfile, StudioSheetViewer, SalesQuotationViewer, StudioTechnical,
  StudioProjects, StudioHr, StudioInventory, StudioFinance, StudioApprovals,
  StudioOperations, StudioMain, StudioEngagements,
} from "@/components/studio2/HeavyScreens";

const StudioDocs = nextDynamic(() => import("@/components/studio2/StudioDocs"));
// A SERVER COMPONENT — no client state, and an export is a link rather than a
// fetch. It is still dynamic so the route does not carry it until reached.
const StudioReports = nextDynamic(() => import("@/components/studio2/StudioReports"));
const StudioMasterData = nextDynamic(
  () => import("@/components/studio2/StudioMasterData"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioContracts = nextDynamic(
  () => import("@/components/studio2/StudioContracts"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioOrders = nextDynamic(
  () => import("@/components/studio2/StudioOrders"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioResourceLoad = nextDynamic(
  () => import("@/components/studio2/StudioResourceLoad"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioPipeline = nextDynamic(
  () => import("@/components/studio2/StudioPipeline"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioSubcontracts = nextDynamic(
  () => import("@/components/studio2/StudioSubcontracts"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioSuppliers = nextDynamic(
  () => import("@/components/studio2/StudioSuppliers"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioReceiving = nextDynamic(
  () => import("@/components/studio2/StudioReceiving"),
  { loading: () => <ScreenSkeleton /> },
);
const ProcurementDashboard = nextDynamic(
  () => import("@/components/studio2/ProcurementDashboard"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioExpediting = nextDynamic(
  () => import("@/components/studio2/StudioExpediting"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioRfq = nextDynamic(
  () => import("@/components/studio2/StudioRfq"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioRequisitions = nextDynamic(
  () => import("@/components/studio2/StudioRequisitions"),
  { loading: () => <ScreenSkeleton /> },
);
// Maintenance — the fault reports and the work orders they become.
const StudioWorkRequests = nextDynamic(
  () => import("@/components/studio2/StudioWorkRequests"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioWorkOrders = nextDynamic(
  () => import("@/components/studio2/StudioWorkOrders"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioPmPlans = nextDynamic(
  () => import("@/components/studio2/StudioPmPlans"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioMachines = nextDynamic(
  () => import("@/components/studio2/StudioMachines"),
  { loading: () => <ScreenSkeleton /> },
);
// Service contracts (SLA) — the maintenance a studio sells.
const StudioServiceContracts = nextDynamic(
  () => import("@/components/studio2/StudioServiceContracts"),
  { loading: () => <ScreenSkeleton /> },
);
// The section's own summary, which is why `maintenance.dashboard.view` exists.
// ENGINEERING & DOCUMENTS' OWN DASHBOARD (13/09/2026), on the same terms as
// Maintenance's below.
const EngineeringDashboard = nextDynamic(
  () => import("@/components/studio2/EngineeringDashboard"),
);
const MaintenanceDashboard = nextDynamic(
  () => import("@/components/studio2/MaintenanceDashboard"),
  { loading: () => <ScreenSkeleton /> },
);
// MARKETING (19/09/2026) — its dashboard at the root, the campaign register
// beneath it.
const MarketingDashboard = nextDynamic(
  () => import("@/components/studio2/MarketingDashboard"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioCampaigns = nextDynamic(
  () => import("@/components/studio2/StudioCampaigns"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioFormEditor = nextDynamic(
  () => import("@/components/studio2/StudioFormEditor"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioRates = nextDynamic(
  () => import("@/components/studio2/StudioRates"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioBoq = nextDynamic(
  () => import("@/components/studio2/StudioBoq"),
  // A record page, so the record skeleton: a department skeleton would reserve
  // a chart where a priced table is coming.
  { loading: () => <RecordSkeleton /> },
);
const StudioTenders = nextDynamic(
  () => import("@/components/studio2/StudioTenders"),
  { loading: () => <ScreenSkeleton /> },
);
const StudioCustomer = nextDynamic(
  () => import("@/components/studio2/StudioCustomer"),
  // RecordSkeleton, not ScreenSkeleton: this is a record PROFILE, and a
  // department skeleton would reserve a chart where a document is coming,
  // which makes the arrival a jump.
  { loading: () => <RecordSkeleton /> },
);
// ONE COMPONENT FOR EVERY DECLARED RECORD TYPE, however many a studio declares.
// It is imported once here and pointed at a type key, not imported once per
// type — there is nothing to import per type, because a type is a row.
const StudioRecords = nextDynamic(
  () => import("@/components/studio2/StudioRecords"),
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

  // THE TWO LIVE VIEWS NEED THEIR OWN SECTION'S GRANT, asked HERE. This comment
  // used to say their API calls re-check it, and they do not: the Live view
  // reads `/sales` (and `/technical`), which answers anybody holding ANY view
  // right in the department — so a member granted Customers alone opened the
  // wall-screen ticket table by typing its address. `sections` is already
  // filtered to what this person may see and what the studio has switched on,
  // the till's test below; a refusal falls through to the shell's own
  // "not granted" answer rather than inventing a second one.
  if (requested === "crm-sales-live" && sections.some((s) => s.key === "crm-sales-live")) {
    return <StudioSalesLive studio={{ name: studio.name, slug: studio.slug }} />;
  }
  if (requested === "quotations-live" && sections.some((s) => s.key === "quotations-live")) {
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
    // The first page, no cursor — "load more" still asks the route itself.
    const engagementsInitial = await firstScreenPayload(engagementsRoute, studio.slug, "main/engagements");
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
        initial={engagementsInitial}
        canLock={can(access, "engagements.lock")}
        canDelete={can(access, "engagements.delete")}
      />
    );
  }

  // A CUSTOMER DOCUMENT, PRINTED THROUGH ITS LAYOUT: /print/<kind>/<id>. Not a
  // section, like Engagements: it rides the RECORD's right, which the print
  // route asks before it fills anything, so there is nothing to check here but
  // whether this reader may start a layout when the studio has none.
  if (requested === "print") {
    return (
      <DocumentPrint
        slug={studio.slug}
        kind={segments[1] || ""}
        recordId={segments[2] || ""}
        canCreateLayout={can(access, "engineeringDocs.register.create")}
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
  // THE TILL, full-screen (shared/studioRoute decides the chrome; this decides
  // the screen). Only for somebody who may open it — anybody else falls through
  // to the shell, which says the section is not granted. Every act inside is
  // asked for again by the service.
  // `crm-sales-pos` still reaches here: requestedKey maps the old address on.
  if (requested === "pos-till" && sections.some((s) => s.key === "pos-till") && can(access, "crmSales.pos.view")) {
    return <StudioPos slug={studio.slug} />;
  }

  // ONE FORM'S BUILDER, full-screen (20/09/2026) — `/marketing-forms/<id>`.
  // The list keeps the shell; the builder takes the window, the same split the
  // planner makes between its list and one plan. `shared/studioRoute` decides
  // the chrome from the same address, so the two cannot disagree about which
  // one this is.
  if (requested === "marketing-forms" && segments[1] && sections.some((s) => s.key === "marketing-forms")) {
    return <StudioFormEditor slug={studio.slug} formId={segments[1]} backHref={`/${studio.slug}/marketing-forms`} />;
  }

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
        initial={await firstScreenPayload(qualityDocsRoute, studio.slug, "quality/docs")}
        studio={studioProps}
        canCreate={can(access, "engineeringDocs.register.create")}
        canDelete={can(access, "engineeringDocs.register.delete")}
      />
    );
  }

  // ONE PROJECT'S PAGE IS THE HUB, and all six of its tabs are one screen —
  // /<slug>/projects-list/<id> (the Overview), and /overview, /board, /costs,
  // /billing, /reports and /closure after it. StudioProjectHub draws the bar
  // once and swaps the tabs itself, moving the address without a navigation,
  // so the server renders this branch only when one of these addresses is
  // loaded or linked to from elsewhere. Full-window, every tab
  // (shared/studioRoute).
  //
  // CHOSEN BY NAMING IT, NEVER BY EXCLUDING THE OTHERS. This used to be the
  // catch-all for every third segment not on a hand-typed list, so a segment
  // missing from the list silently rendered the board — `costs` did exactly
  // that until somebody opened it. A positive match cannot swallow anything;
  // tests/restructure.mjs refuses any negative match on the third segment in
  // this file (testNoProjectScreenIsACatchAll).
  //
  // It rides the projects-list grant: the section must be visible to this person
  // (every tab's API re-checks its own right server-side, and the hub draws only
  // the tabs /projects says this person may open). A refusal falls THROUGH to
  // the framed screens below, which already answer "not granted".
  if (
    requested === "projects-list" && segments[1] &&
    (!segments[2] || segments[2] === "overview" || segments[2] === "board" || segments[2] === "costs" ||
      segments[2] === "billing" || segments[2] === "reports" || segments[2] === "closure") &&
    sections.some((s) => s.key === "projects-list")
  ) {
    return (
      <StudioProjectHub slug={studio.slug} projectId={segments[1]}
        initial={await firstScreenPayload(projectsRoute, studio.slug, "projects")} />
    );
  }

  // A PROJECT'S PLAN — /<slug>/projects-list/<id>/plans/<planId>. The plan opens
  // full-screen in the planner, reached through the PROJECT'S grant, so no
  // Operations access is needed to see (or, for a project editor, work on) it.
  // Back goes to the project's board.
  //
  // EVERY PLAN DOOR HAS A /print BESIDE IT — the plan as a page (PlanPrint),
  // reading the same API the planner reads, so the same grant governs it. It is
  // matched by NAMING the segment, like the board above, never by exclusion.
  if (
    requested === "projects-list" && segments[1] && segments[2] === "plans" && segments[3] &&
    sections.some((s) => s.key === "projects-list")
  ) {
    const planApiBase = `/api/studios/${studio.slug}/projects/${segments[1]}/plans/${segments[3]}`;
    const planHref = `/${studio.slug}/projects-list/${segments[1]}/plans/${segments[3]}`;
    if (segments[4] === "print") return <PlanPrint planApiBase={planApiBase} />;
    return (
      <StudioPlanner
        slug={studio.slug}
        planApiBase={planApiBase}
        printHref={`${planHref}/print`}
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
      const templateApiBase = `/api/studios/${studio.slug}/operations/planner/templates/${segments[2]}`;
      if (segments[3] === "print") return <PlanPrint planApiBase={templateApiBase} />;
      return (
        <StudioPlanner
          slug={studio.slug}
          planApiBase={templateApiBase}
          printHref={`/${studio.slug}/projects-planner/templates/${segments[2]}/print`}
          backHref={`/${studio.slug}/projects-planner`}
          backLabel={shellDict(locale).backToPlanner}
        />
      );
    }
    // WHO IS COMMITTED, ACROSS EVERY PLAN — /projects-planner/resources. It sits
    // BEFORE the planId line below for the same reason `templates` does: after
    // it, "resources" is read as a plan id and the planner opens a document that
    // does not exist.
    if (segments[1] === "resources") {
      return (
        <StudioResourceLoad
          initial={await firstScreenPayload(resourceLoadRoute, studio.slug, "operations/planner/resources")}
          slug={studio.slug}
          backHref={`/${studio.slug}/projects-planner`}
        />
      );
    }
    const planId = segments[1] || "";
    const planApiBase = `/api/studios/${studio.slug}/operations/planner/${planId}`;
    if (planId && segments[2] === "print") return <PlanPrint planApiBase={planApiBase} />;
    return planId
      ? (
        <StudioPlanner
          slug={studio.slug}
          planApiBase={planApiBase}
          printHref={`/${studio.slug}/projects-planner/${planId}/print`}
          backHref={`/${studio.slug}/projects-planner`}
          backLabel={shellDict(locale).backToPlanner}
        />
      )
      : <StudioPlannerList slug={studio.slug} initial={await firstScreenPayload(plannerListRoute, studio.slug, "operations/planner")} />;
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

  // AND A SECOND SEGMENT ON tendering-register NAMES ONE TENDER'S BILL. The
  // same shape the ticket and the customer use, resolving through the same
  // section — a bill belongs to one tender and is reached from it, which is why
  // it has no nav row of its own.
  const boqTenderId = requested === "tendering-register" ? (segments[1] || "") : "";
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
  // THE PROJECT'S OWN PAGE AND ITS TABS are the hub, returned above before the
  // shell's screens are chosen (StudioProjectHub) — only the quotation viewer
  // is still one of the framed screens below.

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
  // THE SETTINGS SURFACE — Administration's four screens, off the section nav.
  //
  // `systemSections` is filtered by the SAME visibility every other row uses, so
  // the hub lists exactly what this person may open and nothing else. A member
  // holding none of the four gets the hub's own empty state rather than a 403:
  // the shell does not draw the gear for them at all, so arriving here means a
  // typed address, and "nothing here is yours" is the honest answer to that.
  const settingsHub = requested === SETTINGS_KEY;
  const systemSections = sections.filter((s) => isSystemSection(s.key));

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
  // reached elsewhere. All four are ordinary sections now: the last of them,
  // `administration-master`, left NO_SCREEN_YET when its screen shipped, and it
  // renders StudioMasterData a few lines below — Locations and Departments.
  // (This said the key was "still listed" and "genuinely has no screen
  // anywhere" long after both stopped being true, which is the drift the list
  // being read rather than restated is meant to prevent.) Nothing under
  // administration reaches this flag now; it is the four product sections that
  // still render nothing.
  const notBuiltYet = deniedSection && NO_SCREEN_YET.includes(requested);

  // Which component to render: a sub-section resolves to its parent's module.
  // The module then decides the screen from the ACTIVE key — Sales does this
  // properly (dashboard / tickets / clients / settings), while the not-yet-
  // ported modules ignore it and show their single combined screen.
  const screenKey = active?.parentId
    ? (allSections.find((s) => s.id === active.parentId)?.key || active.key)
    : active?.key;

  // THE TENDER REGISTER'S FIRST PAYLOAD, COMPOSED HERE RATHER THAN FETCHED BY THE
  // BROWSER. This is the whole of the change: the screen used to mount empty and
  // then ask an API route which re-resolved the user, the studio, the
  // collaborator, the roles and the sections from scratch — because a second HTTP
  // request cannot share a request cache with the first, and no mechanism can
  // make it. Two requests became one.
  //
  // INSIDE THIS RENDER, DELIBERATELY. `tenderingContext` resolves the studio
  // itself (moduleContext calls studioContext), and it is free HERE and nowhere
  // else: readArr and getIndex read through cachedRead, the map holds PROMISES so
  // even concurrent duplicates collapse, and withRequestCache is established by
  // the withRequest that wraps this render. Move this call outside that scope and
  // every one of those reads becomes a real round trip again — which would make
  // the page slower than the thing it replaced.
  //
  // ONLY THE REGISTER. `boqTenderId` means a second segment, which is the BOQ
  // grid rather than the list, and `deniedSection` means there is no screen to
  // hand a payload to.
  let tendersInitial;
  let tendersError = "";
  if (screenKey === "tendering" && !deniedSection && !boqTenderId) {
    const ctx = await tenderingContext(context.user, studio.slug);
    if (ctx.error) {
      // A REFUSAL IS A VALUE HERE, NOT A THROWN RESPONSE. Throwing would take the
      // whole screen down where the fetch path showed a message in place of the
      // list — a worse answer to the same fact.
      tendersError = String(ctx.error);
    } else {
      const payload = await tendersView(ctx);
      if (payload?.error) {
        tendersError = String(payload.error);
      } else if (fitsInRscPayload(payload)) {
        tendersInitial = payload;
      } else {
        // OVER THE CEILING: hand down nothing and let the screen fetch, exactly as
        // it did before this existed. Degrading rather than refusing — a studio
        // with five thousand tenders gets the old behaviour, not a broken screen.
        // LOGGED because a tenant permanently over the ceiling is permanently
        // paying the round trip, and nobody would otherwise ever find out.
        log.info("rsc payload over ceiling", { screen: "tendering", slug: studio.slug });
      }
    }
  }

  // EVERY OTHER CONVERTED SCREEN'S FIRST PAYLOAD, by the same argument as the
  // tender register's above and through one door (`firstScreenPayload`, below).
  //
  // EACH CONDITION MIRRORS THE BRANCH OF THE RENDER CHAIN THAT DRAWS THE SCREEN,
  // and getting one wrong is cheap in exactly one direction: a payload composed
  // for a screen that then does not render is a wasted read, and a screen whose
  // payload was not composed simply fetches as it always did. Nothing can hand a
  // screen another screen's data — each payload goes to the one component its
  // route belongs to.
  const framed = !settingsHub && !deniedSection;
  const salesView = framed && screenKey === "crm-sales" && !ticketId && !quotationId && !customerId
    && !["crm-sales-pipeline", "crm-sales-insights", "crm-sales-contracts", "crm-sales-orders"].includes(active?.key);
  // A keyed screen is never also Main or Sales, so at most one of these reads.
  const keyed = framed && !active?.key?.startsWith("engine-") ? KEYED_FIRST_PAYLOAD[active?.key] : null;
  // THE RECORD PAGES, which the chain picks by an id in the address rather than
  // by key. A ticket's own page reads the whole /sales list and finds itself in
  // it, which is why it shares the board's route. The quotation viewer outranks
  // the ticket it hangs off, exactly as the chain orders them.
  const ticketPage = framed && ticketId && !quotationId;
  const quotationPage = framed && quotationId;
  const customerPage = framed && customerId && !ticketId;
  const quotationsView = framed && screenKey === "quotations" && !active?.key?.startsWith("engine-");
  const contractsView = framed && active?.key === "crm-sales-contracts";
  const engineView = framed && active?.key?.startsWith("engine-");
  const boqPage = framed && boqTenderId && !engineView;
  // THE DASHBOARDS THAT CARRY A REGISTER SUMMARY BENEATH THEIR OWN SCREEN, and
  // the generic section dashboard two roots still fall through to. Their panels
  // are read beside the screen's payload, not after it.
  const summaryKey = framed && !engineView
    && ["assets", "engineering-docs", "quality-hse", "logistics"].includes(active?.key) ? active.key : "";
  const [mainInitial, salesInitial, keyedInitial, recordInitial, technicalInitial, contractsBody, changeOrdersBody] = await Promise.all([
    framed && screenKey === "main" ? firstScreenPayload(mainRoute, studio.slug, "main") : undefined,
    salesView || ticketPage ? firstScreenPayload(salesRoute, studio.slug, "sales") : undefined,
    keyed ? firstScreenPayload(keyed[0], studio.slug, keyed[1]) : undefined,
    quotationPage ? firstScreenPayload(salesQuotationRoute, studio.slug, `sales/quotations?id=${encodeURIComponent(quotationId)}`)
      : customerPage ? firstScreenPayload(customerRoute, studio.slug, `sales/customer?id=${encodeURIComponent(customerId)}`)
      : undefined,
    quotationsView ? firstScreenPayload(technicalRoute, studio.slug, "technical") : undefined,
    // THE CONTRACTS REGISTER READS TWO ROUTES, and hands both to one loader, so
    // its payload is the pair. Without the contracts half there is nothing to
    // paint and the screen fetches both; a missing change-order half it reads
    // as none, the same as its own loader does.
    contractsView ? firstScreenPayload(contractsRoute, studio.slug, "sales/contracts") : undefined,
    contractsView ? firstScreenPayload(changeOrdersRoute, studio.slug, "sales/change-orders") : undefined,
  ]);
  // Logistics' shipments are Inventory's screen under another root.
  const viewDept = !framed || engineView ? ""
    : isSheets ? "projects"
    : active?.key === "logistics-shipments" ? "inventory"
    : ["inventory", "approvals", "field-service", "finance", "hr", "projects"].includes(screenKey) ? screenKey : "";
  const viewed = viewDept ? VIEW_FIRST_PAYLOAD[viewDept](active?.key) : null;
  const viewInitial = viewed ? await firstScreenPayload(viewed[0], studio.slug, viewed[1]) : undefined;
  const [engineInitial, boqInitial, summaryInitial, rootInitial, safetyInitial, landedCostInitial] = await Promise.all([
    engineView ? firstScreenPayload(recordsRoute, studio.slug, `records/${active.key.slice("engine-".length)}`,
      { typeKey: active.key.slice("engine-".length) }) : undefined,
    boqPage ? firstScreenPayload(boqRoute, studio.slug, `tendering/boq?tenderId=${encodeURIComponent(boqTenderId)}`) : undefined,
    summaryKey ? firstScreenPayload(sectionSummaryRoute, studio.slug, `records/summary?section=${encodeURIComponent(summaryKey)}`) : undefined,
    summaryKey === "assets" ? firstScreenPayload(allocationsRoute, studio.slug, "assets/allocations")
      : summaryKey === "engineering-docs" ? firstScreenPayload(engineeringDashboardRoute, studio.slug, "engineering/dashboard")
      : undefined,
    summaryKey === "quality-hse" ? firstScreenPayload(safetyRoute, studio.slug, "quality/safety") : undefined,
    summaryKey === "logistics" ? firstScreenPayload(landedCostRoute, studio.slug, "logistics/landed-cost") : undefined,
  ]);
  const contractsInitial = contractsBody === undefined ? undefined
    : { contracts: contractsBody, changeOrders: changeOrdersBody };

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
      {/* THE SETTINGS SURFACE ANSWERS FIRST, and it has to. `/‹slug›/settings`
          is not a section key, so `active` below falls back to `sections[0]` —
          Main, for almost everybody — and without this branch the gear in the
          shell would open the home dashboard. Matched on the shared derivation
          (`isSettingsPath`) rather than a literal string so the page and the
          shell cannot disagree about where you are, which is the whole reason
          studioRoute exists.

          THE FOUR SCREENS UNDER IT KEEP THEIR OWN BRANCHES BELOW. This is the
          hub, not a router: People, Access, Master data and Studio settings are
          still reached at their own addresses, still gated by their own areas,
          and a delivered notification linking to `/people` still lands on the
          screen it always did. */}
      {settingsHub
        ? <SettingsSurface studio={studio} locale={locale} sections={systemSections} />
      /* ADMINISTRATION'S FOUR SCREENS, matched by `active?.key` like
          Procurement's Suppliers and Logistics's Shipments below — and for the
          same reason: `screenKey` collapses a child onto the root its parentId
          names, and `administration` has no dashboard of its own to collapse
          onto. They were literal `requested ===` matches until the fold, which
          is what let them render while their sections were invisible.

          THEY ARE NOT SECTIONS ANY MORE (09/09/2026) and these branches are
          unchanged by that, deliberately: what left is the nav row and the
          department list, not the address or the right. */
        : active?.key === "administration-members"
        ? <StudioPeople slug={studio.slug} canAdminister={admin} myCollaboratorId={collaborator.id} initial={keyedInitial} />
        : active?.key === "administration-access" ? (
          /* The per-person section grid is gone. It wrote grants, and nothing
             reads grants any more — it would have saved successfully and
             changed nothing, which is worse than a screen that refuses. Access
             is now a role here and an assignment on People. */
          <StudioRoles slug={studio.slug} initial={keyedInitial} />
        )
        : active?.key === "administration-master" ? <StudioMasterData slug={studio.slug} initial={keyedInitial} />
        : active?.key === "administration-settings" ? <StudioSettings slug={studio.slug} locale={locale} initial={keyedInitial} />
        : deniedSection ? <NoSectionAccess locale={locale} notBuiltYet={notBuiltYet} />
        : quotationId ? <SalesQuotationViewer slug={studio.slug} ticketId={ticketId} quotationId={quotationId} initial={recordInitial} />
        : ticketId ? <StudioTicketProfile slug={studio.slug} ticketId={ticketId} initial={salesInitial} />
        : isSheets ? <StudioSheetViewer slug={studio.slug} sheetId={sheetId} perspective="inventory" initial={viewInitial} />
        : projectQuotation ? <StudioSheetViewer slug={studio.slug} projectId={projectId} perspective="projects" initial={viewInitial} />
        // EVERY ENGINE TYPE, BY PREFIX RATHER THAN BY KEY. A type declared this
        // morning renders this morning — naming them one by one here would put
        // the deploy back that a runtime engine was chosen to remove.
        //
        // AHEAD OF EVERY `screenKey ===` CASE, and that is load-bearing rather
        // than tidy. A type plants its section as a CHILD of whatever root it
        // declares, so `screenKey` collapses `engine-transmittal` onto
        // `engineering-docs` and the case below would hand it to StudioTechnical
        // — the exact silent fall-through the quotations and suppliers notes
        // either side of this one were written for, and the way
        // `engine.<typeKey>.view` would become a right that opens somebody
        // else's screen (invariant 16).
        //
        // NO BUILT-IN SECTION KEY CAN COLLIDE: `engine-` is the namespace
        // `engineSectionKey` mints and nothing else uses it. `engineering-docs`
        // is the near miss and does not start with it.
        : active?.key?.startsWith("engine-")
          ? <StudioRecords slug={studio.slug} typeKey={active.key.slice("engine-".length)} initial={engineInitial} />
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
        : customerId ? <StudioCustomer slug={studio.slug} clientId={customerId} initial={recordInitial} />
        : boqTenderId ? <StudioBoq slug={studio.slug} tenderId={boqTenderId} initial={boqInitial} />
        // MANUFACTURING'S ROOT IS THE PLANNING SCREEN. It sits AFTER the
        // `engine-` prefix case above, which is what keeps its four engine
        // registers rendering as registers: every one of them plants a
        // section whose parent is `manufacturing`, so `screenKey` collapses
        // them onto this key and reaching this line first would hand a work
        // order register the planning view.
        : active?.key === "manufacturing" ? <StudioProduction slug={studio.slug} initial={keyedInitial} />
        // ASSETS' ROOT IS THE ALLOCATION SCREEN, with the register cards kept
        // BELOW it rather than replaced by it. Manufacturing's root took the
        // planning view and lost its subsection cards in the same move; Assets
        // has three engine registers (equipment, maintenance, calibration) and
        // the allocation screen reads the first of them, so a person who lands
        // here with an empty fleet needs the way onward that a bare screen
        // would have taken away.
        //
        // AFTER the `engine-` prefix case above, for the reason Manufacturing's
        // comment gives: every one of those registers plants a section whose
        // parent is `assets`, so reaching this line first would hand a
        // calibration register the allocation screen.
        : active?.key === "assets" ? (
          <div className="space-y-6">
            <StudioPlantAllocation slug={studio.slug} initial={rootInitial} />
            <StudioSectionSummary slug={studio.slug} sectionKey="assets" locale={locale} initial={summaryInitial} />
          </div>
        )
        // ENGINEERING & DOCUMENTS' ROOT IS ITS DASHBOARD, with the register cards
        // kept below it — the Assets shape, for Assets' reason: somebody who
        // lands on an empty department still needs the way onward. AFTER the
        // `engine-` prefix case above, because its five registers plant sections
        // whose parent is `engineering-docs`.
        : active?.key === "engineering-docs" ? (
          <div className="space-y-6">
            <EngineeringDashboard slug={studio.slug} initial={rootInitial} />
            <StudioSectionSummary slug={studio.slug} sectionKey="engineering-docs" locale={locale} initial={summaryInitial} />
          </div>
        )
        : active?.key === "tendering-rates" ? <StudioRates slug={studio.slug} initial={keyedInitial} />
        : screenKey === "tendering" ? <StudioTenders slug={studio.slug} view={active?.key} initial={tendersInitial} initialError={tendersError} />
        : active?.key === "crm-sales-pipeline" ? <StudioPipeline slug={studio.slug} initial={keyedInitial} />
        : active?.key === "crm-sales-insights" ? <CustomerInsightsDashboard slug={studio.slug} initial={keyedInitial} />
        : active?.key === "crm-sales-contracts" ? <StudioContracts slug={studio.slug} initial={contractsInitial} />
        : active?.key === "crm-sales-orders" ? <StudioOrders slug={studio.slug} initial={keyedInitial} />
        : screenKey === "crm-sales" ? <StudioSales slug={studio.slug} view={active?.key} initial={salesInitial} />
        // THE QUOTATIONS DEPARTMENT (13/09/2026): its dashboard at the root, and
        // the RFQ intake, the register and the settings beneath it — all still
        // StudioTechnical, which was always the presales team's screen. Old
        // addresses reach it through `requestedKey`'s retired addresses.
        // Engineering & Documents no longer has a branch: its root is a heading
        // over its registers and falls through to the section summary below.
        : screenKey === "quotations" ? (
          // THE STUDIO'S OWN NAMES FOR ITS SECTIONS, so a quotation's origin tag
          // can say where it came from in the words this tenant uses rather than
          // the word the code was written with. Key → stored name, from the
          // sections this person may open; the screen falls back to its own
          // label for a section they cannot. Cheap enough to hand down as a
          // prop — the alternative was widening the technical payload for two
          // strings the page already holds.
          <StudioTechnical slug={studio.slug} view={active?.key} initial={technicalInitial}
            sectionNames={Object.fromEntries(sections.map((x) => [x.key, x.name]))} />
        )
        : screenKey === "projects" ? <StudioProjects slug={studio.slug} view={active?.key} initial={viewInitial} />
        : screenKey === "hr" ? <StudioHr slug={studio.slug} view={active?.key} initial={viewInitial} />
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
        // ("procurement", "logistics"), and LOGISTICS still has no dashboard of
        // its own the way Inventory does, so its OWN root screen wants the
        // generic SectionDashboard (a heading and its subsection cards) rather
        // than the whole Inventory dashboard wearing its name.
        //
        // PROCUREMENT HAS ONE NOW, which is why it is named below rather than
        // falling through. This comment said both roots had none, and would
        // have gone on saying it.
        : active?.key === "procurement"
          ? <ProcurementDashboard slug={studio.slug} initial={keyedInitial} />
        // MAINTENANCE'S ROOT IS A SUMMARY NOW, not the generic card list — the
        // same move Procurement made, and what its dashboard right gates.
        : active?.key === "maintenance"
          ? <MaintenanceDashboard slug={studio.slug} initial={keyedInitial} />
        // THE POINT OF SALE DEPARTMENT (17/09/2026). The till is full-screen and
        // returned above; its root is a summary, and three screens sit under it.
        : active?.key === "pos"
          ? <PosDashboard slug={studio.slug} />
        // THE MARKETING DEPARTMENT (19/09/2026): its dashboard at the root and
        // the campaign register beneath it — the one sub-section with a screen.
        : active?.key === "marketing"
          ? <MarketingDashboard slug={studio.slug} initial={keyedInitial} />
        : active?.key === "marketing-campaigns"
          ? <StudioCampaigns slug={studio.slug} initial={keyedInitial} />
        : active?.key === "marketing-planning"
          ? <StudioMarketingCalendar slug={studio.slug} initial={keyedInitial} />
        : active?.key === "marketing-partners"
          ? <StudioMarketingPartners slug={studio.slug} initial={keyedInitial} />
        : active?.key === "marketing-content"
          ? <StudioMarketingContent slug={studio.slug} initial={keyedInitial} />
        : active?.key === "marketing-events"
          ? <StudioMarketingEvents slug={studio.slug} initial={keyedInitial} />
        : active?.key === "marketing-audiences"
          ? <StudioAudiences slug={studio.slug} initial={keyedInitial} />
        : active?.key === "marketing-budget"
          ? <StudioMarketingBudget slug={studio.slug} initial={keyedInitial} />
        : active?.key === "marketing-forms"
          ? <StudioForms slug={studio.slug} initial={keyedInitial} />
        : active?.key === "pos-sales"
          ? <StudioPosSales slug={studio.slug} />
        : active?.key === "pos-shifts"
          ? <StudioPosShifts slug={studio.slug} />
        : active?.key === "pos-settings"
          ? <StudioPosSettings slug={studio.slug} initial={keyedInitial} />
        : active?.key === "pos-returns"
          ? <StudioPosReturns slug={studio.slug} initial={keyedInitial} />
        : active?.key === "pos-promotions"
          ? <StudioPosPromotions slug={studio.slug} initial={keyedInitial} />
        : active?.key === "maintenance-requests"
          ? <StudioWorkRequests slug={studio.slug} initial={keyedInitial} />
        : active?.key === "maintenance-orders"
          ? <StudioWorkOrders slug={studio.slug} initial={keyedInitial} />
        : active?.key === "maintenance-plans"
          ? <StudioPmPlans slug={studio.slug} initial={keyedInitial} />
        : active?.key === "maintenance-assets"
          ? <StudioMachines slug={studio.slug} initial={keyedInitial} />
        : active?.key === "maintenance-contracts"
          ? <StudioServiceContracts slug={studio.slug} initial={keyedInitial} />
        : active?.key === "procurement-requisitions"
          ? <StudioRequisitions slug={studio.slug} initial={keyedInitial} />
        : active?.key === "procurement-orders"
          ? <StudioPurchaseOrders slug={studio.slug} initial={keyedInitial} />
        : active?.key === "procurement-rfq"
          ? <StudioRfq slug={studio.slug} initial={keyedInitial} />
        : active?.key === "procurement-expediting"
          ? <StudioExpediting slug={studio.slug} initial={keyedInitial} />
        : active?.key === "procurement-subcontracts"
          ? <StudioSubcontracts slug={studio.slug} initial={keyedInitial} />
        : active?.key === "procurement-receiving"
          ? <StudioReceiving slug={studio.slug} initial={keyedInitial} />
        : active?.key === "procurement-suppliers"
          ? <StudioSuppliers slug={studio.slug} initial={keyedInitial} />
        // BY KEY: its parent is `quality-hse`, whose screen is the section
        // dashboard, so screenKey would collapse onto it and hide the register.
        : active?.key === "quality-hse-permits"
          ? <StudioPermits slug={studio.slug} initial={keyedInitial} />
        : active?.key === "logistics-shipments"
          ? <StudioInventory slug={studio.slug} view={active?.key} initial={viewInitial} />
        : screenKey === "inventory" ? <StudioInventory slug={studio.slug} view={active?.key} initial={viewInitial} />
        : screenKey === "finance" ? <StudioFinance slug={studio.slug} view={active?.key} initial={viewInitial} />
        : screenKey === "approvals" ? <StudioApprovals slug={studio.slug} view={active?.key} initial={viewInitial} />
        : screenKey === "field-service" ? <StudioOperations slug={studio.slug} view={active?.key} initial={viewInitial} />
        : screenKey === "reports"
          // `allSections`, not `sections`: the visible list has already dropped
          // the switched-off rows, so a switchboard built from it would find no
          // row for a switched-off part and call it on (dashboards.md).
          ? <StudioReports slug={studio.slug} access={access} sections={allSections} locale={locale} />
        : screenKey === "main" ? <StudioMain slug={studio.slug} initial={mainInitial} />
        : active ? <SectionDashboard section={active} studio={studio} locale={locale}
            initial={{ summary: summaryInitial, safety: safetyInitial, landedCost: landedCostInitial }}
            subsections={sections.filter((s) => s.parentId === active.id)} />
        : <NothingGranted admin={admin} slug={studio.slug} locale={locale} />}
    </>
  );
}

// ONE SCREEN'S FIRST PAYLOAD: its own route's GET, answered in this render.
//
// `path` is the API path under the studio, exactly as the screen fetches it —
// `"sales"` for `/api/studios/<slug>/sales` — because the route wrapper decides
// the section switch from that path, and a handler may read its query string.
//
// THREE WAYS TO GET NOTHING, and each leaves the screen on the path it always
// had: fetch on mount, with its own message. A refusal (`firstPayload` answers
// undefined); a payload over the RSC ceiling, logged because a tenant stuck over
// it pays the round trip on every click and nobody would otherwise know; and a
// handler that THROWS, which here would take the whole page down where the
// fetch path showed a message in the screen's own box.
//
// MUST BE CALLED INSIDE `renderStudio`, i.e. inside the page's `withRequest`.
// The route rebuilds its module context, and that is free only because every
// read it makes is already in this request's cache.
async function firstScreenPayload(route, slug, path, params) {
  try {
    const payload = await route.firstPayload(slug, `/api/studios/${slug}/${path}`, params);
    if (payload === undefined) return undefined;
    if (fitsInRscPayload(payload)) return payload;
    log.info("rsc payload over ceiling", { screen: path, slug });
  } catch (error) {
    log.warn("first payload failed", { screen: path, slug, error: String(error?.message || error) });
  }
  return undefined;
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
// `initial` carries the three panels' first payloads, each composed only for
// the section that draws it — undefined for anything else, which fetches.
function SectionDashboard({ section, studio, subsections = [], locale = "en", initial = {} }) {
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

      {/* AND WHAT IS IN THOSE REGISTERS. Five sections reach this dashboard and
          hold nothing but engine registers — Manufacturing, Assets, Quality &
          HSE, Field Operations, Logistics — so until now every one of them
          rendered a heading and a row of links to counts nobody could see
          without opening each in turn. The panel asks one route for whatever
          the section holds and renders nothing at all when it holds none, so a
          section without registers is unchanged. */}
      <StudioSectionSummary slug={studio.slug} sectionKey={section.key} locale={locale} initial={initial.summary} />
      {section.key === "quality-hse" && <StudioSafety slug={studio.slug} locale={locale} initial={initial.safety} />}
      {/* LANDED COST SITS ON THE LOGISTICS ROOT, which is where its records are
          filed — a charge attaches to the ORDER the goods came on, and an air
          waybill is one of several ways they might have travelled, so putting it
          under the AWB register would strand every charge on a sea shipment.
          Its route and module shipped with the section and nothing fetched
          either until now. */}
      {/* NO CURRENCY PROP. This dashboard is handed a studio narrowed to its
          name and slug at every other call site, so reading a `currency` off it
          here would be a field that happens to be undefined rather than one
          that is absent on purpose — and an amount suffixed with "undefined" is
          worse than an unsuffixed one. The figures read bare until the route
          carries a currency of its own. */}
      {section.key === "logistics" && <StudioLandedCost slug={studio.slug} locale={locale} initial={initial.landedCost} />}
    </div>
  );
}


// THE SETTINGS SURFACE — what Administration became when it stopped being a
// section, 09/09/2026, on the owner's instruction: "it carries system settings
// and nothing that adds value" as a department.
//
// A HUB RATHER THAN A REDIRECT. Sending `/settings` straight to the first screen
// somebody may open would give two people different destinations for the same
// link, and would hide the other three from a person who holds them. Four cards,
// drawn from the section rows themselves so the studio's own names and the
// tenant's language come through unchanged — the same `sectionName` every nav
// row uses, not a second hand-typed list.
//
// EMPTY IS A REAL STATE AND IT SAYS SO. The shell does not draw the gear for
// somebody holding none of the four, so arriving here at all means a typed
// address or a stale bookmark; a bare heading would read as a broken screen.
function SettingsSurface({ studio, sections = [], locale = "en" }) {
  const t = shellDict(locale);
  // The root row is a container, not a destination — it has no screen of its
  // own and never did. Listing it would offer a card that opens this same page.
  const screens = sections.filter((s) => s.key !== "administration");
  return (
    <div className="rounded-geex border border-slate-200/70 bg-white p-8 dark:border-white/10 dark:bg-[#20202c]">
      <h2 className="font-display text-xl font-800 text-slate-900 dark:text-white">{t.settings}</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
        {screens.length > 0 ? t.settingsBody : t.settingsNothing}
      </p>

      {screens.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {screens.map((s) => (
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

