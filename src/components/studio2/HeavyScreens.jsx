"use client";

// THE SCREENS THAT ONLY THEIR OWN VISITOR SHOULD PAY FOR.
//
// `next/dynamic` IN A SERVER COMPONENT DOES NOT DEFER ANYTHING FOR THE BROWSER,
// which is the whole reason this file exists. The studio page is a Server
// Component, and its comment says each screen is "fetched when the switch
// actually reaches it". Measured, that is not what happens: every client module
// on that route carries the IDENTICAL chunk list in the client reference
// manifest, so naming one screen loads all of them. In a Server Component
// `dynamic()` defers the SERVER render — React renders the chosen branch and
// nothing else — and Turbopack then groups the route's client references into
// one chunk group, which the browser fetches whole.
//
// The split has to be declared where the browser can act on it: inside a client
// module, so the `import()` below is a RUNTIME import rather than a build-time
// edge the bundler can flatten. Two things in this tree already prove that
// works — `fields/StudioDate` keeps MUI's date code in a 1 KB async chunk, and
// `lib/chatTranscript` keeps jsPDF's 131 KB out of every route that never
// exports a transcript. Both are client modules calling `import()`.
//
// WHAT THIS IS WORTH, measured on the same build rather than argued: the four
// screens below drag TipTap/ProseMirror (158 KB) and MUI's date pickers with
// date-fns (98 KB) into the first load of EVERY tenant page — the proxy rewrites
// /<slug>/… onto that one route, so somebody opening Sales was downloading a
// document editor and a Gantt chart.
//
// SSR IS LEFT ON, having been measured rather than reasoned about. `ssr: false`
// went in first, copying `fields/StudioDate`, on the theory that a client-only
// module is what leaves the entry. Both variants were built: 679 KB first load,
// 1772 KB total, the same four async chunks, byte for byte the same numbers.
// The flag changes nothing here, so the screens keep server-rendering — being
// in the client module is what does the work, not being out of the SSR graph.
//
// WHAT IT COSTS, because a split is never free and this one is not: the total
// across all chunks rose 1692 -> 1772. Roughly 57 KB of that is date-fns
// arriving TWICE, once in the planner's async group and once in MuiDate's,
// where before there was one copy in the shared entry everybody paid for. That
// is the trade taken deliberately — 283 KB off EVERY tenant page against 57 KB
// duplicated between two groups that each load only on demand — and the way to
// win it back is to make the planner reach the pickers through the same lazy
// module `fields/StudioDate` already uses, which is a separate change with its
// own measurement.
//
// IT NOW HOLDS EVERY CLIENT SCREEN THE STUDIO SWITCH NAMES (26/09/2026), which
// this paragraph used to forbid ("deliberately NOT a barrel ... measure, then
// move what the measurement blames"). The measurement came: the studio route
// was 774 KB against a 717 KB ceiling, and its largest chunk — 302 KB, over the
// 250 KB limit — was ~200 modules of department screens that page.js still
// declared with a Server-Component `nextDynamic`, i.e. deferring nothing. So
// the rule is the reverse of what it said: a client screen reached from the
// studio switch belongs HERE by default. Only a Server Component screen stays
// in page.js, because a client module cannot import one.
//
// IT IS STILL NOT A BARREL IN THE HARMFUL SENSE: every export is a lazy
// `nextDynamic`, so importing a name from here costs a stub, not the screen.
import nextDynamic from "next/dynamic";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";

// Engineering & Documents. The editor is TipTap over ProseMirror, and it is the
// single heaviest thing the studio can load — reached only at
// /<slug>/engineering-documents and only by somebody opening a document.
export const DocumentList = nextDynamic(
  () => import("@/components/quality/documents/document-list").then((m) => m.DocumentList),
  { loading: () => <ScreenSkeleton /> },
);
export const DocumentView = nextDynamic(
  () => import("@/components/quality/documents/document-view").then((m) => m.DocumentView),
  { loading: () => <ScreenSkeleton /> },
);
// A quotation or invoice printed through its layout — the same editor, so the
// same weight, and reached only by pressing Print.
export const DocumentPrint = nextDynamic(
  () => import("@/components/quality/documents/document-print").then((m) => m.DocumentPrint),
  { loading: () => <ScreenSkeleton /> },
);

