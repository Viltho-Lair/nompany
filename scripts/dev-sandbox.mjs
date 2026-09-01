// A DEV SERVER ON ITS OWN KEY NAMESPACE, with a seeded account to sign in as.
//
// WHY THIS EXISTS. Verifying anything on a screen needs a session, and the only
// sessions that exist are real ones against the live Redis. That has left UI
// work verified by typecheck and a render check — which catches an import error
// and nothing about whether the feature works.
//
// `npm run dev` reads REDIS_URL with no prefix, so it IS production. This sets
// NOMPANY_KEY_PREFIX before Next starts, which every key builder reads at import
// time, so the whole app runs in a namespace nothing else touches — the same
// mechanism the test suites use, pointed at a browser instead.
//
//   npm run dev:sandbox
//
// It prints an account to sign in with. Everything written is under the prefix
// and is swept by `npm run dev:sandbox:clean`.
//
// NOT A SECOND ENVIRONMENT to keep in step: no seed data beyond one account and
// one studio, and no migrations. It is a namespace and a login, which is exactly
// what a screen needs and nothing more.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const PREFIX = process.env.NOMPANY_SANDBOX_PREFIX || "sandbox_";
const PORT = process.env.PORT || "3010";

// .env.local is loaded by Next, not by us — but the seeding below runs in THIS
// process, before Next exists, so it needs the connection string itself.
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* CI or a shell that already exported them */ }

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — the sandbox needs a Postgres to talk to.");
  process.exit(1);
}

// SET BEFORE ANY PROJECT MODULE IS IMPORTED. keys.js reads the prefix at import
// time, so setting it afterwards would set it too late and the seeding below
// would land in the live key space — the exact accident this file prevents.
process.env.NOMPANY_KEY_PREFIX = PREFIX;

// THE SUITES' OWN LOADER, reused rather than reimplemented. superAuth imports
// `next/headers`, which only resolves inside a Next request — and the seeding
// below runs in plain Node, before Next exists. tests/loader.mjs already swaps
// that for a cookie-jar stub and already resolves `@/`, which is the whole
// reason the integration suite can drive real route handlers.
//
// The alternative was to hand-write the super-admin row here, which would be a
// second copy of seedSuperAdmin free to drift from the real one.
const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("../tests/loader.mjs", import.meta.url), { data: { root } });

const { seedSuperAdmin } = await import("@/platform/auth/superAuth");
const { createUser } = await import("@/platform/auth/users");
const { createStudio } = await import("@/modules/main/studios");
const { hashPassword } = await import("@/platform/auth/passwords");

const EMAIL = "sandbox@nompany.test";
const PASSWORD = "sandbox-password-1234";
const SLUG = "sandbox";

const admin = await seedSuperAdmin({ email: EMAIL, password: PASSWORD });

let user = null;
try {
  const made = await createUser({ email: EMAIL, passwordHash: await hashPassword(PASSWORD) });
  user = made.user || null;
  if (user) await createStudio({ ownerUserId: user.id, name: "Sandbox Studio", slug: SLUG, ownerAlias: "Owner" });
} catch { /* already seeded by a previous run — idempotent by email and slug */ }

console.log(`
  sandbox namespace : ${PREFIX}
  console           : http://localhost:${PORT}/super
  studio            : http://localhost:${PORT}/${SLUG}
  sign in with      : ${EMAIL} / ${PASSWORD}
  super admin       : ${admin?.existed ? "already existed" : "seeded"}

  Nothing here touches live keys. Clean up with: npm run dev:sandbox:clean
`);

spawn("npx", ["next", "dev", "-p", PORT], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NOMPANY_KEY_PREFIX: PREFIX },
});
