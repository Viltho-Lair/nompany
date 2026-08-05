import { getCollection, deleteItem } from "@/lib/db";
import { deleteMedia } from "@/lib/media";

// Rejected applications are retained for 7 days, then removed along with their
// CV. Called lazily when an admin lists applications and daily by a cron job.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export async function purgeExpiredApplications() {
  const apps = await getCollection("applications");
  const now = Date.now();
  let removed = 0;
  for (const app of apps) {
    if (
      app.status === "rejected" &&
      app.rejectedAt &&
      now - new Date(app.rejectedAt).getTime() >= RETENTION_MS
    ) {
      if (app.cvId) await deleteMedia(app.cvId);
      await deleteItem("applications", app.id);
      removed += 1;
    }
  }
  return removed;
}
