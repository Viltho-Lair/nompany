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

// A sub-section falls back to the parent so a studio created before the
// sub-section model still resolves rather than 500ing. A FOREIGN section never
// falls back: "this studio has no Technical section" is a real answer that the
// Sales screens are built to handle, and substituting the Sales section for it
// would point Technical's collections at Sales' key space.
const pick = (byKey, keys) => {
  for (const k of [].concat(keys)) if (byKey[k]) return byKey[k];
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
export function moduleContext(spec) {
  const { root, sub = {}, foreign = {}, flags = [], extend } = spec;

  return async function resolve(user, slug) {
    const context = await studioContext(user, slug);
    if (context.error) return context;

    // `access` is resolved once, in studioContext. Forwarding it is what lets
    // every service function guard itself without resolving anything again, and
    // `roles` travels with it because scopeFor needs both — a context carrying
    // one without the other is half an answer.
    const { studio, collaborator, access, roles, sections } = context;

    const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
    const section = byKey[root];
    if (!section) return { error: "no-section" };

    const keys = sections.map((s) => s.key);

    // THE VIEW GUARD, asked of the permission set rather than of legacy grants.
    // Reading grants here is what once showed a section in the nav to anybody
    // holding a role but no grant — every new hire, once roles were in use —
    // and then refused them when they opened it.
    if (!sectionViewable(access, section.key, keys)) return { error: "forbidden" };

    const out = { studio, collaborator, access, roles, sections, section };

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
      const target = out[`${name}Section`] || section;
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

    return extend ? { ...out, ...(await extend(out, byKey)) } : out;
  };
}
