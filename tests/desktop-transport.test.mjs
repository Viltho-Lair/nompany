// THE DESKTOP CLIENT'S TRANSPORT — the CORS half, which is the half a browser
// enforces and no route handler ever sees.
//
// A preflight is not a request the API answers. It is answered before any route
// runs, and when it is answered wrongly the failure surfaces in the client as a
// thrown fetch with no status and no body — which reads as "the server is down"
// rather than "the policy refused you". That is a bad enough error message to be
// worth a test on its own.
//
// No database, no server: apiCors is a function over a Request.
//
// It lives in src/proxy.js rather than a middleware file because Next 16 refuses
// to start when both exist, so the CORS was folded into the proxy. It is
// exported separately from `proxy` itself precisely so this test can keep
// calling it with a plain Request — `proxy` reads `nextUrl`, which only the edge
// supplies, and a test that had to fake one would be testing the fake.

import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const { apiCors } = await import("@/proxy");

let fails = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) fails += 1;
  console.log(`${cond ? "  ok  " : " FAIL "} ${label}${extra ? "  " + extra : ""}`);
};

const call = (method, origin) =>
  apiCors(
    new Request("https://www.nompany.com/api/identity/login", {
      method,
      headers: origin ? { origin } : {},
    }),
  );

const DESKTOP = "http://tauri.localhost";

console.log("== the desktop webview's origin is admitted");
{
  const res = call("OPTIONS", DESKTOP);
  ok("a preflight is answered here, not by the route", res.status === 204, `status ${res.status}`);
  ok(
    "and it names the asking origin",
    res.headers.get("access-control-allow-origin") === DESKTOP,
    res.headers.get("access-control-allow-origin") || "(absent)",
  );
  const allowed = (res.headers.get("access-control-allow-headers") || "").toLowerCase();
  ok("the bearer is allowed through", allowed.includes("authorization"), allowed);
  ok("so is the desktop marker", allowed.includes("x-nompany-client"), allowed);
  ok("and the device id", allowed.includes("x-nompany-device"), allowed);
  ok(
    "the answer varies by origin, so no cache serves it to somebody else",
    (res.headers.get("vary") || "").toLowerCase().includes("origin"),
    res.headers.get("vary") || "(absent)",
  );
}

console.log("== a real request from that origin carries the header too");
{
  const res = call("POST", DESKTOP);
  ok(
    "the POST answer is readable by the client",
    res.headers.get("access-control-allow-origin") === DESKTOP,
    res.headers.get("access-control-allow-origin") || "(absent)",
  );
}

console.log("== and nobody else is");
{
  const res = call("OPTIONS", "https://not-nompany.example");
  ok(
    "an origin nobody named gets no permission",
    res.headers.get("access-control-allow-origin") === null,
    res.headers.get("access-control-allow-origin") || "(absent)",
  );

  const same = call("POST", "");
  ok(
    "a same-origin call is left exactly as it was",
    same.headers.get("access-control-allow-origin") === null,
    same.headers.get("access-control-allow-origin") || "(absent)",
  );
}

console.log("== credentials are never allowed, and that is the point");
{
  // The desktop client authenticates with a bearer out of the keychain, so it
  // never needs a cookie attached. Leaving this off is what stops a cross-origin
  // page riding a signed-in person's session — and it is why the web app's own
  // SameSite=Lax cookie did not have to be loosened to make the desktop work.
  for (const method of ["OPTIONS", "POST"]) {
    const res = call(method, DESKTOP);
    ok(
      `${method} does not allow credentials`,
      res.headers.get("access-control-allow-credentials") === null,
      res.headers.get("access-control-allow-credentials") || "(absent)",
    );
  }
}

console.log(fails ? `\ndesktop transport: ${fails} FAILED` : "\ndesktop transport: all passed");
process.exit(fails ? 1 : 0);
