// WHO CONSENTED TO BEING SEEN, NOT WHERE THEY ARE BUSY. This file holds no
// calendar data and no credential — just a list of CollaboratorIDs (invariant
// 6) who opted in, in THIS studio, to colleagues seeing when they are free or
// busy. A reader that expects a cache of events here is reading the wrong
// file: that data, and the token needed to fetch it, lives one door over in
// calendarConnections.ts, under the PERSON (u:<id>:cal:<provider>) rather than
// the studio.
//
// It is a separate key from that connection on purpose — see S.calendarShare
// in keys.ts for why: cascade-by-prefix destroys this list with its studio and
// leaves the connection alone, which is the right outcome for somebody who
// leaves one studio and stays in another. A flag on the connection could not
// express "shared here, not there" at all.
import { getJSON, editJSON } from "@/platform/db/store";
import { S } from "@/platform/db/keys";

/**
 * THE WRITE BOUNDARY. Anything that is not a non-empty string is dropped, so a
 * malformed body cannot put a null or an object into a list the availability
 * route later resolves to real people. Pure and exported so the shape can be
 * tested with no store.
 */
export function cleanSharers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (typeof v === "string" && v.length > 0) seen.add(v);
  }
  return [...seen];
}

export async function listSharers(studioId: string): Promise<string[]> {
  return cleanSharers(await getJSON<unknown>(S.calendarShare(studioId)));
}

export async function isSharing(studioId: string, collaboratorId: string): Promise<boolean> {
  return (await listSharers(studioId)).includes(collaboratorId);
}

export async function setSharing(
  studioId: string,
  collaboratorId: string,
  on: boolean,
): Promise<string[]> {
  const key = S.calendarShare(studioId);
  // COMPARE-AND-SET (invariant 8), not getJSON/setJSON. Two colleagues
  // toggling their own flag at the same moment must not lose one another's
  // entry — a read-modify-write through getJSON/setJSON would let whichever
  // write lands second overwrite the first with a value that never saw it.
  // editJSON re-applies this function against whatever is actually there on
  // every contended attempt, so the merge always starts from current data.
  return editJSON<unknown, string[]>(key, (current) => {
    const existing = cleanSharers(current);
    const next = on
      ? (existing.includes(collaboratorId) ? existing : [...existing, collaboratorId])
      : existing.filter((id) => id !== collaboratorId);
    return { next, result: next };
  });
}
