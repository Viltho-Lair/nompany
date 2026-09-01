// THE WIRING, AND NOTHING ELSE. Config → pool → the one transaction function
// the HTTP layer is given → listen. Every rule lives in the module it belongs
// to; this file only says which of them are connected to which.
import { readConfig } from "./config";
import { createPool } from "./pool";
import { createGatewayServer } from "./server";
import { runBatch, withClient } from "./tx";
import type { TxRequest } from "./request";

export async function main(): Promise<void> {
  const cfg = readConfig(process.env);
  const { pool, close } = await createPool(cfg);

  const server = createGatewayServer((req: TxRequest) =>
    withClient(pool, (client, connectionIsDead) => runBatch(client, req, connectionIsDead)),
  );

  server.listen(cfg.port, () => {
    console.log(
      `[pg-gateway] listening on :${cfg.port} → ${cfg.instanceConnectionName} ` +
        `db=${cfg.database} user=${cfg.user} ip=${cfg.ipType} (IAM auth, no password)`,
    );
  });

  // CLOUD RUN SENDS SIGTERM AND THEN WAITS. An instance killed mid-transaction
  // leaves Postgres holding row locks until it notices the socket is gone;
  // closing the pool rolls those transactions back on the way out instead.
  const shutdown = (signal: string) => {
    console.log(`[pg-gateway] ${signal} — draining`);
    server.close(() => {
      void close().then(
        () => process.exit(0),
        (e: unknown) => {
          console.error("[pg-gateway] pool close failed", e);
          process.exit(1);
        },
      );
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
