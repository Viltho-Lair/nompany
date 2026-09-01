// THE VERCEL BLOB MIRROR OF delPrefix(KEY_PREFIX) (src/platform/db/store.ts).
//
// The third store, and the third time this problem has had to be solved. Redis
// fixtures live inside one namespaced key prefix and one call sweeps all of
// them. Postgres has no such prefix, so tests/pg-sweep.mjs deletes by an
// explicit tenant-id list. Blob has no such prefix either — and unlike
// Postgres, it has no tenant column to stand in for one, so the namespace had
// to be put into the OBJECT PATHNAME itself for this file to have anything to
// find. That is MEDIA.object() in platform/db/keys.ts, and it exists for this.
//
// WHY IT MATTERS MORE HERE THAN IN EITHER OTHER STORE. A test run's Redis
// record and its Blob object are reaped by different mechanisms: delPrefix
// takes the record, and — before this file — nothing took the object. The
// pointer died and the bytes did not. That is exactly the state deleteMedia's
// own comment calls "unreachable and unreclaimable", billed forever, and every
// run of the suite minted more of it. The Redis half of this lesson was
// learned in 2025 (see the MEDIA block's header in keys.ts); the bytes moved
// to a store that did not exist when it was written, and the lesson did not
// move with them.
//
// LIST BY THE PREFIX, DELETE BY AN EXPLICIT URL LIST (invariant 17). `list()`
// is a read. Nothing is deleted except objects whose pathname literally starts
// with this run's own prefix, and each `del` names one exact URL that `list`
// returned. There is no predicate delete and no way to express one here.
//
// AN EMPTY PREFIX IS REFUSED OUTRIGHT, and that refusal is the whole safety
// property. `list({ prefix: "" })` enumerates the PRODUCTION objects — every
// tenant's uploaded file — and deleting them would be the Blob restatement of
// the broad-scan delete that once wiped this project's entire Redis instance.
// A caller with no NOMPANY_KEY_PREFIX has, by definition, written no test
// objects to sweep, so refusing costs nothing and the alternative is
// unrecoverable.
//
// NO LOADER HOOK NEEDED, unlike tests/pg-sweep.mjs: this file imports nothing
// from src/, because the prefix it needs is the env var itself rather than
// keys.ts's derived copy. Deriving it would mean importing keys.ts, which
// reaches pg.ts by an extensionless specifier and would drag the whole loader
// question in for one string. The two must agree, so the shape below is
// written to match MEDIA.object() exactly, and the assertion in suite.mjs
// checks that they do rather than trusting this comment.
export async function sweepBlobObjects(prefix) {
  if (!prefix) {
    throw new Error(
      "blob sweep refused: NOMPANY_KEY_PREFIX is empty, and an empty prefix lists every production object",
    );
  }

  const { list, del } = await import("@vercel/blob");

  // `${prefix}media/` — MEDIA.object(id) is `${P}media/${id}`, so this is that
  // shape with the id left off. Kept as a template rather than a bare variable
  // so the two read the same when someone diffs them.
  const scope = `${prefix}media/`;

  const urls = [];
  let cursor;
  do {
    // Paginated deliberately. A run that uploaded more than one page of
    // fixtures would otherwise sweep the first page and silently leave the
    // rest — the same partial-cleanup that makes a dirty namespace look like
    // an unrelated failure two runs later.
    const page = await list({ prefix: scope, cursor, limit: 1000 });
    for (const b of page.blobs) urls.push(b.url);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  if (!urls.length) return 0;

  // One call, explicit list. `del` accepts an array and is a no-op on an
  // already-gone object, so this is safe to re-run after a partial failure.
  await del(urls);
  return urls.length;
}
