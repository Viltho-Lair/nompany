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
// This file is deliberately NOT a barrel for every screen. It holds the ones
// whose weight was measured and named above; adding a screen here should follow
// the same order — measure the route, then move what the measurement blames.
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

// The project planner. It imports @mui/x-date-pickers directly (StudioPlanner
// for the adapter, planner/cells for the two pickers), which is what puts
// date-fns in the studio's first load — `fields/MuiDate` says it is "the only
// place MUI's date code is imported" and has not been true since the planner
// landed. Deferring the planner is what actually removes it.
export const StudioPlanner = nextDynamic(
  () => import("@/components/studio2/StudioPlanner"),
  { loading: () => <ScreenSkeleton /> },
);
export const StudioPlannerList = nextDynamic(
  () => import("@/components/studio2/StudioPlannerList"),
  { loading: () => <ScreenSkeleton /> },
);
