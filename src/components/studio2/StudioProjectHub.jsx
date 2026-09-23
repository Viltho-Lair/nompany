"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import nextDynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useProjectData } from "@/components/studio2/StudioProjectInfo";
import { ProjectHubBar, PROJECT_TABS } from "@/components/studio2/ProjectHubTabs";

// ONE PROJECT, SIX TABS, ONE PAGE — /<slug>/projects-list/<id>[/<tab>].
//
// EVERY TAB USED TO BE A PAGE NAVIGATION, and it read as a reload because it
// was one in all but name. Measured in the sandbox, Overview → Cost breakdown:
// the route's loading boundary replaced the WHOLE window (the project's name
// and the tab bar included) 62 ms after the click; the server then re-resolved
// the studio, the person and their access for ~1.1 s; the tab's code loaded;
// and the bar fetched the studio's /projects all over again just to print the
// project's name, because every tab drew its own. 2.9 s, most of it blank.
//
// So the hub is the page and the tabs are its body. The bar and the /projects
// read are held here once; a tab click swaps the body and moves the address
// with history.pushState, which the App Router picks up (usePathname follows
// it, and back/forward walk the entries) without asking the server anything —
// there is nothing for the server to say: which tabs this person may open is
// already in the /projects read, and each tab's own API re-checks its right.
//
// A TAB ONCE OPENED STAYS MOUNTED, hidden, so going back to it is instant and
// keeps its scroll, its open dialog and its board. Its live subscriptions keep
// it current while hidden, exactly as they would while shown.
//
// FULL-WINDOW, ALL SIX. The board is full-window by design and the other five
// were full-window by accident (shared/studioRoute said "/projects-list/<id> is
// the board" after the board had moved to /board) — drawn with none of the page
// padding they were written for, and the bar's -mx-1 put the page 4 px wider
// than the window: a horizontal scrollbar, whose 10 px then forced a vertical
// one. Now the window is exactly the window: the bar is fixed at the top and
// the body scrolls inside itself, padded, so nothing scrolls at page level.

// Each tab is its own chunk. This is a CLIENT module, so these import()s are
// real lazy boundaries (HeavyScreens.jsx explains why the same call in the
// server page is not), and the skeleton they show is the body's alone — the
// bar never leaves the screen.
const bodySkeleton = () => <ScreenSkeleton />;
const SCREENS = {
  overview: nextDynamic(() => import("@/components/studio2/StudioProjectOverview"), { loading: bodySkeleton }),
  board: nextDynamic(() => import("@/components/studio2/StudioProjectBoard"), { loading: () => null }),
  costs: nextDynamic(() => import("@/components/studio2/StudioProjectCosts"), { loading: bodySkeleton }),
  billing: nextDynamic(() => import("@/components/studio2/StudioProjectBilling"), { loading: bodySkeleton }),
  reports: nextDynamic(() => import("@/components/studio2/StudioSiteReports"), { loading: bodySkeleton }),
  closure: nextDynamic(() => import("@/components/studio2/StudioProjectClosure"), { loading: bodySkeleton }),
};

// Warmed once the first tab has drawn, so the first click on any other tab
// finds its code already here. The same specifiers as above, so the bundler
// hands back the same chunks rather than a second copy.
const WARM = [
  () => import("@/components/studio2/StudioProjectOverview"),
  () => import("@/components/studio2/StudioProjectBoard"),
  () => import("@/components/studio2/StudioProjectCosts"),
  () => import("@/components/studio2/StudioProjectBilling"),
  () => import("@/components/studio2/StudioSiteReports"),
  () => import("@/components/studio2/StudioProjectClosure"),
];

// The segment after the project id names the tab; none (or "overview") is the
// Overview. Read from the address rather than handed down by the server page,
// because after a tab click the server page has not run again — the address is
// the only thing that moved.
function tabOf(pathname) {
  const parts = String(pathname || "").split("/");
  const at = parts.indexOf("projects-list");
  const segment = at >= 0 ? parts[at + 2] || "" : "";
  if (!segment || segment === "overview") return "overview";
  return PROJECT_TABS.some((t) => t.key !== "overview" && t.segment === segment)
    ? PROJECT_TABS.find((t) => t.segment === segment).key
    : "overview";
}

