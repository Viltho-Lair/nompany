// The Redis connection for the RESTRUCTURED data layer.
//
// This file owns the client, and owning it is the point: invariant 13 caps this
// deployment at ONE subscriber connection per process, so a second module
// creating its own would not fail loudly — it would spend a connection nobody
// budgeted for.
//
// TYPED LOOSELY, deliberately. `countingClient` returns a Proxy that forwards
// every command, so the concrete type is whatever node-redis exposes; naming a
// narrower interface here would mean listing the commands the store may use,
// and that list would be wrong within a week.

import { createClient } from "redis";
import { countingClient } from "./commandCount";
import { log } from "@/lib/observability";

// DERIVED FROM THE CALL, never asserted. `ReturnType<typeof createClient>` is
// the wrong type: createClient is generic over modules, functions, scripts and
// RESP version, and the bare reference resolves those to defaults that do not
// match what THIS call produces. Taking the type off `connect` instead means it
// is whatever the client actually is, and it follows a node-redis upgrade
// without anybody noticing.
async function connect() {
  const client = createClient({ url: process.env.REDIS_URL });
  client.on("error", (err) => log.error("Redis client error:", err.message));
  await client.connect();
  // Wrapped so every command can report itself into an active counting scope.
  // Outside one there is no store and nothing is recorded — see
  // platform/db/commandCount.ts for why the hop count is worth measuring at all.
  return countingClient(client);
}

export type RedisClient = Awaited<ReturnType<typeof connect>>;

let clientPromise: Promise<RedisClient> | null = null;

export function getRedisClient(): Promise<RedisClient> {
  if (clientPromise) {
    return clientPromise.then((existing) => {
      if (existing.isOpen) return existing;
      clientPromise = null;
      return getRedisClient();
    });
  }
  clientPromise = connect();
  return clientPromise;
}
