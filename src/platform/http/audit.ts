// WHO DID WHAT, AND WHEN.
//
// Finding H-11: super admins can change a studio's plan, assign a platform role
// and rewrite the price list; studio admins can grant themselves rights, remove
// members and unlock a locked quotation. None of it left a record. For a product
// holding invoices, salaries and controlled documents that is the compliance
// gap, not a nice-to-have — and `S.activityLog` had been declared for it once
// and then removed, having never had a reader or a writer.
//
// ONE WRITE, FROM THE ROUTE WRAPPER. Every mutation in the product already
// passes through one function, which is the only reason this is a single edit
// rather than ninety-seven. A per-service approach would have been ninety-seven
// chances to forget, and the ones somebody forgot would be the interesting ones.
//
// WHAT IT RECORDS, and what it deliberately does not:
//
//   at, actor, actorType   who, and which kind of identity — a Collaborator, a
//                          User, or a SuperAdmin. These are three different
//                          things in this product and conflating them in the one
//                          record that exists to assign responsibility would be
//                          the wrong place to start being casual about it.
//   studioId               which tenant, or "" for a console action
//   action                 method plus route name: "PUT studios/[slug]/sales"
//   subject                the row id the request named, when it named one
//   status                 what the caller was told
//   ip, requestId          how to find the rest of the story in the logs
//
// NOT the request body. It carries passwords on the identity routes, ID numbers
// on HR, and bank details on Finance — a log written to survive audits is the
// last place to copy them. `before`/`after` diffs are the version of this worth
// wanting, and they belong to the services that know what changed; the wrapper
// can only honestly report what it can see, so it reports that and no more.
//
// FAILURE HERE MUST NOT FAIL THE REQUEST. The write it describes has already
// happened. Losing the record is bad; refusing a completed action because we
// could not write about it is worse, and would make the audit log an outage.

import { S, REG } from "@/platform/db/keys";
import { xAdd, xAfter, xLastId } from "@/platform/db/store";
import { log } from "./observability";

// Deep enough to answer "what happened this quarter" on a busy studio, capped
// because an unbounded structure in Redis is how the whole instance dies. When
// this needs to be permanent it belongs in the SQL migration, not in a bigger
// number here.
const MAX_ENTRIES = 5000;

/** The three identities this product actually has. */
export const ACTOR = Object.freeze({
  COLLABORATOR: "collaborator",
  USER: "user",
  SUPER: "super",
});

/**
 * Record one privileged action. Never throws.
 *
 * @param {object} entry
 * @param {string} entry.studioId   "" for a console action
 */
export async function record({
  studioId = "", actor = "", actorType = "", action = "",
  subject = "", status = 0, ip = "", requestId = "",
} = {}) {
  if (!action) return null;
  try {
    const fields = {
      at: new Date().toISOString(),
      actor, actorType, studioId, action, subject,
      status: String(status), ip, requestId,
    };
    return await xAdd(studioId ? S.audit(studioId) : REG.audit, fields, MAX_ENTRIES);
  } catch (e) {
    log.error(`[audit] could not record "${action}": ${(e as Error).message}`);
    return null;
  }
}

/**
 * Read the trail, oldest first, from a cursor.
 *
 * @param {string} studioId  "" reads the console's own log
 */
export async function since(studioId: string, cursor = "", count = 100) {
  // xAfter already flattens each entry to { id, ...fields }.
  return xAfter(studioId ? S.audit(studioId) : REG.audit, cursor, count);
}

/**
 * The newest entry's id, or the empty-log sentinel.
 *
 * WHY THIS EXISTS, RATHER THAN READING A PAGE AND TAKING ITS LAST ENTRY. That
 * is the obvious thing to do and it is wrong: `since` PAGES, so it returns the
 * OLDEST `count` entries from the cursor, and the last of that page is the
 * newest only while the whole trail fits in one page. A caller that wants "what
 * happens from now on" and computes its cursor that way silently starts reading
 * from the middle of the log — which is exactly what a Gate A assertion did,
 * and it failed by reporting fifty-six entries where one was expected.
 *
 * A reader who wants to follow the trail asks for this first, then passes it to
 * `since`.
 */
export async function latestId(studioId: string) {
  return xLastId(studioId ? S.audit(studioId) : REG.audit);
}
