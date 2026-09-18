// GROUPS OF STUDIOS, AND THEIR BOOKS READ AS ONE (./consolidation).
//
// THE OWNER'S CHOICE, 18/09/2026: each company is its own studio, unchanged,
// and a group links studios ONE PERSON OWNS. Nothing inside a studio changes —
// no row gains an entity, no posting path learns about companies.
//
// WHO MAY DO WHAT:
//   - GROUPING is the owner's alone (the studio row's `ownerUserId`): only the
//     person who owns both studios can put them together. An Admin of one
//     studio cannot reach into another's books by grouping it.
//   - READING THE CONSOLIDATION needs `finance.reports.view` in EVERY member,
//     resolved by `studioContext` for each one — the same door every request
//     passes, so invariants 2 and 3 hold per studio: a reader who is not a
//     member of one company learns nothing about it, not even its name.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { readArr, editArr } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { studioContext } from "@/lib/studios";
import { listOwnedStudios, getStudioById, updateStudio } from "@/modules/main/studios";
import type { StudioRow } from "@/modules/main/studios";
import { getExchangeSnapshot } from "@/lib/data/exchangeRates";
import { rateFor } from "./fx";
import { consolidate } from "./consolidation";
import type { Member } from "./consolidation";
import type { FinanceContext, JournalEntry, Account } from "./types";

type Group = { id: string; name: string; ownerUserId: string; createdAt: string };

