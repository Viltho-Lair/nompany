import { route } from "@/platform/http/route";
import { getGreetingConfig, resolveGreeting } from "@/lib/data/greeting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* TODAY'S GREETING, for the studio shell's header.
   ------------------------------------------------------------------
   STUDIO-SCOPED THOUGH THE MESSAGE IS PLATFORM-WIDE. Every studio gets the same
   words, so this could have been a bare `/api/greeting` — but that would be a
   fourth endpoint an unauthenticated caller can reach, argued for in Gate A's
   public list, to save one path segment. It answers to the studio guard every
   other shell request already passes through instead, and costs nothing extra:
   the reader is inside a studio when they see it.

   IT READS NO TENANT DATA. One small platform document and the server's own
   clock — nothing here touches `collection_rows`, so the answer is identical
   for every studio and the route is a cache away from free if it ever matters.

   NO WRITE PATH. Dismissing the message is the BROWSER'S business: it lasts one
   day and belongs to one person on one device, which is `localStorage`, not a
   row per member per day in a shared table. */
export const GET = route({ auth: "studio", name: "studios/greeting" }, async () => ({
  greeting: resolveGreeting(await getGreetingConfig()),
}));
