// IS THIS PROCESS THE SANDBOX? True only when it runs on a key namespace of its
// own (`npm run dev:sandbox`, or a test run) and is not a production build.
//
// ASKED OF A KEY, NOT OF THE ENVIRONMENT, for the reason the sandbox's dev
// login gives: `keys.ts` IGNORES NOMPANY_KEY_PREFIX when NODE_ENV is
// "production", so a production process with the variable set still reads and
// writes the live key space. A key builder that comes back namespaced is the
// only proof that holds. Every sandbox-only door (the subscription clock) asks
// this first and answers 404 when it says no.

import { REG } from "@/platform/db/keys";

const SANDBOX_PREFIXES = ["sandbox_", "test_"];

export function isSandbox(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return SANDBOX_PREFIXES.some((p) => REG.studios.startsWith(p));
}