const Entries = repo<JournalEntry>("journalEntries");
const Accounts = repo<Account>("accounts");
const str = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);
const makeId = () => `grp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const userId = (user: unknown) => String((user as { id?: unknown } | null)?.id ?? "");
const isOwner = (ctx: FinanceContext, user: unknown) =>
  Boolean(userId(user)) && String((ctx.studio as { ownerUserId?: unknown }).ownerUserId || "") === userId(user);
const groupIdOf = (s: unknown) => String((s as { groupId?: unknown } | null)?.groupId || "");

async function groupOf(ctx: FinanceContext): Promise<Group | null> {
  const id = groupIdOf(ctx.studio);
  if (!id) return null;
  return (await readArr<Group>(REG.studioGroups)).find((g) => g.id === id) || null;
}

/**
 * THE GROUP THIS STUDIO IS IN, and — for the owner — which of their studios
 * may join it. The member list is the owner's to see here; a reader who is not
 * the owner sees the consolidation (if they may read every member) and nothing
 * about studios they cannot open.
 */
export async function groupView(ctx: FinanceContext, user: unknown) {
  const denied = requirePermission(ctx.access, "finance.reports.view");
  if (denied) return denied;
  const group = await groupOf(ctx);
  const owner = isOwner(ctx, user);
  let members: { id: string; name: string; slug: string }[] = [];
  let joinable: { id: string; name: string }[] = [];
  if (owner) {
    const owned = await listOwnedStudios(userId(user));
    members = group ? owned.filter((s) => groupIdOf(s) === group.id).map((s) => ({ id: s.id, name: String(s.name || ""), slug: String(s.slug || "") })) : [];
    joinable = owned.filter((s) => !groupIdOf(s) && s.id !== ctx.studio.id).map((s) => ({ id: s.id, name: String(s.name || "") }));
  }
  return { group: group ? { id: group.id, name: group.name } : null, isOwner: owner, members, joinable };
}

/** Create a group with this studio in it. The owner's act. */
export async function createGroup(ctx: FinanceContext, user: unknown, body: Record<string, unknown>) {
  // THE RIGHT TO THE SCREEN FIRST, then ownership: holding the reports right in
  // this studio is what brings anybody here, and only the owner may group.
  const denied = requirePermission(ctx.access, "finance.reports.view");
  if (denied) return denied;
  if (!isOwner(ctx, user)) return { error: "owner-only" as const };
  if (groupIdOf(ctx.studio)) return { error: "already-grouped" };
  const name = str(body?.name);
  if (!name) return { error: "name" };
  const group: Group = { id: makeId(), name, ownerUserId: userId(user), createdAt: new Date().toISOString() };
  await editArr<Group, Group>(REG.studioGroups, (rows) => ({ next: [...rows, group], result: group }));
  await updateStudio(ctx.studio.id, (row) => (groupIdOf(row) ? {} : { groupId: group.id }));
  return { group };
}

/** Add one of the owner's own studios to this studio's group. */
export async function addToGroup(ctx: FinanceContext, user: unknown, studioId: unknown) {
  // THE RIGHT TO THE SCREEN FIRST, then ownership: holding the reports right in
  // this studio is what brings anybody here, and only the owner may group.
  const denied = requirePermission(ctx.access, "finance.reports.view");
  if (denied) return denied;
  if (!isOwner(ctx, user)) return { error: "owner-only" as const };
  const group = await groupOf(ctx);
  if (!group) return { error: "no-group" };
  const target = await getStudioById(str(studioId, 60));
  // THE SAME OWNER, OR NOTHING: grouping somebody else's studio would hand this
  // group's readers a door into books they were never let into.
  if (!target || String(target.ownerUserId || "") !== userId(user)) return { error: "not-yours" };
  if (groupIdOf(target)) return { error: "already-grouped" };
  const updated = await updateStudio(target.id, (row: StudioRow) => (groupIdOf(row) ? {} : { groupId: group.id }));
  return updated && groupIdOf(updated) === group.id ? { added: target.id } : { error: "already-grouped" };
}

/** Take a studio out of the group — any member, the owner's act. */
export async function removeFromGroup(ctx: FinanceContext, user: unknown, studioId: unknown) {
  // THE RIGHT TO THE SCREEN FIRST, then ownership: holding the reports right in
  // this studio is what brings anybody here, and only the owner may group.
  const denied = requirePermission(ctx.access, "finance.reports.view");
  if (denied) return denied;
  if (!isOwner(ctx, user)) return { error: "owner-only" as const };
  const group = await groupOf(ctx);
  if (!group) return { error: "no-group" };
  const target = await getStudioById(str(studioId, 60));
  if (!target || String(target.ownerUserId || "") !== userId(user) || groupIdOf(target) !== group.id) return { error: "not-a-member" };
  await updateStudio(target.id, (row: StudioRow) => (groupIdOf(row) === group.id ? { groupId: "" } : {}));
  return { removed: target.id };
}

/**
 * THE GROUP'S BOOKS AS ONE, in this studio's currency. Every member is opened
 * through `studioContext` as the reader; one the reader may not read the
 * reports of refuses the whole consolidation, without saying which — its name
 * is part of what they were not let into.
 */
export async function consolidated(ctx: FinanceContext, user: unknown, window: { from?: string; to?: string }) {
  const denied = requirePermission(ctx.access, "finance.reports.view");
  if (denied) return denied;
  const group = await groupOf(ctx);
  if (!group) return { error: "no-group" };
  const all = (await readArr<StudioRow>(REG.studios)).filter((s) => groupIdOf(s) === group.id);
  const reporting = String(ctx.studio.currency || "");
  if (!reporting) return { error: "no-studio-currency" };
  const snapshot = await getExchangeSnapshot();
  const members: Member[] = [];
  for (const s of all) {
    const member = await studioContext(user as { id?: unknown }, String(s.slug || ""));
    if ("error" in member && member.error) return { error: "not-every-member" };
    const m = member as Exclude<typeof member, { error: string }>;
    if (requirePermission(m.access, "finance.reports.view")) return { error: "not-every-member" };
    const section = m.sections.find((x) => x.key === "finance-ledger") || m.sections.find((x) => x.key === "finance");
    if (!section) continue;
    const scope = { studio: m.studio, section };
    const [accounts, entries] = await Promise.all([Accounts.find(scope), Entries.find(scope)]);
    const currency = String(m.studio.currency || "");
    const rate = !currency ? null : currency === reporting ? 1 : rateFor(null, snapshot.rates, currency, reporting);
    members.push({ studioId: s.id, name: String(s.name || ""), currency, rate, accounts, entries });
  }
  return { group: { id: group.id, name: group.name }, ...consolidate(members, { ...window, currency: reporting }) };
}
