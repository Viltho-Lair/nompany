// THE ONE PLACE THIS SERVICE OPENS A CONNECTION — the gateway's mirror of the
// rule pg.ts states for the app: nothing else constructs a client, because a
// second pool doubles the connection count invisibly and connection count is
// the ceiling that actually binds.
//
// @google-cloud/cloud-sql-connector, not a host and port. Two reasons, and the
// first is the one that matters: IAM authentication. The gateway has no
// password (design decision, 01/09/2026) — the connector mints a short-lived
// OAuth token per connection and does the mTLS handshake Cloud SQL requires,
// which is not something a bare `pg` connection string can express. The second
// is that `ipType: PRIVATE` is what makes Direct VPC egress reach the private
// address without that address being written down anywhere in this repo.
import { AuthTypes, Connector, IpAddressTypes } from "@google-cloud/cloud-sql-connector";
import { Pool } from "pg";
import { assertTimeoutsOrdered, type GatewayConfig } from "./config";

const IP_TYPES: Record<GatewayConfig["ipType"], IpAddressTypes> = {
  PRIVATE: IpAddressTypes.PRIVATE,
  PUBLIC: IpAddressTypes.PUBLIC,
  PSC: IpAddressTypes.PSC,
};

export type GatewayPool = { pool: Pool; close: () => Promise<void> };

export async function createPool(cfg: GatewayConfig): Promise<GatewayPool> {
  assertTimeoutsOrdered(cfg);

  const connector = new Connector();
  const options = await connector.getOptions({
    instanceConnectionName: cfg.instanceConnectionName,
    ipType: IP_TYPES[cfg.ipType],
    // IAM, NOT PASSWORD. If this ever reads AuthTypes.PASSWORD, a password
    // exists somewhere — and config.ts refuses to start when one does.
    authType: AuthTypes.IAM,
  });

  const pool = new Pool({
    // `options` supplies the socket (and the TLS inside it). There is no host,
    // no port, no ssl block and no password to add here — spreading it and
    // then naming a host would silently defeat the connector.
    ...options,
    user: cfg.user,
    database: cfg.database,
    max: cfg.poolMax,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: cfg.statementTimeoutMs,
    query_timeout: cfg.queryTimeoutMs,
  });

  pool.on("error", (err) => {
    // An idle-client error must not take the process down — the same rule
    // pg.ts and redis.ts both state. A Cloud Run instance dying because one
    // pooled connection was reaped drops every other request on it.
    console.error("[pg-gateway] idle client error", err.message);
  });

  return {
    pool,
    close: async () => {
      await pool.end();
      connector.close();
    },
  };
}