// The project planner. It imports @mui/x-date-pickers directly (StudioPlanner
// for the adapter, planner/cells for the two pickers), which is what puts
// date-fns in the studio's first load — `fields/MuiDate` says it is "the only
// place MUI's date code is imported" and has not been true since the planner
// landed. Deferring the planner is what actually removes it.
// The project planner — a full-screen app (the list) and one plan's schedule.
// Reached through Operations (the whole app) and through a project (its own
// plans), so both of the studio route's branches hand it the plan's API base.
export const StudioPlanner = nextDynamic(
  () => import("@/components/studio2/StudioPlanner"),
  { loading: () => <ScreenSkeleton /> },
);
// A plan's print sheet — the planner's store and scheduling engine without the
// editor, reached only by pressing Print, so it is deferred like the rest.
export const PlanPrint = nextDynamic(
  () => import("@/components/planner/PlanPrint"),
  { loading: () => <ScreenSkeleton /> },
);
export const StudioPlannerList = nextDynamic(
  () => import("@/components/studio2/StudioPlannerList"),
  { loading: () => <ScreenSkeleton /> },
);

// The executive board, on Reports & BI. It landed with `nextDynamic` called
// from StudioReports — which is a SERVER COMPONENT, so it deferred the server
// render and nothing else, exactly as this file's header warns. Measured: the
// studio route went 701 -> 710 KB and the budget refused it.
//
// It is not heavy the way the editor is. What it drags in is its own dictionary
// and `modules/reports/executive` — the tile registry and the movement
// arithmetic — onto EVERY tenant page, to serve one screen most people never
// open. Deferring it from here is what actually removes it.
// THE TILL, full-screen. Its model, the barcode lookup and the shared totals
// are all it carries, and none of that should ride every tenant page to serve
// the counter that opens it.
export const StudioPos = nextDynamic(
  () => import("@/components/studio2/StudioPos"),
  { loading: () => <ScreenSkeleton /> },
);

// THE POINT OF SALE DEPARTMENT'S OTHER SCREENS (17/09/2026) — its dashboard,
// its sales list, its shift history and its settings. Behind the same lazy
// boundary as the till, for the till's reason: they serve the counter, not
// every tenant page.
export const PosDashboard = nextDynamic(
  () => import("@/components/studio2/PosDashboard"),
  { loading: () => <ScreenSkeleton /> },
);
export const StudioPosSales = nextDynamic(
  () => import("@/components/studio2/StudioPosSales"),
  { loading: () => <ScreenSkeleton /> },
);
export const StudioPosShifts = nextDynamic(
  () => import("@/components/studio2/StudioPosShifts"),
  { loading: () => <ScreenSkeleton /> },
);
export const StudioPosSettings = nextDynamic(
  () => import("@/components/studio2/StudioPosSettings"),
  { loading: () => <ScreenSkeleton /> },
);
// RETURNS (18/09/2026), behind the same boundary for the same reason.
export const StudioPosReturns = nextDynamic(
  () => import("@/components/studio2/StudioPosReturns"),
  { loading: () => <ScreenSkeleton /> },
);
// PROMOTIONS (22/09/2026), behind the same boundary for the same reason.
export const StudioPosPromotions = nextDynamic(
  () => import("@/components/studio2/StudioPosPromotions"),
  { loading: () => <ScreenSkeleton /> },
);

export const ExecutiveBoard = nextDynamic(
  () => import("@/components/studio2/ExecutiveBoard"),
  { loading: () => <ScreenSkeleton /> },
);

// The generic section dashboard's register panel — reached from five sections,
// so it rides the same dynamic boundary the rest of them do.
export const StudioSectionSummary = nextDynamic(() => import("@/components/studio2/StudioSectionSummary"));

// Logistics' root only — the landed-cost reconciliation, beside the register
// summary every engine section gets.
export const StudioLandedCost = nextDynamic(() => import("@/components/studio2/LandedCostPanel"));

// Quality & HSE only — LTIFR is a fact about injuries and hours worked, not
// about registers in general, so it is mounted by key rather than joining the
// panel every engine section gets.
export const StudioSafety = nextDynamic(() => import("@/components/studio2/StudioSafety"));

export const StudioSalesLive = nextDynamic(() => import("@/components/studio2/StudioSalesLive"));

export const StudioTechnicalLive = nextDynamic(() => import("@/components/studio2/StudioTechnicalLive"));

