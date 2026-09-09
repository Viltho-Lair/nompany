import { route } from "@/platform/http/route";
import { getDailyBand } from "@/lib/data/greeting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* TODAY'S BAND, for the studio shell's header.
   ------------------------------------------------------------------
   STUDIO-SCOPED THOUGH THE MESSAGES ARE PLATFORM-WIDE. Every studio gets the
   same words, so this could have been a bare `/api/greeting` — but that would be
   another endpoint an unauthenticated caller can reach, to save one path
   segment. It answers to the studio guard every other shell request already
   passes through instead, and costs nothing extra: the reader is inside a studio
   when they see it.

   IT READS NO TENANT DATA. Two small platform documents and the server's own
   clock — nothing here touches `collection_rows`, so the answer is identical for
   every studio.

   NO WRITE PATH. Dismissing the band is the BROWSER'S business: it lasts one day
   and belongs to one person on one device, which is `localStorage`, not a row
   per member per day in a shared table. */
export const GET = route({ auth: "studio", name: "studios/greeting" }, async () => ({
  band: await getDailyBand(),
}));
