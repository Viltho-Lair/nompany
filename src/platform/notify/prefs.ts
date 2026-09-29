// A PERSON'S NOTIFICATION SETTINGS — read and written. The rule of what they
// mean is `shared/notificationPrefs`, pure; this is only where they live
// (`u:<id>:notifyPrefs`, keys.ts), which dies with the user via `u:<id>:*`.

import { U } from "@/platform/db/keys";
import { getJSON, getJSONMany, editJSON } from "@/platform/db/store";
import { cleanPrefs, type NotificationPrefs } from "@/shared/notificationPrefs";

/** This person's settings, complete — the defaults where nothing is stored. */
export async function readPrefs(userId: string): Promise<NotificationPrefs> {
  return cleanPrefs(userId ? await getJSON(U.notifyPrefs(userId)) : null);
}

/** Several people's, in one round trip — the sender asks for every recipient. */
export async function readPrefsMany(userIds: readonly string[]): Promise<Map<string, NotificationPrefs>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const rows = await getJSONMany(ids.map((id) => U.notifyPrefs(id)));
  return new Map(ids.map((id, i) => [id, cleanPrefs(rows[i])]));
}

/**
 * SAVE WHAT THE SCREEN SENT, cleaned. `lastDigestAt` is the sender's, never the
 * screen's: a save carries the stored value forward so changing a toggle cannot
 * make yesterday's digest go out again.
 */
export async function savePrefs(userId: string, body: unknown): Promise<NotificationPrefs> {
  return editJSON<NotificationPrefs, NotificationPrefs>(U.notifyPrefs(userId), (current) => {
    const next: NotificationPrefs = {
      ...cleanPrefs(body),
      updatedAt: new Date().toISOString(),
      ...(current?.lastDigestAt ? { lastDigestAt: current.lastDigestAt } : {}),
    };
    return { next, result: next };
  });
}

/** Record that a digest went, as of `at` — the sender's own write. */
export async function markDigestSent(userId: string, at: string) {
  await editJSON<NotificationPrefs, null>(U.notifyPrefs(userId), (current) => ({
    next: { ...cleanPrefs(current), ...(current?.updatedAt ? { updatedAt: current.updatedAt } : {}), lastDigestAt: at },
    result: null,
  }));
}
