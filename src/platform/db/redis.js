// The Redis connection for the RESTRUCTURED data layer.
//
// This file owns the client so nothing under src/lib/data depends on the old
// src/lib/db.js. (The old store now imports the client from here, so there is
// still exactly ONE connection until the old file is deleted.)

import { createClient } from "redis";
import { countingClient } from "./commandCount";
import { log } from "@/lib/observability";

let clientPromise = null;

export function getRedisClient() {
  if (clientPromise) {
    return clientPromise.then((existing) => {
      if (existing.isOpen) return existing;
      clientPromise = null;
      return getRedisClient();
    });
  }
  clientPromise = (async () => {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (err) => log.error("Redis client error:", err.message));
    await client.connect();
    // Wrapped so every command can report itself into an active counting scope.
    // Outside one there is no store and nothing is recorded — see
    // platform/db/commandCount.js for why the hop count is worth measuring at all.
    return countingClient(client);
  })();
  return clientPromise;
}
