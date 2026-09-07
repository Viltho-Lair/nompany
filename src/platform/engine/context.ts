// THE ENGINE'S OWN CONTEXT, AND WHY IT IS NOT A `moduleContext` CALL.
//
// The route used `moduleContext({ root: "administration", sub: { settings:
// "administration-settings" } })`, and that factory GUARDS THE SECTION before a
// handler runs: it refuses anybody holding neither an Administration right nor a
// right on one of the sub-sections it declares. A record type's right is
// `engine.<typeKey>.<verb>` and can never be one of those — the key is
// structural, minted from a row, and `SECTION_AREAS` is compile-time — so a
// document controller holding exactly `engine.transmittal.view` was refused
// `forbidden` BY THE CONTEXT, before the engine's own guard was ever asked. The
// right existed, was grantable, was stored, and opened nothing. Invariant 16.
//
// IT IS THE SAME DEFECT `src/modules/context.ts` RECORDS AT LENGTH for
// `crmSales.quotations` and `technicalContext` — "the right was one nothing
// could exercise (invariant 16)" — arriving through a different door, and this
// is that fix's sibling rather than a new idea. There the answer was to ask the
// question over the module's declared `sub` sections; here there is nothing to
// ask it over, because the section the grant is about does not exist until a
// studio declares the type.
//
// SO THIS GUARDS NOTHING BEYOND MEMBERSHIP, DELIBERATELY. The engine's gate is
// per-TYPE and lives in `records.ts`, which asks `engine.<typeKey>.<verb>` on
// every read and every write and answers notfound BEFORE forbidden, so a
// refusal never discloses which type keys a studio has. A section-level guard
// here would be a second gate over the same act, free to disagree with the
// first — and it is precisely the gate that refused the holder of the engine's
// own right.
//
// ACCESS IS STILL RESOLVED ONCE (invariant 3). `studioContext` resolves it,
// exactly as `moduleContext` has it resolved, and nothing here re-derives a
// permission or re-reads a section: this is a narrowing of that one answer, not
// a second route to it.
import { studioContext } from "@/lib/studios";
import type { ContextError, StudioRef, CollaboratorRef } from "@/modules/context";
import type { PermissionSet, Role } from "@/platform/access";
import type { Section } from "@/platform/db/sections";

/**
 * WHAT THE ROUTE'S HANDLERS RECEIVE. It satisfies `EngineCallerContext`
 * structurally — the service names what it needs and no more — and carries
 * `roles` and `sections` beside it because they cost nothing (studioContext
 * already holds both) and a context that drops half of what it was handed is a
 * context the next screen has to re-read for.
 */
export type EngineContext = {
  /** Always absent — the discriminant every `if (ctx.error) return` narrows on. */
  error?: undefined;
  studio: StudioRef;
  collaborator: CollaboratorRef;
  access: PermissionSet;
  roles: Role[];
  sections: Section[];
  settingsSection: Section;
};

/**
 * The same `(user, slug)` signature every module context has, so `route({
 * context })` types the handler off it the way it does off any other.
 */
export async function engineContext(
  user: unknown,
  slug: string,
): Promise<EngineContext | ContextError> {
  const context = await studioContext(user as { id?: unknown }, slug);
  if (context.error) return context;

  const { studio, collaborator, access, roles, sections } = context;

  // BOTH ENGINE COLLECTIONS ARE ADDRESSED UNDER administration-settings
  // (keys.ts), so this section is STORAGE and not a screen anybody opens.
  // Missing → `no-section`, the same answer every other context gives when the
  // studio has no section by the key it needs: the rows cannot be addressed at
  // all, which is not a permission question and must not be answered as one.
  const settingsSection = sections.find((s) => s.key === "administration-settings");
  if (!settingsSection) return { error: "no-section" };

  return { studio, collaborator, access, roles, sections, settingsSection };
}
