import { route, refused } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { NO_SCREEN_YET } from "@/platform/access";
import { moduleContext } from "@/modules/context";
import { updateSection, REQUIRED_SECTIONS } from "@/platform/db/sections";
import { tradeSuggestionFor } from "@/modules/main/studios";
import type { Section } from "@/platform/db/sections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHICH SECTIONS A STUDIO USES.
//
// `enabled` HAS BEEN ON EVERY SECTION ROW SINCE THEY WERE ROWS, and
// `visibleSections` has always filtered on it — a disabled section is hidden
// whatever rights the reader holds. What did not exist was any way to SET it: a
// studio could not turn Manufacturing off, and a contractor with no factory
// carried it in the sidebar because the product ships fifteen sections and
// assumes all fifteen apply.
//
// IT IS ADMINISTRATION'S, not each department's. A studio deciding it does not
// do manufacturing is one decision about the studio, and putting the switch
// inside each section would mean the people who cannot see a section are the
// only ones who could turn it back on.
const settingsContext = moduleContext({
  root: "administration",
  sub: { settings: "administration-settings" },
});

const spec = {
  auth: "studio", context: settingsContext, body: true, name: "administration-settings",
};

export const PUT = route(spec, async (c) => {
  const denied = requirePermission(c.access, "administration.settings.edit");
  if (denied) return denied;

  const id = String(c.body?.id ?? "").trim();
  if (!id) return { error: "missing" };
  if (typeof c.body?.enabled !== "boolean") return { error: "enabled" };

  const section = (c.sections || []).find((s) => s.id === id);
  if (!section) return { error: "notfound" };

  // MAIN AND ADMINISTRATION ARE NOT OPTIONAL — `REQUIRED_SECTIONS` says which
  // and why, and the screen greys the same three off the same list.
  if ((REQUIRED_SECTIONS as readonly string[]).includes(section.key)) {
    return { error: "required-section" };
  }

  // A SECTION WITH NO SCREEN CANNOT BE TURNED ON. `NO_SCREEN_YET` names the
  // sections that render nothing; enabling one would put a row in the sidebar
  // that leads to an empty page, which is the exact thing that list exists to
  // prevent. Turning one OFF is allowed and is a no-op, so a studio that
  // deselects everything it does not do is not refused for tidying.
  // The cast is the seam: NO_SCREEN_YET is `as const`, so `includes` will only
  // accept one of its own four literals — and the whole point here is to ask
  // about an arbitrary section key.
  if (c.body.enabled && (NO_SCREEN_YET as readonly string[]).includes(section.key)) {
    return { error: "no-screen" };
  }

  const branch = await setBranch(c.studio.id, c.sections || [], section, c.body.enabled);
  if (!branch) return { error: "notfound" };
  const { updated, children } = branch;

  return {
    ok: true,
    section: { id: updated.id, key: updated.key, enabled: updated.enabled },
    // What else moved, so the screen can redraw the branch rather than
    // showing children that disagree with the row the person just clicked.
    children: children.map((s) => ({ id: s.id, key: s.key, enabled: c.body.enabled })),
  };
});

/**
 * SWITCH A ROOT AND EVERYTHING UNDER IT — one door for the single toggle above
 * and for applying a trade's offer below, so the two cannot disagree about what
 * "off" means for a branch.
 *
 * A ROOT CARRIES ITS CHILDREN, both ways, and this is not a convenience.
 *
 * StudioFrame PROMOTES a visible child whose parent is hidden to the top
 * level — deliberately, because a sub-section can be granted without its
 * parent. So switching a section OFF while its children stayed on would
 * not hide it; it would scatter its sub-sections across the top of the nav
 * with no heading over them.
 *
 * And the other direction matters just as much now that creation gates by
 * trade: a consultancy that later takes on manufacturing switches
 * Manufacturing back on and would otherwise get an empty section, because
 * its four engine registers were planted off with it.
 *
 * ENGINE REGISTERS ARE CHILDREN TOO. They are matched by `parentId` rather
 * than by key prefix: `engine-workorder` shares no prefix with
 * `manufacturing`, which is the same trap `parentKeyMap` exists for.
 */
async function setBranch(studioId: string, all: readonly Section[], section: Section, enabled: boolean) {
  const updated = await updateSection(studioId, section.id, { enabled });
  if (!updated) return null;
  const children = all.filter((s) => s.parentId === updated.id);
  for (const child of children) {
    if (child.enabled === enabled) continue;
    await updateSection(studioId, child.id, { enabled });
  }
  return { updated, children };
}

// APPLYING WHAT THE STUDIO'S TRADE SUGGESTS.
//
// The trade gate runs once, in `createStudio`, deliberately: a section
// vanishing from a live sidebar overnight is a support ticket. What an EXISTING
// studio gets instead is an offer on the Sections panel — what its field of
// work would switch — and this is its button. Same right as the single toggle.
//
// THE SCREEN SENDS WHAT IT SHOWED, AND ONLY WHAT IS STILL SUGGESTED IS APPLIED.
// The offer is recomputed here rather than taken from the request, and the
// INTERSECTION is applied: a stale screen cannot switch off a section somebody
// has since decided to keep, and a hand-made request cannot switch off one the
// trade never suggested. The departments register narrows both its read and its
// write for the same reason.
export const POST = route(spec, async (c) => {
  const denied = requirePermission(c.access, "administration.settings.edit");
  if (denied) return denied;
  if (c.body?.action !== "apply-trade") return { error: "action" };

  const all = c.sections || [];
  // `fieldOfWork` rides on the studio record the context carries; `StudioRef`
  // names only the fields every context needs, so it is read through here.
  const field = (c.studio as { fieldOfWork?: unknown }).fieldOfWork;
  const offer = tradeSuggestionFor(field, all);
  const shown = (v: unknown) => new Set(Array.isArray(v) ? v.map(String) : []);
  const offShown = shown(c.body.off);
  const onShown = shown(c.body.on);
  const off = offer.off.filter((k) => offShown.has(k));
  const on = offer.on.filter((k) => onShown.has(k));
  if (!off.length && !on.length) return { error: "nothing-to-apply" };

  const changed: { key: string; enabled: boolean }[] = [];
  for (const [keys, enabled] of [[off, false], [on, true]] as const) {
    for (const key of keys) {
      const root = all.find((s) => !s.parentId && s.key === key);
      if (root && (await setBranch(c.studio.id, all, root, enabled))) changed.push({ key, enabled });
    }
  }
  return { ok: true, changed };
});
