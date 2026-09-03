import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { currentUser, needsQuestionnaire } from "@/platform/auth/identity";
import { studioContext, canAdminister, visibleSections, recordStudioVisit } from "@/lib/studios";
import { getProfile } from "@/platform/auth/users";
import { loadCatalogues, planOf, hasLiveChat } from "@/lib/plans";
import { chatDisplayName } from "@/lib/chatConstants";
import { studioLocale, preferredLocale, UI_LANG_COOKIE } from "@/shared/i18n";
import { chatsUsed, allowanceOf } from "@/lib/data/chatUsage";

// EVERYTHING A STUDIO REQUEST RESOLVES, RESOLVED ONCE.
//
// THE DEFECT THIS EXISTS FOR. The shell now lives in `layout.js` and the screen
// in `page.js`, and both need the same answers: which studio, who this is, what
// they may open. Two components asking the same questions is two sets of round
// trips — under PG_TRANSPORT=gateway, two sets of HTTPS calls to Cloud Run,
// because the gateway sends one statement per call and never batches. Splitting
// the shell out would have COST a full duplicate render rather than saving one,
// which is the opposite of the point.
//
// WHY REACT'S `cache` AND NOT `withRequestCache`. The repo already has a
// request-scoped cache and it does not reach here. `withRequestCache` is
// AsyncLocalStorage, established by whoever calls `withRequest` — and a layout
// and a page are two separate calls, so they get two separate maps. The page's
// render is not nested inside the layout's callback; Next creates the children
// element outside it and React renders it on its own. `cache()` is scoped to the
// REQUEST's render pass instead, which is exactly the lifetime that spans a
// layout and its page, and it is the only mechanism that does.
//
// Both still stand: `withRequestCache` de-duplicates within one component's
// reads, and this de-duplicates across the two components. They are not two
// answers to one question.
//
// THE REFUSALS LIVE HERE TOO, and that is deliberate rather than convenient.
// `redirect()` and `notFound()` throw, so a refusal raised inside this function
// reaches whichever of the two called it first and ends the render for both —
// there is no window in which the layout has refused and the page has not.
// Putting them in the layout alone would have left the page free to run with an
// unresolved studio, which is the shape invariant 2 exists to prevent.
//
// The ONE refusal that cannot throw is the non-member: it renders a screen
// rather than a status (invariant 2 — a slug is a public address, so existence
// was never the secret; the contents are). It comes back as a value, and the
// layout draws it. See the note in layout.js about why the page then draws
// nothing.
// SPLIT IN TWO, AND THE SPLIT IS WHERE THE SAVING ACTUALLY COMES FROM.
//
// It is tempting to think a layout saves reads because it "renders once". It
// does not. On a soft navigation Next re-renders only the segment that changed
// — the PAGE — and serves the layout from the client's router cache. The layout
// not running is exactly why the page cannot lean on it: whatever the page asks
// for, it asks for on every single section click.
//
// So the question that decides the round-trip count is not "who renders" but
// "what does the PAGE need". It needs the studio, the person, their access and
// their sections. It does NOT need the plan catalogues, the profile or the chat
// allowance — those exist to draw the sidebar's package tags, the avatar and
// the chat button, none of which the page renders any more.
//
// `studioRequest` is that core, and the page stops there. `studioShell` adds the
// three shell-only reads on top and only the layout calls it. A section click
// therefore pays for the core alone; the extras are paid once, on the full load
// that builds the shell, and not again until something makes the layout re-render.
//
// Both are `cache`d, so a full page load — where the layout and the page BOTH
// render — still resolves the core exactly once between them.
export const studioRequest = cache(async () => {
  const slug = (await headers()).get("x-studio-slug") || "";
  // READ ONCE. The screens that fire before a studio is resolved — you are not
  // a member of this one — still have to be in the reader's language, and they
  // have no tenant default to fall back to. Everything below that does have one
  // reuses this value rather than reading the jar again.
  const uiLang = (await cookies()).get(UI_LANG_COOKIE)?.value;
  if (!slug) notFound();

  const user = await currentUser();
  // BOTH DESTINATIONS ARE LOCALE-ADDRESSED and both were pinned to /en, so an
  // Arabic reader bounced out of a studio landed on an English login and an
  // English survey. There is no studio record to consult on either path — the
  // person is not signed in, or has not finished registering — so the cookie is
  // the only thing that knows, and it is exactly what it is for.
  if (!user) redirect(`/${preferredLocale(uiLang)}/login`);
  // Same gate as the account hub, checked BEFORE membership: someone who has
  // not answered the survey has no business inside a studio either, and this
  // way the studio's own 404-for-non-members never fires first and hides why.
  if (await needsQuestionnaire(user.id)) redirect(`/${preferredLocale(uiLang)}/questionnaire`);

  const context = await studioContext(user, slug);
  // THESE TWO ARE NOT THE SAME SCREEN. A missing slug 404s; a real studio you
  // are not in gets NotAMember, which names the slug and tells you to ask an
  // admin. That is deliberate, not a leak — requestJoinByCode exists so
  // somebody can type a slug they were told, so existence was never the secret.
  // The contents are: no row, no name, no count, no section reaches anyone who
  // is not a collaborator.
  if (context.error) {
    if (context.error === "forbidden") {
      return { error: "forbidden", slug, locale: preferredLocale(uiLang) };
    }
    notFound();
  }

  // `access` comes from studioContext; dropping it is what silently disarms
  // every check downstream. `sections` comes from there too — studioContext
  // reads them in the same wave as the collaborator and the roles and returns
  // them for its callers, so asking listSections again would be a round trip
  // for rows already in hand.
  const { studio, collaborator, access, sections: allSections } = context;

  // WHICH LANGUAGE THIS PERSON READS THE SHELL IN. The studio's own setting is
  // the default — what the company was set up in — and a cookie the person set
  // from the header menu overrides it. Resolved on the server so `lang`/`dir`
  // and the dictionaries all ship in the first byte of HTML: a shell that
  // mirrored itself after paint would flash the whole layout the wrong way
  // round on every load. Costs no round trip: the studio record is already in
  // hand and the cookie rode in on the request.
  const locale = preferredLocale(uiLang, studioLocale(studio));

  // Tally the visit so the account overview can rank studios by how much this
  // person actually uses them. Fire-and-forget: ranking is a convenience, and a
  // failed tally must never cost the page a render or a millisecond of latency.
  // Once per request rather than once per component, because this is cached.
  recordStudioVisit(user.id, studio.id).catch(() => {});

  const admin = canAdminister(access);
  const sections = visibleSections(studio, collaborator, allSections, access);

  return { user, studio, collaborator, access, allSections, sections, locale, admin };
});