const HubContext = createContext(null);

/** The /projects read the hub holds — { data, error, reload } — for the tabs that draw from it. */
export function useProjectHubData() {
  return useContext(HubContext)?.project ?? null;
}

/**
 * A TAB'S OWN CONTROLS IN THE HUB'S BAR — "Edit details" on the Overview, "View
 * only" on the board. Portalled into a slot per tab rather than lifted into
 * hub state: the node is rebuilt on every render of the tab, and state set
 * from it would re-render the hub on every render of every tab. Each tab has
 * its own slot, shown only while that tab is, so a hidden tab's controls never
 * sit beside another tab's body.
 */
export function HubTrailing({ tab, children }) {
  const slot = useContext(HubContext)?.slots[tab];
  return slot ? createPortal(children, slot) : null;
}

// `initial` is the /projects body the studio page answered in its own render. It
// is what the bar, the overview and the board are drawn from, so the hub opens
// with the project on it; the other tabs still read their own routes.
export default function StudioProjectHub({ slug, projectId, initial }) {
  const pathname = usePathname();
  const active = tabOf(pathname);
  const project = useProjectData(slug, initial);

  // Tabs visited so far, in the order they were first opened. Mounting only
  // these keeps a first visit to one tab from loading the other five's data.
  const [visited, setVisited] = useState(() => [active]);
  if (!visited.includes(active)) setVisited([...visited, active]);

  // One ref callback per tab, made ONCE: a callback rebuilt each render is
  // called with null and then the element on every render, and each of those
  // is a state change — a loop.
  const [slots, setSlots] = useState({});
  const slotRefs = useMemo(() => Object.fromEntries(PROJECT_TABS.map((t) => [t.key, (el) => {
    setSlots((s) => (s[t.key] === (el || undefined) ? s : { ...s, [t.key]: el || undefined }));
  }])), []);

  useEffect(() => {
    const warm = () => WARM.forEach((load) => load().catch(() => {}));
    const w = typeof window !== "undefined" ? window : null;
    if (w?.requestIdleCallback) {
      const id = w.requestIdleCallback(warm, { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = setTimeout(warm, 1200);
    return () => clearTimeout(id);
  }, []);

  const navigate = useCallback((key, href) => {
    if (!href || key === tabOf(window.location.pathname)) return;
    window.history.pushState(null, "", href);
  }, []);

  const trailing = PROJECT_TABS.map((t) => (
    // `hidden` as a class, not the attribute: Tailwind's `contents` would
    // outrank the attribute's display:none and show every tab's controls.
    <div key={t.key} ref={slotRefs[t.key]} className={t.key === active ? "contents" : "hidden"} />
  ));

  return (
    <HubContext.Provider value={{ project, slots }}>
      <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[var(--geex-page)] text-[var(--geex-ink)]">
        <ProjectHubBar
          slug={slug}
          projectId={projectId}
          active={active}
          data={project.data}
          trailing={<div className="flex items-center gap-2">{trailing}</div>}
          onNavigate={navigate}
          className="shrink-0"
        />
        {visited.map((key) => {
          const Screen = SCREENS[key];
          const shown = key === active;
          // The board fills the body and scrolls its own columns; every other
          // tab is a document that scrolls inside the body, padded.
          return key === "board" ? (
            <div key={key} hidden={!shown} className={shown ? "flex min-h-0 flex-1 flex-col" : ""}>
              <Screen slug={slug} projectId={projectId} />
            </div>
          ) : (
            <div key={key} hidden={!shown} className={shown ? "min-h-0 flex-1 overflow-y-auto" : ""}>
              <div className="px-4 py-5 sm:px-6">
                <Screen slug={slug} projectId={projectId} />
              </div>
            </div>
          );
        })}
      </div>
    </HubContext.Provider>
  );
}
