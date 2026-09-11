import { route, refused } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { NO_SCREEN_YET } from "@/platform/access";
import { moduleContext } from "@/modules/context";
import { updateSection, REQUIRED_SECTIONS } from "@/platform/db/sections";
import { tradeSuggestionFor, updateStudio } from "@/modules/main/studios";
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

// APPLYING THE STUDIO'S CHOICE OF SECTIONS FOR ITS TRADE.
//
// The trade gate runs once, in `createStudio`, deliberately: a section
// vanishing from a live sidebar overnight is a support ticket. What an EXISTING
// studio gets instead is a checklist on the Sections panel — every section the
// trade may judge, the trade's own ticked — and this is its button. Same right
// as the single toggle.
//
// THE PERSON'S TICKS ARE APPLIED, NOT THE TRADE'S. This used to apply only what
// the trade itself still suggested, which is exactly what made the panel useless
// for keeping an extra: tick Manufacturing to keep it and the old intersection
// switched it off anyway. The owner asked for the trade's set PLUS whatever else
// they bring, so `on` is the whole ticked list and every other choice goes off.
//
// WHAT MAY MOVE IS STILL THE SERVER'S TO SAY. The choices are recomputed here,
// never read from the request, so a hand-made body cannot touch a required
// section, a system row or one the studio added itself. And only a choice the
// screen SHOWED moves (`shown`): one that became choosable after the page
// loaded is left alone rather than switched off because nobody ticked a box
// they never saw.
export const POST = route(spec, async (c) => {
  const denied = requirePermission(c.access, "administration.settings.edit");
  if (denied) return denied;
  if (c.body?.action !== "apply-trade") return { error: "action" };

  const all = c.sections || [];
  // `fieldOfWork` rides on the studio record the context carries; `StudioRef`
  // names only the fields every context needs, so it is read through here.
  const field = String((c.studio as { fieldOfWork?: unknown }).fieldOfWork ?? "").trim();
  const offer = tradeSuggestionFor(field, all);
  if (!offer.choices.length) return { error: "nothing-to-apply" };

  const list = (v: unknown) => new Set(Array.isArray(v) ? v.map(String) : []);
  const shown = list(c.body.shown);
  const picked = list(c.body.on);

  const changed: { key: string; enabled: boolean }[] = [];
  for (const { key } of offer.choices) {
    if (!shown.has(key)) continue;
    const root = all.find((s) => !s.parentId && s.key === key);
    if (!root) continue;
    const enabled = picked.has(key);
    // The PUT's own refusal: a section with no screen is never switched on.
    if (enabled && (NO_SCREEN_YET as readonly string[]).includes(key)) continue;
    if ((root.enabled !== false) === enabled) continue;
    if (await setBranch(c.studio.id, all, root, enabled)) changed.push({ key, enabled });
  }

  // ANSWERED FOR THIS TRADE, so the settings read stops offering it. Without
  // this the checklist came back on every visit the moment a studio kept one
  // extra section, because its switches would never again equal the trade's
  // set — the "cannot be dismissed" gap sections.md listed. Written even when
  // nothing moved: applying the trade's set unchanged is still an answer. A
  // different trade later is a different question, and the offer returns.
  await updateStudio(c.studio.id, { sectionsTrade: field });
  return { ok: true, changed };
});
