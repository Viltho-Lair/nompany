import { getRedisClient } from "@/platform/db/redis";
import { REG } from "@/platform/db/keys";
import { emitPlatform, PLATFORM } from "@/lib/data/events";
import { notifySuper, NOTIFY } from "@/lib/data/notifications";

// How people rate nompany, out of five.
//
// ONE FIELD PER USER on a single hash, so a rating is unique to them by
// construction — nobody can vote twice, and changing their mind replaces the
// old answer instead of adding a second one. It also means the whole
// distribution is one read.
//
// A DECLINED prompt is recorded as 0. That is not a rating and never counts
// towards satisfaction; it exists so somebody who closed the window is not
// asked again every time they open their studio.

const DECLINED = 0;
const PROMPT_AFTER_DAYS = 15;

const clampStars = (v) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
};

export async function setRating(userId, stars) {
  const value = clampStars(stars);
  if (!userId || value === null) return { error: "stars" };
  const client = await getRedisClient();
  await client.hSet(REG.ratings, String(userId), String(value));

  await emitPlatform({
    type: PLATFORM.ratingLeft,
    title: `nompany rated ${value}/5`,
    body: "Someone answered the rating prompt.",
    refId: String(userId),
  });
  // A poor score is worth interrupting an owner over; a good one belongs in the
  // history with the rest. The bell is a limited resource — everything put in
  // it makes everything else in it less likely to be read.
  if (value <= 2) {
    await notifySuper({
      type: NOTIFY.system,
      title: `Low rating: ${value}/5`,
      body: "Someone rated nompany poorly.",
      tone: "danger",
    });
  }
  return { rating: value };
}

// Closing the window without answering. Recorded so the prompt stops, but kept
// distinct from a score so it cannot be mistaken for one.
export async function declineRating(userId) {
  if (!userId) return { error: "user" };
  const client = await getRedisClient();
  await client.hSetNX(REG.ratings, String(userId), String(DECLINED));
  return { declined: true };
}

// What this user has already said, or null if they have never been asked.
// 0 means they declined — answered in the sense that matters here.
export async function getRating(userId) {
  if (!userId) return null;
  const client = await getRedisClient();
  const v = await client.hGet(REG.ratings, String(userId));
  return v == null ? null : Number(v);
}

// Ask only once the user has had the product long enough to have an opinion,
// and only if they have not already answered.
export function eligibleSince(createdAt, now = Date.now()) {
  const created = Date.parse(createdAt || "");
  if (!Number.isFinite(created)) return false;
  return now - created >= PROMPT_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

export async function shouldPrompt(user, now = Date.now()) {
  if (!user?.id || !eligibleSince(user.createdAt, now)) return false;
  return (await getRating(user.id)) == null;
}

// CUSTOMER SATISFACTION: the share of real ratings that are 4 or 5, against
// those that are 3 or below. Declines are excluded — someone who did not answer
// is not an unhappy customer, and counting them as one would let a quiet month
// look like a bad one.
export async function satisfaction() {
  const client = await getRedisClient();
  const all = await client.hGetAll(REG.ratings).catch(() => ({}));
  let positive = 0;
  let negative = 0;
  for (const raw of Object.values(all || {})) {
    const stars = clampStars(raw);
    if (stars === null) continue;
    if (stars >= 4) positive += 1; else negative += 1;
  }
  const total = positive + negative;
  return {
    positive,
    negative,
    total,
    // Null rather than 0 when nobody has rated: "no opinions yet" and "everyone
    // is unhappy" must not render the same.
    positivePct: total > 0 ? Math.round((positive / total) * 100) : null,
    negativePct: total > 0 ? 100 - Math.round((positive / total) * 100) : null,
  };
}
