// WHAT A BELL SHOWS — pure, so the studio's bell and the console's read one
// rule and the Node suite can assert it without a browser.
//
// Two sources feed every bell: the REST read ("what was already waiting") and
// the stream ("what arrived since"). They overlap by design — a reconnect
// re-reads the list, and the list then holds rows the stream already
// delivered — so the merge is where a notice is kept from appearing twice.
// Both bells carried their own copy of this loop; two copies of one rule are
// two places for them to disagree about the count.

/** The fields a bell reads off a notification row. */
export type InboxRow = { id: string; at?: unknown; readAt?: unknown };

/**
 * One list, newest first, each notice once. The STREAMED copy wins a tie: it
 * is the later of the two to arrive, and an optimistic "mark read" is applied
 * to both lists, so neither copy is staler than the other in a way that shows.
 */
export function mergeNotices<T extends InboxRow>(streamed: readonly T[] | null | undefined, stored: readonly T[] | null | undefined): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const n of [...(streamed || []), ...(stored || [])]) {
    if (!n || seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n);
  }
  return out.sort((a, b) => String(b.at ?? "").localeCompare(String(a.at ?? "")));
}

export const unreadCount = (rows: readonly InboxRow[]) => rows.filter((n) => !n.readAt).length;

/** A row as the bell draws it: one notice, or several identical ones. */
export type Grouped<T> = T & { count: number; ids: string[]; anyUnread: boolean };

type Groupable = InboxRow & { type?: unknown; href?: unknown; title?: unknown; body?: unknown; params?: unknown };

const DAY_MS = 86_400_000;
const sameNotice = (a: Groupable, b: Groupable) =>
  a.type === b.type && a.href === b.href && a.title === b.title && a.body === b.body
  && JSON.stringify(a.params ?? null) === JSON.stringify(b.params ?? null);

/**
 * REPEATS COLLAPSE INTO ONE ROW. The same notice about the same thing — a
 * stock item falling low again, a lead nudged twice — arriving several times in
 * a day was several identical rows pushing everything else down the bell. Two
 * rows are one notice when their type, link, words and facts all agree and
 * they arrived within a day of the newest of them; only NEIGHBOURS are joined,
 * so the list stays in time order. The group carries every id it stands for,
 * so reading it reads all of them.
 */
export function groupNotices<T extends Groupable>(rows: readonly T[]): Grouped<T>[] {
  const out: Grouped<T>[] = [];
  for (const n of rows) {
    const last = out[out.length - 1];
    const close = last && Math.abs(Date.parse(String(last.at ?? "")) - Date.parse(String(n.at ?? ""))) <= DAY_MS;
    if (last && close && sameNotice(last, n)) {
      last.count += 1;
      last.ids.push(n.id);
      if (!n.readAt) last.anyUnread = true;
      continue;
    }
    out.push({ ...n, count: 1, ids: [n.id], anyUnread: !n.readAt });
  }
  return out;
}

// "(3) " at the very front of the title. Anchored and exact, so a studio or
// page whose own name starts with a bracket is never trimmed.
const PREFIX = /^\(\d+\+?\) /;

/**
 * THE TAB'S TITLE WITH THE UNREAD COUNT IN FRONT — how somebody working in
 * another tab learns a notice arrived, which the bell cannot tell them. Built
 * from the title as it is NOW, with any earlier count removed first: Next
 * rewrites the title on every navigation, and prefixing blindly would stack
 * "(2) (3) Acme".
 */
export function titleWithCount(title: string, count: number) {
  const bare = String(title || "").replace(PREFIX, "");
  if (!(count > 0)) return bare;
  return `(${count > 99 ? "99+" : Math.floor(count)}) ${bare}`;
}
