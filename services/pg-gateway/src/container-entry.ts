// THE ENTRY POINT — the one the bundle is built from, and so the one both
// `npm start` and the container run.
//
// It exists separately from main.ts only because a bundle entry has to actually
// CALL something, and main.ts deliberately exports `main` rather than invoking
// it (so the test file can import the module without starting a server).
//
// THIS FILE IS WHY THERE IS NO LOADER HOOK. sqlGuards.ts reaches its sibling
// with an extensionless `./keys` — CLAUDE.md's house rule, and what a bundler
// expects — which plain Node's ESM resolver cannot follow. The service used to
// carry a start.mjs that registered tests/loader.mjs to fill the extension in at
// runtime; a deployable importing out of tests/ was a wart its own header
// admitted to. esbuild resolves those specifiers at BUILD time instead, so
// `npm run build` is now the only thing standing between source and a running
// process, and running from source is no longer a separate mode with separate
// resolution rules to keep in step.
import { main } from "./main";

await main();
