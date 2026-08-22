// SEAM C — one module context, declared per department.
//
// There were ten of these, ~450 lines between them, and they were the same
// function ten times: resolve the studio, re-read the sections, index them by
// key, find the department's own section, refuse if it is missing, refuse if the
// caller may not view it, resolve the sub-sections with a fallback to the
// parent, then derive the same six flags under slightly different names.
//
// THE COPIES HAD DRIFTED, which is the actual argument for collapsing them. Some
// spelled the key list `sections.map(s => s.key)` and others `(sections || [])
// .map(x => x.key)`; some indexed with Object.fromEntries and one used
// Array.find; quality resolved no sub-sections at all and so quietly answered a
// different shape from its nine siblings. None of that was decided — it
// accumulated.
//
// AND EVERY ONE OF THEM RE-READ THE SECTIONS. studioContext already fetches the
// list and returns it; all ten called listSections(studio.id) again on the very
// next line. That is one wasted Redis round trip on every module request in the
// product — the audit's finding R1 — and it disappears here because the sections
// come from the context that already has them, not from a second read.
//
// Planting is unaffected: listSections reconciles missing sections as a side
// effect, and studioContext's call still does that. The second call was never
// doing anything the first had not already done.

import { studioContext, sectionNav, manageMap } from "@/lib/studios";
import { sectionViewable, sectionManageable, dashboardViewable } from "@/platform/access";
import type { PermissionSet, Role } from "@/platform/access";
import type { Section } from "@/platform/db/sections";
import type { Row } from "@/platform/db/store";

// A sub-section falls back to the parent so a studio created before the
// sub-section model still resolves rather than 500ing. A FOREIGN section never
// falls back: "this studio has no Technical section" is a real answer that the
// Sales screens are built to handle, and substituting the Sales section for it
// would point Technical's collections at Sales' key space.
// ---- what a module context is ----------------------------------------------
//
// AN INDEX SIGNATURE, DELIBERATELY, and it is not laziness. The flags this
// factory derives are NAMED BY THE SPEC — `canViewTickets`, `clientsSection`,
// whatever a department asked for — so the exact key set is a property of each
// call, not of the factory. Enumerating them here would mean a union that has
// to be edited every time a department adds a sub-section, which is a second
// place to keep in step with the first.
//
// The fields every context has regardless are named, so the ones that carry the
// answer — `access` above all — cannot go missing without the compiler saying
// so. That is the property the access suite asserts on this file.
/**
 * THE TWO ROWS EVERY CONTEXT CARRIES, named down to the fields every service
 * reads off them and open past that. `studio.id` appears in essentially every
 * function in every department; leaving it `unknown` would mean a cast at each
 * one, which is a hundred casts asserting the same obvious thing.
 *
 * Open past that on purpose: what else a studio or a collaborator holds belongs
 * to main and to HR respectively, and restating it here would be a second
 * definition free to drift from theirs.
 */
export type StudioRef = { id: string; name?: string; slug?: string } & Row;
export type CollaboratorRef = { id: string; alias?: string; role?: string } & Row;

export type ModuleContext = {
  studio: StudioRef;
  collaborator: CollaboratorRef;
  access: PermissionSet;
  roles: Role[];
  sections: Section[];
  section: Section;
  canManage: boolean;
  canViewDashboard: boolean;
  nav: unknown;
  manage: unknown;
  [named: string]: unknown;
};

/**
 * WHAT `extend` RECEIVES. The same context, but with the index signature
 * narrowed to what the factory has just put behind it: every unnamed key on a
 * context at this point is a `<name>Section` from `sub` or `foreign`, and a
 * foreign one is null when the studio has no such section.
 *
 * Nine departments destructure their own sub-section in `extend`. Off the bare
 * ModuleContext each of those is `unknown` — correct, and useless — so this is
 * where the factory says what it already knows rather than nine files casting.
 */
export type ExtendContext = ModuleContext & { [named: string]: Section | null };

/** What a department declares about itself. */
export type ModuleSpec = {
  root: string;
  sub?: Record<string, string | string[]>;
  foreign?: Record<string, string | string[]>;
  flags?: readonly string[];
  extend?: (ctx: ExtendContext, byKey: Record<string, Section>) => unknown;
};

const pick = (byKey: Record<string, Section>, keys: string | string[]): Section | null => {
  for (const k of ([] as string[]).concat(keys)) if (byKey[k]) return byKey[k];
  return null;
};

/**
 * Build a department's context resolver.
 *
 * spec:
 *   root      section key this module owns; missing → { error: "no-section" }
 *   sub       { name: key | [key, …] } — own sub-sections, falling back to root
 *   foreign   { name: key | [key, …] } — other departments', null when absent
 *   flags     names from `sub` to derive canView<Name>/canManage<Name> for
 *   extend    (ctx) => object, for whatever is genuinely this module's own
 *
 * Each resolver keeps the signature every caller already uses: (user, slug).
 */
export function moduleContext(spec: ModuleSpec) {
  const { root, sub = {}, foreign = {}, flags = [], extend } = spec;

  return async function resolve(user: unknown, slug: string): Promise<ModuleContext | { error: string }> {
    const context = await studioContext(user as { id?: unknown }, slug);
    if (context.error) return context as { error: string };

    // `access` is resolved once, in studioContext. Forwarding it is what lets
    // every service function guard itself without resolving anything again, and
    // `roles` travels with it because scopeFor needs both — a context carrying
    // one without the other is half an answer.
    // studioContext is still JavaScript, so what it hands back arrives untyped.
    // Named here, once, rather than at each of the fifteen uses below — and the
    // day studios.ts lands this line becomes a plain destructure again.
    const { studio, collaborator, access, roles, sections } = context as unknown as {
      studio: StudioRef; collaborator: CollaboratorRef; access: PermissionSet; roles: Role[]; sections: Section[];
    };

    const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
    const section = byKey[root];
    if (!section) return { error: "no-section" };

    const keys = sections.map((s) => s.key);

    // THE VIEW GUARD, asked of the permission set rather than of legacy grants.
    // Reading grants here is what once showed a section in the nav to anybody
    // holding a role but no grant — every new hire, once roles were in use —
    // and then refused them when they opened it.
    if (!sectionViewable(access, section.key, keys)) return { error: "forbidden" };

    const out = { studio, collaborator, access, roles, sections, section } as ModuleContext;

    for (const [name, key] of Object.entries(sub)) {
      out[`${name}Section`] = pick(byKey, key) || section;
    }
    for (const [name, key] of Object.entries(foreign)) {
      out[`${name}Section`] = pick(byKey, key);
    }

    // Seeing the module at all is the parent grant; the per-collection grants
    // are asked of the sub-section that owns each one, which is what makes a
    // sub-section grant mean something rather than being shadowed by its parent.
    out.canManage = sectionManageable(access, section.key, keys);
    for (const name of flags) {
      const target = (out[`${name}Section`] as Section) || section;
      const Name = name[0].toUpperCase() + name.slice(1);
      out[`canView${Name}`] = sectionViewable(access, target.key, keys);
      out[`canManage${Name}`] = sectionManageable(access, target.key, keys);
    }

    // May they open the module's OWN screen — the dashboard summarises
    // everything underneath it and is withheld on a right of its own.
    out.canViewDashboard = dashboardViewable(access, section.key);
    out.nav = sectionNav(studio, collaborator, sections, access);
    // Manage, per section key, so each screen asks about itself rather than
    // being handed its parent's answer.
    out.manage = manageMap(studio, collaborator, sections, access);

    return extend ? { ...out, ...(await extend(out as ExtendContext, byKey) as object) } : out;
  };
}
