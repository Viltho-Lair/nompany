// THE POOL TRANSITION, and what an action is still used by. Kept apart from the
// settings route so the route that owns the studio write stays a thin boundary,
// and so this logic is unit-testable without a request.

import { SERVICE_ACTIONS } from "@/shared/fieldsOfWork";
import { itemScopesForStudio } from "@/modules/inventory/inventory";
// Membership only — NOT inventoryContext. See serviceActionUsage below: the
// caller here already proved studio.settings.edit at its own route, and that
// right does not imply inventory.items.view, so gating this read on the
// caller's inventory grant would make the retire-vs-drop decision only as
// complete as whatever permissions happened to be missing.
import { studioContext } from "@/lib/studios";
// Same import the rest of the codebase uses for this shape (see
// src/lib/chatAccess.ts) — there is no `@/platform/auth/types`, and
// moduleContext's own `resolve` types its `user` parameter `unknown`, so this
// is a documentation choice, not a widening: it says what a caller actually
// has in hand (`await currentUser()`) without inventing a second User type
// that could drift from users.ts's.
import type { User } from "@/platform/auth/users";

const STANDARD = new Set<string>(SERVICE_ACTIONS);

function dedupe(list: string[], cap = 40): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const raw of list) {
    const name = String(raw ?? "").trim().slice(0, 80);
    const key = name.toLowerCase();
    if (name && !seen.has(key)) { seen.add(key); out.push(name); }
    if (out.length >= cap) break;
  }
  return out;
}

// An edited pool may hold any of the 20 standard actions, plus any legacy custom
// name a studio already had (so a pre-existing free-text list is not wiped the
// moment the editor opens). New non-standard names are refused — the manual
// "Other" service action is deferred (see the spec's north star).
export function cleanNextActive(raw: unknown, prevActive: string[]): string[] {
  const legacy = new Set(prevActive.map((s) => s.toLowerCase()));
  const list = (Array.isArray(raw) ? raw : []).map((s) => String(s ?? "").trim().slice(0, 80));
  return dedupe(list.filter((name) => STANDARD.has(name) || legacy.has(name.toLowerCase())));
}

// Pure. Removing a referenced action retires it (carry); removing an unreferenced
// one drops it; re-adding un-retires. Retired is always pruned to what is still
// referenced, so it never grows unbounded.
export function nextPool(input: {
  prevActive: string[]; prevRetired: string[]; nextActive: string[]; referenced: Set<string>;
}): { serviceActions: string[]; retiredServiceActions: string[] } {
  const active = dedupe(input.nextActive);
  const activeSet = new Set(active.map((s) => s.toLowerCase()));
  const removed = [...input.prevActive, ...input.prevRetired]
    .filter((a) => !activeSet.has(a.toLowerCase()));
  const retired = dedupe(removed.filter((a) => input.referenced.has(a)));
  return { serviceActions: active, retiredServiceActions: retired };
}

// How many registered items list each action in their scope. One inventory read;
// lives on the dedicated endpoint, never on the settings route's wave.
//
// DELIBERATELY NOT `inventoryContext`. That resolver gates on the CALLER's
// inventory-view permission, but this function feeds a retire-vs-drop decision
// guarded upstream by studio.settings.edit — a role can hold that without
// holding any inventory.* right at all. Gating this read the same way meant an
// admin with exactly that combination could remove a still-referenced action
// and have it silently DROPPED (neither active nor retired) rather than
// retired, because the "referenced" set came back empty on a forbidden read.
// `itemScopesForStudio` reads by studio id alone — membership + settings
// authority is already proven by the caller's own route guard, and this needs
// no second permission to be complete.
export async function serviceActionUsage(user: User, slug: string): Promise<Record<string, number>> {
  const context = await studioContext(user, slug);
  if (context.error) return {};
  const scopes = await itemScopesForStudio(context.studio.id);
  const counts: Record<string, number> = {};
  for (const scope of scopes) for (const a of scope) {
    counts[a] = (counts[a] ?? 0) + 1;
  }
  return counts;
}
