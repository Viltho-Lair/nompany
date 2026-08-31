// THE CONTAINER'S ENTRY POINT, and the reason it is not `start.mjs`.
//
// `start.mjs` runs the service under a loader hook, because Node's ESM resolver
// cannot follow the extensionless `./keys` specifier inside sqlGuards.ts. That
// hook is borrowed from tests/loader.mjs, and a deployable reaching into
// tests/ is a wart its own header admits to.
//
// A bundler resolves those specifiers at BUILD time, so the container needs no
// hook at all — which is why the Dockerfile bundles from this file instead. It
// exists separately from main.ts only because a bundle entry has to actually
// CALL something, and main.ts deliberately exports `main` rather than invoking
// it (so the test file can import the module without starting a server).
//
// `start.mjs` stays for local development, where running from source beats
// rebuilding a bundle to read a log line.
import { main } from "./main";

await main();
