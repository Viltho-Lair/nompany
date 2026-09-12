import { isSystemSection } from "@/platform/db/keys";

// WHICH SECTION A STUDIO URL NAMES — the one derivation, for both sides of it.
//
// A studio's address is `/<slug>/<key>/…`, and TWO places have to read it. The
// page reads it from `params.segments` on the server to decide which screen to
// render. The shell reads it to highlight a nav row, open a group and title the
// header — and once the shell lives in a `layout.js` it has no `params` at all,
// because a layout is not given the route's segments. It has `usePathname()`
// and nothing else.
//
// So the derivation had to become shared rather than be written a second time
// against a different input. Two copies of "which section is this" is exactly
// the "two lists that must agree" shape the fifteen-section restructure kept
// finding, and the failure it produces is quiet: a nav row highlighting one
// section while the screen below it shows another.
//
// PURE, AND THAT IS WHY IT IS IN `shared/`. No Redis, no Postgres, no React —
// strings and an array of `{ key }`, so the server page, the client shell and a
// test can all call the identical function.
//
// IT IMPORTS ONE THING NOW, and the import is pure too: `keys.ts` has ZERO
// imports of its own (measured, not assumed), so naming `isSystemSection` here
// pulls no store, no client and no bundle weight into the shell. The
// alternative was a second hand-kept copy of which keys are system
// configuration — which is the one thing this module exists to prevent.

/**
 * The path segments BELOW the studio's own address.
 *
 * `/acme/inventory-stock/abc` with slug `acme` → `["inventory-stock", "abc"]`,
 * which is exactly what `params.segments` hands the page. The slug is dropped
 * rather than matched loosely: a studio whose slug happens to equal a section
 * key would otherwise eat its own first segment.
 */
export function studioSegments(pathname: string, slug: string): string[] {
  const parts = (pathname || "").split("/").filter(Boolean);
  // The first part IS the slug — the proxy rewrites `/<slug>/…` onto the studio
  // route without changing the address bar, so the browser path always starts
  // with it. Guarded rather than assumed: during a transition `usePathname()`
  // can briefly report a path that is not this studio's.
  if (parts[0] !== slug) return [];
  return parts.slice(1);
}

// THE TWO PRE-RESTRUCTURE ADDRESSES.
//
// People and Access lived at these keys before Administration & Settings became
// a real section, and they are not merely bookmarked: notifications ALREADY
// DELIVERED link to `/people`, and a delivered notification cannot be
// rewritten. So the old address has to keep resolving — and resolving it to
// the NEW key, rather than serving the screen at the old one, is what also
// makes the shell highlight the right nav row for somebody who arrives on one.
//
// IN `requestedKey` RATHER THAN `resolveActiveKey`, deliberately: the page
// reads requestedKey directly (page.js) while the shell reads resolveActiveKey,
// so an alias placed in the latter would render the screen while the nav
// highlighted nothing — the exact quiet failure this module exists to prevent.
//
// AND THE FOUR QUOTATION ADDRESSES (13/09/2026). The RFQ notification already
// delivered links to `engineering-docs-rfq`, and bookmarks name the rest; the
// screens are the Quotations department's now, and their old rows are filed-only.
const RETIRED_ADDRESSES: Record<string, string> = {
  people: "administration-members",
  access: "administration-access",
  "engineering-docs-rfq": "quotations-rfq",
  "crm-sales-quotations": "quotations-register",
  "engineering-docs-live": "quotations-live",
  "engineering-docs-settings": "quotations-settings",
};

/** The section key a set of segments asks for. `""` at the studio root. */
export function requestedKey(segments: readonly string[]): string {
  const asked = segments[0] || "";
  return RETIRED_ADDRESSES[asked] ?? asked;
}

/**
 * THE SETTINGS SURFACE — `/‹slug›/settings` and the four screens under it.
 *
 * Administration stopped being a section on 09/09/2026, so its keys no longer
 * appear in the nav tree and `resolveActiveKey` — which answers only from the
 * sections a person may open — would fall back to their first section and
 * highlight Main while Studio settings was on screen. That is the precise
 * failure this module exists to prevent, so the answer lives here beside
 * `requestedKey` rather than being written twice.
 *
 * THE FOUR OLD ADDRESSES STILL RESOLVE, and must: delivered notifications link
 * to `/people`, `RETIRED_ADDRESSES` already maps it onto its section key, and
 * that key is now a settings address rather than a nav row. Nothing a tenant
 * has bookmarked breaks; what changed is where the shell says you are.
 */
