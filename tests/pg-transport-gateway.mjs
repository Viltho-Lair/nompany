// THE GATEWAY HALF OF THE TRANSPORT PARITY RUN — a child process whose only
// way to reach Postgres is an HTTPS-shaped POST to the gateway.
//
// Launched by tests/pg-transport-parity.mjs, never run directly. It exists as a
// separate process for one reason: `pg.ts` reads PG_TRANSPORT ONCE AT MODULE
// SCOPE, so a process has exactly one transport and both halves of a comparison
// cannot live in one. (scripts/test-parity.mjs spawns for the same class of
// reason — an env var that is read too early to change afterwards.)
//
// DATABASE_URL IS DELETED FROM THIS PROCESS'S ENVIRONMENT BY ITS PARENT, and
// that is the sharpest assertion in this file even though it is not written as
// one. `getPool()` throws "pg: DATABASE_URL is not set" the instant anything
// takes the direct path, so a single operation silently falling back to a
// direct connection fails loudly here instead of quietly making the comparison
// meaningless. Everything this process reports went over the wire.
//
// NOTHING IS MONKEYPATCHED. `fetch` is the real one, `postTx` is the real one,
// and the statement really crosses a socket. The only thing arranged is WHERE
// the two Google auth legs point: `readGatewayAuthConfig` reads GCP_STS_URL and
// GCP_IAM_CREDENTIALS_URL from the environment (they are documented as
// overridable defaults, not constants), so a two-route stub on loopback stands
// in for STS and IAM Credentials and hands back a fixed token. That token is
// the "injected static token": it travels through the unmodified auth cache and
// arrives at the gateway as a real `Authorization: Bearer` header, which the
// parent reads off the request the server actually received.
//
// WHAT THIS DOES NOT PROVE, and must not be read as proving: that Google's real
// STS accepts a real Vercel token, that the impersonation binding exists, or
// that Cloud Run accepts the audience. Those need cloud resources nobody has
// created (plan Task 6). What it proves is the wire below the token: client →
// real HTTP → real gateway server → real Postgres → real RLS → back.
import { register } from "node:module";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(`${process.cwd()}/`).href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const input = JSON.parse(process.argv[2] || "{}");
const { fixture, gatewayUrl, staticIdToken, vercelToken, serviceAccount } = input;

// ---- the stand-in for Google ------------------------------------------------
// Two routes, no logic. It answers the shapes pgGatewayAuth.ts's two legs read
// (`access_token` from STS, `token` from generateIdToken) and nothing else.

const googleStub = createServer((req, res) => {
  // The request body is DRAINED AND DISCARDED — the two legs' payloads are
  // asserted in tests/pg-gateway-client.mjs against a recording fetch, and this
  // stub's only job is to hand back a token. Draining it is not optional: an
  // unread body keeps 'end' from firing and the request hangs.
  req.resume();
  req.on("end", () => {
    const path = (req.url || "").split("?")[0];
    const answer = path === "/v1/token"
      ? { access_token: "federated-access-token-from-the-local-stub", expires_in: 3600 }
      : path.endsWith(":generateIdToken")
        ? { token: staticIdToken }
        : null;
    if (!answer) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: `no stub route for ${req.method} ${path}` }));
      return;
    }
    const text = JSON.stringify(answer);
    res.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(text) });
    res.end(text);
  });
});

await new Promise((resolve) => googleStub.listen(0, "127.0.0.1", resolve));
const stubPort = googleStub.address().port;

// ---- the environment this process's pg.ts will read at module scope ---------

process.env.PG_TRANSPORT = "gateway";
process.env.PG_GATEWAY_URL = gatewayUrl;
process.env.VERCEL_OIDC_TOKEN = vercelToken;
process.env.PG_GATEWAY_SERVICE_ACCOUNT = serviceAccount;
process.env.GCP_STS_URL = `http://127.0.0.1:${stubPort}/v1/token`;
process.env.GCP_IAM_CREDENTIALS_URL = `http://127.0.0.1:${stubPort}`;

const { runOperations, asTexts } = await import("./pg-transport-ops.mjs");

let payload;
try {
  const results = await runOperations(fixture);
  payload = { ok: true, texts: asTexts(results) };
} catch (e) {
  payload = { ok: false, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) };
}

// ONE SENTINEL LINE, because the parent needs to tell the result apart from
// anything else this process printed on its way there.
process.stdout.write(`\n__PG_TRANSPORT_RESULT__ ${JSON.stringify(payload)}\n`);
googleStub.close();
process.exitCode = payload.ok ? 0 : 1;
