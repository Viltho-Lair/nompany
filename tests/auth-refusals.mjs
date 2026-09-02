// EVERY REFUSAL THE SERVER CAN SEND, THE SCREEN CAN NAME.
//
// THE BUG THIS GUARDS. `login()` and `resetPassword()` both refuse a locked-out
// source with `{ error: "rate-limited" }` and a 429. Neither screen branched on
// it. LoginForm checked for "rate-email" and "rate-ip" — real codes, but the OTP
// SEND limits rather than the credential gate — so a rate-limited sign-in fell
// through to the else and told somebody whose password was never checked that
// "That email or password isn't right." ForgotFlow fell to its own catch-all,
// "We couldn't reset your password."
//
// So the person is told their password is wrong, tries again, gives up, clicks
// "forgot password", and is told that failed too — while the one fact that
// explains both, the `retryAfter` on the 429, is discarded by both screens.
// Three reset attempts in production read as a broken product rather than as a
// working lockout.
//
// A SOURCE SCAN, not an exercise: the mapping lives inside a React component
// with no server and no database behind it, and what broke was one LIST going
// out of step with another. That is something you read, not something you run.

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

// Pure copy over a number — no database and no server, so this runs anywhere.
const { accountDict, tooManyAttemptsIn } = await import("@/shared/account");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const read = (p) => readFileSync(p, "utf8");

// The body of one exported function: from its signature to the next top-level
// export. Line-based and crude on purpose — it needs to find string literals,
// not to parse TypeScript.
function functionBody(src, name) {
  const lines = src.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith(`export async function ${name}(`));
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("export ")) { end = i; break; }
  }
  return lines.slice(start, end).join("\n");
}

const identity = read("src/platform/auth/identity.ts");
const literals = (text, re) => new Set([...text.matchAll(re)].map((m) => m[1]));

const SERVER = /error:\s*"([a-z-]+)"/g;
const CLIENT = /data\.error === "([a-z-]+)"/g;

const cases = [
  { fn: "login", screen: "src/components/public/LoginForm.js" },
  { fn: "resetPassword", screen: "src/components/public/ForgotFlow.js" },
];

console.log("== every refusal the server sends, the screen names");
for (const c of cases) {
  const body = functionBody(identity, c.fn);
  ok(`${c.fn} was found in identity.ts`, body.length > 0);

  const sent = literals(body, SERVER);
  ok(`${c.fn} refuses a locked-out source with "rate-limited"`, sent.has("rate-limited"), [...sent].join(", "));

  const named = literals(read(c.screen), CLIENT);
  const unhandled = [...sent].filter((code) => !named.has(code));
  ok(
    `${c.screen.split("/").pop()} names every code ${c.fn} can return`,
    unhandled.length === 0,
    unhandled.length ? `unhandled: ${unhandled.join(", ")}` : `${named.size} handled`,
  );
}

// THE WAIT ITSELF. A lockout somebody cannot time is one they read as a broken
// screen, so both routes must send `retryAfter` and both screens must say it.
console.log("== and the wait is passed on rather than swallowed");
for (const route of ["src/app/api/identity/login/route.ts", "src/app/api/identity/reset/route.ts"]) {
  ok(`${route.split("/").slice(-2)[0]} sends retryAfter`, read(route).includes("retryAfter"));
}
for (const c of cases) {
  ok(`${c.screen.split("/").pop()} reads retryAfter`, read(c.screen).includes("retryAfter"));
}

// THE SENTENCE ITSELF, in both languages. A placeholder that survives into the
// rendered string is the failure this catches: "{n}" on screen is worse than the
// vague line it replaced, and it would pass every code review looking fine.
console.log("== the wait reads as a sentence, in both languages");
for (const locale of ["en", "ar"]) {
  const tr = accountDict(locale);
  const quarterHour = tooManyAttemptsIn(tr, 900);
  ok(`${locale}: 900 seconds is a quarter of an hour`, quarterHour.includes("15"), quarterHour);
  ok(`${locale}: nothing is left unsubstituted`, !quarterHour.includes("{n}"), quarterHour);

  const under = tooManyAttemptsIn(tr, 45);
  ok(`${locale}: under a minute rounds up rather than saying zero`, !under.includes("0") && !under.includes("{n}"), under);

  // No number from the server is not "0 minutes" — it is the honest vague line.
  ok(`${locale}: a missing retryAfter falls back rather than inventing`, tooManyAttemptsIn(tr, undefined) === tr.tooManyAttemptsWait);
  ok(`${locale}: so does a zero`, tooManyAttemptsIn(tr, 0) === tr.tooManyAttemptsWait);
}

console.log(fails ? `\nauth refusals: ${fails} FAILED` : "\nauth refusals: all passed");
process.exit(fails ? 1 : 0);