export const StudioPeople = nextDynamic(
  () => import("@/components/studio2/StudioPeople"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioRoles = nextDynamic(
  () => import("@/components/studio2/StudioRoles"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioSettings = nextDynamic(
  () => import("@/components/studio2/StudioSettings"),
  { loading: () => <ScreenSkeleton /> },
);

// Customer insights (19/09/2026): the buying-pattern analysis, advanced tier.
export const CustomerInsightsDashboard = nextDynamic(
  () => import("@/components/studio2/CustomerInsightsDashboard"),
  { loading: () => <ScreenSkeleton /> },
);

// ONE PROJECT'S PAGE, all six tabs of it — see StudioProjectHub, which loads
// each tab as its own chunk (a client module, so those splits are real).
export const StudioProjectHub = nextDynamic(
  () => import("@/components/studio2/StudioProjectHub"),
  { loading: () => <ScreenSkeleton /> },
);

// Planning & calendar (22/09/2026): what runs when, across channels.
export const StudioMarketingCalendar = nextDynamic(
  () => import("@/components/studio2/StudioMarketingCalendar"),
  { loading: () => <ScreenSkeleton /> },
);

// Partners & influencers (22/09/2026): who brings the work, and what it brought.
export const StudioMarketingPartners = nextDynamic(
  () => import("@/components/studio2/StudioMarketingPartners"),
  { loading: () => <ScreenSkeleton /> },
);

// Content & brand assets (22/09/2026): what was made for each campaign.
export const StudioMarketingContent = nextDynamic(
  () => import("@/components/studio2/StudioMarketingContent"),
  { loading: () => <ScreenSkeleton /> },
);

// Events & webinars (22/09/2026): what is on, who signed up, and who came.
export const StudioMarketingEvents = nextDynamic(
  () => import("@/components/studio2/StudioMarketingEvents"),
  { loading: () => <ScreenSkeleton /> },
);

// Audiences & consent (21/09/2026): who the studio may contact, and why.
export const StudioAudiences = nextDynamic(
  () => import("@/components/studio2/StudioAudiences"),
  { loading: () => <ScreenSkeleton /> },
);

// Budget & spend (21/09/2026): campaigns against what Finance recorded.
export const StudioMarketingBudget = nextDynamic(
  () => import("@/components/studio2/StudioMarketingBudget"),
  { loading: () => <ScreenSkeleton /> },
);

// Forms (19/09/2026): the list. One form's editor, at /marketing-forms/<id>, is a
// Server Component and stays in the studio page.
export const StudioForms = nextDynamic(
  () => import("@/components/studio2/StudioForms"),
  { loading: () => <ScreenSkeleton /> },
);

// The purchase order register (tier 5) — see StudioPurchaseOrders.
export const StudioPurchaseOrders = nextDynamic(
  () => import("@/components/studio2/StudioPurchaseOrders"),
  { loading: () => <ScreenSkeleton /> },
);

// The one permit register, in Quality & HSE (tier 5) — see StudioPermits.
export const StudioPermits = nextDynamic(
  () => import("@/components/studio2/StudioPermits"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioPlantAllocation = nextDynamic(
  () => import("@/components/studio2/StudioPlantAllocation"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioProduction = nextDynamic(
  () => import("@/components/studio2/StudioProduction"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioSales = nextDynamic(
  () => import("@/components/studio2/StudioSales"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioTicketProfile = nextDynamic(
  () => import("@/components/studio2/StudioTicketProfile"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioSheetViewer = nextDynamic(
  () => import("@/components/studio2/StudioSheetViewer"),
  { loading: () => <ScreenSkeleton /> },
);

export const SalesQuotationViewer = nextDynamic(
  () => import("@/components/studio2/SalesQuotationViewer"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioTechnical = nextDynamic(
  () => import("@/components/studio2/StudioTechnical"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioProjects = nextDynamic(
  () => import("@/components/studio2/StudioProjects"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioHr = nextDynamic(
  () => import("@/components/studio2/StudioHr"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioInventory = nextDynamic(
  () => import("@/components/studio2/StudioInventory"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioFinance = nextDynamic(
  () => import("@/components/studio2/StudioFinance"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioApprovals = nextDynamic(
  () => import("@/components/studio2/StudioApprovals"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioOperations = nextDynamic(
  () => import("@/components/studio2/StudioOperations"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioMain = nextDynamic(
  () => import("@/components/studio2/StudioMain"),
  { loading: () => <ScreenSkeleton /> },
);

export const StudioEngagements = nextDynamic(
  () => import("@/components/studio2/StudioEngagements"),
  { loading: () => <ScreenSkeleton /> },
);

