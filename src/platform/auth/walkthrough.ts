import { U } from "@/platform/db/keys";
import { editJSON } from "@/platform/db/store";
import { getProfile, ensureSessionState, patchSessionState, type Profile } from "./users";
import { currentSession } from "./identity";
import { tourStatuses, withTourOff, type Tour } from "@/shared/walkthrough";

// THE WALKTHROUGH'S TWO STORES — see shared/walkthrough for why there are two.
// The person's "don't show this again" is on their profile; "already shown" is
// on the session state, so it lapses with the sign-in and the tour returns at
// the next one.

/** Whether each tour is shown on this request, for the signed-in person. */
export async function walkthroughFor(userId: string) {
  const [profile, { state }] = await Promise.all([getProfile(userId), currentSession()]);
  return tourStatuses(profile?.walkthroughOff, state?.toursSeen, state?.scope);
}

/**
 * This sign-in has been shown `tour`. Written when the tour OPENS rather than
 * when it closes, so a person who closes the tab halfway is not walked through
 * it again on every page load of the same sign-in.
 *
 * `ensureSessionState` first: a session minted before 18/09/2026 has no state
 * document, and patching nothing would quietly show the tour on every load.
 */
export async function markTourSeen(tour: Tour) {
  const { digest } = await currentSession();
  if (!digest) return;
  await ensureSessionState(digest);
  await patchSessionState(digest, (cur) =>
    (cur.toursSeen || []).includes(tour) ? null : { ...cur, toursSeen: [...(cur.toursSeen || []), tour] });
}

/**
 * Turn a tour off for good, or back on. A FUNCTION PATCH on the profile
 * (invariant 8): two switches flipped at once from two tabs must both land,
 * and a merge of the whole map would let the second erase the first.
 */
export async function setTourOff(userId: string, tour: Tour, off: boolean) {
  const profile = await editJSON<Profile, Profile>(U.profile(userId), (cur) => {
    const next = { ...(cur || {}), walkthroughOff: withTourOff(cur?.walkthroughOff, tour, off) };
    return { next, result: next };
  });
  return profile.walkthroughOff || {};
}
