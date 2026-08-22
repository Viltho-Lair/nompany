// WHETHER A LIVE EVENT CAN BE PATCHED, OR HAS TO BE RELOADED.
//
// Pure, and in lib/ rather than beside the hook, for one practical reason: the
// component module imports LiveProvider, which is JSX, and the Node test suite
// cannot parse JSX. A decision this consequential should not be untestable
// because of where its file sits.
//
// It is also simply the right place. This is a rule about the product's event
// vocabulary, not about React.

/**
 * WHAT TO DO WITH ONE EVENT — extracted as a pure function so the branching can
 * be tested without a browser, a session or a React tree.
 *
 * This is where the risk in targeted patching lives. Every wrong answer here is
 * a board that disagrees with the server and stays that way until somebody
 * reloads, which is precisely the failure this feature is supposed to prevent.
 *
 */
export type LiveDecision =
  | { action: "patch"; field: string }
  | { action: "reload"; why: string };

/** The event as it comes off the stream; every field may be absent. */
export type LiveEvent = { type?: string; collection?: string; rowId?: string };

export function decide(
  event: LiveEvent | null | undefined,
  // WHICH STATE FIELD HOLDS WHICH COLLECTION, as the board declares it. The
  // value is the setter's field name, so a board can name it whatever it likes.
  into: Record<string, string> | null | undefined,
): LiveDecision {
  if (!event?.collection) return { action: "reload", why: "no collection" };

  const field = into?.[event.collection];
  // A collection this board does not hold. Sales watching Technical is the
  // ordinary case: the event names a row in `rfqs`, and what changed here is a
  // DERIVED column on some ticket whose id the event never mentions.
  if (!field) return { action: "reload", why: "collection not held" };

  if (!event.rowId) return { action: "reload", why: "no row id" };

  // ONLY UPDATES. An edit cannot change a list's order — these boards sort by
  // createdAt, which an edit never touches — so replacing an element in place
  // gives exactly the array a refetch would. A create or a delete changes the
  // length, the order, and the totals rendered above the list.
  if (event.type !== "row.updated") return { action: "reload", why: event.type || "no type" };

  return { action: "patch", field };
}