/**
 * The core plus what only the SIDEBAR needs. The layout's call; nothing else's.
 *
 * Three reads live here rather than in `studioRequest` — the plan catalogues,
 * this person's profile and the studio's chat usage — because all three exist
 * to draw shell furniture: the package and tier tags, the avatar's display
 * name, and whether the chat button is offered and how much allowance is left.
 * A section click renders none of that, so a section click should not pay for
 * it, and after the split it does not.
 */
export const studioShell = cache(async () => {
  const core = await studioRequest();
  if (core.error) return core;

  const { user, studio, collaborator } = core;
  const [catalogues, profile] = await Promise.all([loadCatalogues(), getProfile(user.id)]);
  const plan = planOf(studio, catalogues.packages, catalogues.tiers);

  // Whether the package includes live chat with nompany at all, and how much of
  // this month's allowance is left. The button is DRAWN whenever the package
  // has chat and disabled when the allowance is spent — a button that vanishes
  // leaves somebody wondering what they did wrong. /api/chat/start decides the
  // same question again for the request, which is the answer that binds.
  const chatUsed = hasLiveChat(plan) ? await chatsUsed(studio.id) : 0;
  const chat = {
    enabled: hasLiveChat(plan),
    userName: chatDisplayName({ alias: collaborator.alias, profile, email: user.email }),
    ...allowanceOf(chatUsed, plan.chatPerMonth),
  };

  return { ...core, plan, chat };
});
