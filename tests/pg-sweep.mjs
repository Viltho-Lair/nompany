// THE POSTGRES MIRROR OF delPrefix(KEY_PREFIX) (src/platform/db/store.ts).
//
// Redis fixtures live inside one namespaced key prefix and one call sweeps all
// of them. collection_rows carries no such prefix — tenant_id IS the studio
// id, real production shape, exactly what a live studio also uses — so under
// NOMPANY_DB=parity every fixture this suite writes is ALSO written to
// Postgres, and nothing else cleans it up. Left alone, every parity run adds
// another studio's worth of rows to the live table forever.
//
// DELETE BY AN EXPLICIT KEY LIST, NEVER A PREDICATE (invariant 17). A
// broad-scan delete once wiped this project's whole Redis instance; the
// Postgres equivalent of "everything, or everything not in a keep-list" is
// refused the same way here. It is also the only shape available: RLS on
// collection_rows is FORCED and this role holds no BYPASSRLS, so no query can
// even SEE which tenants hold rows without a tenant already in hand —
// withTenant(tenantId, ...) can only ever touch that one tenant's own rows.
// Callers pass the exact ids the run created (read back from REG.studios,
// which is itself namespaced by NOMPANY_KEY_PREFIX and therefore names only
// this run's own studios); this file never discovers ids on its own.
//
// LOADER HOOK, DEFERRED. pg.ts and keys.ts reach each other with an
// extensionless specifier (`./keys`), which plain Node's ESM resolver cannot
// follow without tests/loader.mjs registered first. Both callers of this file
// (suite.mjs via integration.test.mjs, gate-a.test.mjs) register it before
// they import anything real, but a STATIC import here would still be resolved
// too early relative to that — same reasoning tests/pg-parity.mjs documents —
// so the target modules are imported dynamically, inside the function, after
// the caller has already registered the hook.
export async function sweepPgTenants(tenantIds) {
  const ids = [...new Set(tenantIds.filter(Boolean))];
  if (!ids.length) return 0;

  const { withTenant } = await import("../src/platform/db/pg.ts");
  const { TBL } = await import("../src/platform/db/keys.ts");

  let total = 0;
  for (const tenantId of ids) {
    // No WHERE beyond the tenant column is even necessary — RLS already
    // confines this DELETE to `tenantId`'s own rows — but it is stated
    // explicitly anyway so the query reads as scoped rather than relying on
    // an invisible policy to make a bare DELETE safe.
    const { rowCount } = await withTenant(tenantId, (q) =>
      q(`DELETE FROM ${TBL.rows} WHERE ${TBL.cols.tenant} = $1`, [tenantId]));
    total += rowCount;
  }
  return total;
}
