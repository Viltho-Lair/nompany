// EVERY ADDRESS THIS SERVICE KNOWS COMES FROM THE ENVIRONMENT. Nothing here is
// hardcoded — not the instance, not the database, not the user, not the IP
// type. The design names one private IP (10.90.208.3 on the `default` network
// in nompany-application/me-central1) and that address deliberately does NOT
// appear in this code: the Cloud SQL connector resolves it from the instance
// connection name at connect time, so an instance that moves, or a second
// environment, is a variable change and not a deploy of different source.
//
// THERE IS NO PASSWORD, ANYWHERE. The gateway authenticates to Cloud SQL as an
// IAM service-account database user (decided 01/09/2026) — the connector mints
// a short-lived token per connection. So a password-shaped variable in this
// environment is not a configuration choice, it is evidence that somebody
// wired up the thing this design exists to avoid, and readConfig refuses to
// start rather than quietly ignoring it. Refusing loudly at boot is the only
// moment anyone will look.
import { Refused } from "./errors";

export type GatewayConfig = {
  instanceConnectionName: string;
  user: string;
  database: string;
  ipType: "PRIVATE" | "PUBLIC" | "PSC";
  poolMax: number;
  port: number;
  statementTimeoutMs: number;
  queryTimeoutMs: number;
};

// A variable that must not exist. DATABASE_URL is included on purpose: it has
// no use in this container (the connector supplies the socket), and the one
// reason it would be set is to carry a `postgres://user:password@…` string.
const FORBIDDEN_ENV = ["PGPASSWORD", "PG_GATEWAY_DB_PASSWORD", "DATABASE_URL"];

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Refused(`pg-gateway: ${name} is not set`, 500);
  return value;
}

function positiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Refused(`pg-gateway: ${name} must be a positive integer`, 500);
  return n;
}

export function readConfig(env: NodeJS.ProcessEnv): GatewayConfig {
  for (const name of FORBIDDEN_ENV) {
    if (env[name]) {
      throw new Refused(
        `pg-gateway: ${name} is set, and this service must hold no database password at all. It ` +
          "authenticates as an IAM service-account database user; a password here means the IAM path " +
          "is not the one in use. Refusing to start.",
        500,
      );
    }
  }

  const ipTypeRaw = (env.PG_GATEWAY_IP_TYPE || "PRIVATE").toUpperCase();
  if (ipTypeRaw !== "PRIVATE" && ipTypeRaw !== "PUBLIC" && ipTypeRaw !== "PSC") {
    throw new Refused(`pg-gateway: PG_GATEWAY_IP_TYPE must be PRIVATE, PUBLIC or PSC — got "${ipTypeRaw}"`, 500);
  }

  return {
    // "<project>:<region>:<instance>", e.g. nompany-application:me-central1:nompany.
    instanceConnectionName: required(env, "PG_GATEWAY_INSTANCE"),
    // The IAM database user. Cloud SQL's convention for a service account is
    // the account's email with the trailing ".gserviceaccount.com" removed —
    // written out in full in the variable rather than derived here, because a
    // guess about somebody else's naming convention is not something this
    // service should be making at connect time.
    user: required(env, "PG_GATEWAY_DB_USER"),
    database: required(env, "PG_GATEWAY_DB_NAME"),
    ipType: ipTypeRaw,
    // Small for the same reason pg.ts's pool is small, inverted: there, many
    // serverless instances each hold a tiny pool. Here there are few Cloud Run
    // instances and each serves many requests, so this is the real concurrency
    // ceiling on the instance and is meant to be tuned against Cloud SQL's
    // max_connections, not left to guesswork.
    poolMax: positiveInt(env.PG_GATEWAY_POOL_MAX, 8, "PG_GATEWAY_POOL_MAX"),
    port: positiveInt(env.PORT, 8080, "PORT"),
    // query_timeout MUST STAY STRICTLY GREATER THAN statement_timeout. Do not
    // "tidy" these into equal values — pg.ts's getPool carries the full account
    // of why (fix round 1). Short version: statement_timeout is enforced by
    // Postgres, which aborts and leaves the connection usable; query_timeout is
    // enforced by `pg`, which rejects the promise WITHOUT touching a connection
    // that may still be mid-transaction. The server timer has to win.
    statementTimeoutMs: positiveInt(env.PG_GATEWAY_STATEMENT_TIMEOUT_MS, 15_000, "PG_GATEWAY_STATEMENT_TIMEOUT_MS"),
    queryTimeoutMs: positiveInt(env.PG_GATEWAY_QUERY_TIMEOUT_MS, 20_000, "PG_GATEWAY_QUERY_TIMEOUT_MS"),
  };
}

/** The ordering rule above, as a check rather than as a comment nobody reads. */
export function assertTimeoutsOrdered(cfg: GatewayConfig): void {
  if (cfg.queryTimeoutMs <= cfg.statementTimeoutMs) {
    throw new Refused(
      `pg-gateway: PG_GATEWAY_QUERY_TIMEOUT_MS (${cfg.queryTimeoutMs}) must be strictly greater than ` +
        `PG_GATEWAY_STATEMENT_TIMEOUT_MS (${cfg.statementTimeoutMs}). If the client timer can win, a ` +
        "transaction can be abandoned with its tenant setting still LOCAL-set on a live backend.",
      500,
    );
  }
}
