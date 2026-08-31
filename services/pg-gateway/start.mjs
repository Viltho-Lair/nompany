// THE PROCESS ENTRY. `npm start` in this folder, and the container's CMD.
//
// SELF-REGISTERING LOADER, the same reason and the same shape as
// scripts/migrate/pg/schema.mjs and tests/pg-query.mjs: this service imports
// src/platform/db/sqlGuards.ts, which reaches its own sibling with an
// extensionless specifier (`./keys` — CLAUDE.md's house rule, and what a
// bundler expects), and plain Node's ESM resolver cannot follow that without a
// hook filling the extension in. tests/loader.mjs already does exactly that
// walk, so it is REUSED rather than copied — a second resolver would be a
// second thing to keep in step with the house rule it implements.
//
// THAT REUSE IS A KNOWN WART AND IS WRITTEN DOWN AS ONE (see
// docs/functionality/pg-gateway.md, "Not built yet"): a deployable importing a
// file out of tests/ is not where this should end up. The container build is
// plan Task 6 and is not built; a bundling build step would resolve the
// extensions at build time and this file would lose the hook entirely. Nothing
// about the service's behaviour depends on which way that goes.
import { register } from "node:module";

// The repo root, derived from THIS file rather than from process.cwd(): a
// container's working directory is whatever the image says it is, and the hook
// resolves `@/` against this. (Nothing here imports `@/` anything — the
// extensionless-sibling walk is the half that is needed — but a wrong root
// would make that failure obscure rather than immediate.)
const root = new URL("../../", import.meta.url).href;
register(new URL("../../tests/loader.mjs", import.meta.url), { data: { root } });

// Dynamic, not static — a static import is resolved before ANY module-level
// code runs, including the register() above, which is exactly what leaves the
// hook too late to be seen.
const { main } = await import("./src/main.ts");
await main();
