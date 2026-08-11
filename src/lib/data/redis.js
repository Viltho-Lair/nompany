// The Redis connection for the RESTRUCTURED data layer.
//
// This file owns the client so nothing under src/lib/data depends on the old
// src/lib/db.js. (The old store now imports the client from here, so there is
// still exactly ONE connection until the old file is deleted.)

import { createClient } from "redis";

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
    client.on("error", (err) => console.error("Redis client error:", err.message));
    await client.connect();
    return client;
  })();
  return clientPromise;
}
