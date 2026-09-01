// THE HTTP SURFACE. Two routes and nothing else:
//
//   POST /tx        one batch, one transaction   (design D1)
//   GET  /healthz   liveness, touching no database
//
// NO FRAMEWORK. node:http is enough for two routes, and every dependency added
// to a service whose whole job is to execute SQL is a dependency that can
// execute SQL.
//
// THIS SERVICE DOES NOT AUTHENTICATE ITS CALLER, AND MUST NEVER BE DEPLOYED SO
// THAT ANYONE CAN CALL IT. Authentication is Cloud Run's: ingress internal,
// IAM `run.invoker`, and Vercel OIDC federated through Workload Identity to an
// impersonated service account (design D3, plan Task 4 — not built). An
// `--allow-unauthenticated` deploy of this service is a remote SQL execution
// endpoint against every tenant's data at once. That is the single worst
// failure available in this design, and it is a deploy flag, not a line of
// code, which is exactly why it is written here where the deploy is decided.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { isRefused, Refused } from "./errors";
import { parseTxRequest, type TxRequest } from "./request";
import { guardBatch } from "./guard";
import type { TxResult } from "./tx";

// A BODY CEILING. An unbounded request body on a service that holds a database
// connection per call is a way to occupy one for as long as the caller can
// keep typing. 4 MB is far above any batch the app produces — the widest is a
// bulk row insert — and far below anything that hurts.
export const MAX_BODY_BYTES = 4 * 1024 * 1024;

export type RunTx = (req: TxRequest) => Promise<TxResult[]>;

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BODY_BYTES) {
      // Refused as it arrives, not after it has all been buffered — the point
      // of a ceiling is to stop paying for the bytes.
      throw new Refused(`pg-gateway: request body exceeds ${MAX_BODY_BYTES} bytes`, 413);
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(text),
  });
  res.end(text);
}

/**
 * The handler, with the database injected. `runTx` is a parameter rather than
 * an import so the whole HTTP path — body limits, JSON parsing, refusals,
 * status codes — is provable with no database in the room.
 */
export function createHandler(runTx: RunTx) {
  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const started = Date.now();
    const url = req.url || "/";
    const path = url.split("?")[0];

    try {
      if (req.method === "GET" && path === "/healthz") {
        // DELIBERATELY DOES NOT TOUCH POSTGRES. A liveness probe that opens a
        // database connection turns a database blip into an instance restart
        // loop, which removes the capacity that might have recovered.
        send(res, 200, { ok: true });
        return;
      }

      if (path !== "/tx") {
        send(res, 404, { error: `pg-gateway: no route ${req.method} ${path}` });
        return;
      }
      if (req.method !== "POST") {
        send(res, 405, { error: "pg-gateway: /tx is POST only" });
        return;
      }

      const raw = await readBody(req);
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new Refused("pg-gateway: the request body is not valid JSON");
      }

      const txRequest = parseTxRequest(body);
      // GUARDED BEFORE A CONNECTION IS TAKEN. runBatch guards again — that is
      // the call that makes an unguarded batch impossible — but a batch that
      // will be refused should never have occupied a pooled connection to find
      // that out.
      guardBatch(txRequest);

      const results = await runTx(txRequest);
      send(res, 200, { results });

      console.log(
        `[pg-gateway] POST /tx 200 statements=${txRequest.statements.length} ` +
          `tenant=${txRequest.tenantId === undefined ? "none" : "set"} ${Date.now() - started}ms`,
      );
    } catch (e) {
      if (isRefused(e)) {
        // A refusal is about the request, and the caller is this project's own
        // application — so its message goes back, because a 400 whose body says
        // only "bad request" turns a five-second fix into an afternoon.
        send(res, e.status, { error: e.message });
        console.warn(`[pg-gateway] ${req.method} ${path} ${e.status} refused: ${e.message.split("\n")[0]}`);
        return;
      }
      // Anything else is a database or runtime failure. The message is logged
      // in full and returned, but nothing about the STATEMENTS is logged: the
      // values are tenant data and never belong in Cloud Logging.
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[pg-gateway] ${req.method} ${path} 500 ${message}`);
      send(res, 500, { error: message });
    }
  };
}

export function createGatewayServer(runTx: RunTx): Server {
  const handle = createHandler(runTx);
  return createServer((req, res) => {
    void handle(req, res);
  });
}