export const SETTINGS_KEY = "settings";

export function isSettingsPath(segments: readonly string[]): boolean {
  const key = requestedKey(segments);
  return key === SETTINGS_KEY || isSystemSection(key);
}

// SCREEN_KEYS IS GONE, and its absence is the Administration fold in one line.
//
// It held "people", "access" and "administration-settings" — the three
// addresses resolveActiveKey returned WITHOUT looking them up in the section
// list, because the page short-circuited them before its own lookup. That is
// how three screens stayed reachable while their sections were invisible to
// sectionViewable, and it is why nobody noticed that SECTION_AREAS had no
// entry for any of them.
//
// All three are ordinary sections now. A key that needs to bypass the section
// list again belongs here, with the reason it cannot be a section — but there
// is no such key today, and reintroducing the list "just in case" would
// reintroduce exactly the divergence it used to hide.

// DOES THIS ADDRESS WANT THE SHELL, OR THE WHOLE WINDOW?
//
// Seven of the studio's screens are full-screen by design — the manual, the two
// live views, Engagements, the document register, a project's board and the
// planner. They used to `return` out of the page before the shell was built,
// which worked precisely because the page WAS the shell. Once the shell moved
// into a layout that stopped being possible: a layout wraps everything below it,
// so the page can no longer decline to be wrapped.
//
// The answer is that the shell decides, from the same address the page reads.
// This is why it is a shared pure function and not a boolean prop: a prop would
// have to come from the page, and the page is INSIDE the thing it would be
// configuring. One list, read from both ends, exactly like resolveActiveKey.
//
// IT IS NOT PURELY A PATH QUESTION, and that is the part worth reading twice.
// Four of the seven are gated on the section being GRANTED — a person without
// the grant falls through to the ordinary shell, which is what tells them so.
// `sections` is the visible list, so asking it answers both halves at once, and
// it is the same expression the page's own branches use.
export function isFullScreenPath(
  segments: readonly string[],
  sections: readonly { key: string }[],
): boolean {
  const key = requestedKey(segments);
  const granted = (k: string) => sections.some((s) => s.key === k);

  // Available to every member regardless of section grants — membership alone.
  if (key === "documentation" || key === "crm-sales-live" || key === "quotations-live") return true;
  // Engagements rides its own permission key rather than a section (it is
  // deliberately not one — giving Main a child would gate Main). The page
  // refuses it when the right is missing, and that refusal is full-screen too,
  // which is why this does not consult `sections`.
  if (key === "engagements") return true;
  // A CUSTOMER DOCUMENT PRINTED THROUGH ITS LAYOUT (`/print/<kind>/<id>`). Not
  // a section either: it rides the RECORD's right, which the print route asks,
  // and a sheet of paper wants the whole window.
  if (key === "print") return true;

  if (key === "engineering-docs-register") return granted(key);

  if (key === "projects-planner") return granted(key);

  if (key === "projects-list" && segments[1] && granted(key)) {
    // `/projects-list/<id>` is the board and `/projects-list/<id>/plans/<planId>`
    // is one of its plans — both full-screen. `/projects-list/<id>/quotation` is
    // the in-frame viewer, and a bare `/plans` with no plan id is not a screen.
    if (segments[2] === "quotation") return false;
    if (segments[2] === "plans") return Boolean(segments[3]);
    return true;
  }

  return false;
}

/**
 * Which nav row is the current one.
 *
 * Answered against the sections this person may actually OPEN, so it is not a
 * pure function of the path: `/acme/finance` highlights Finance for somebody
 * granted it and falls back to the first row they do have for somebody who is
 * not — which is the same thing the page does when it refuses the section, so
 * the shell and the screen agree about where you are even when the answer is
 * "not here".
 *
 * `sections` is the VISIBLE list, already filtered by `visibleSections`.
 */
export function resolveActiveKey(
  requested: string,
  sections: readonly { key: string }[],
): string {
  // The fallback to `sections[0]` is what makes `/‹slug›` (no segment at all)
  // land on Main, and it is deliberate for a denied section too — see above.
  return (sections.find((s) => s.key === requested) || sections[0])?.key || "";
}
