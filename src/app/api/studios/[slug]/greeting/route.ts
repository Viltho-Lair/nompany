import { route } from "@/platform/http/route";
import { getDailyBand } from "@/lib/data/greeting";
import { cleanDaypart } from "@/shared/greeting";

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

   THE DAYPART IS THE CALLER'S, and it has to be. A platform with tenants in
   several timezones has no single hour, so the server cannot know whether the
   person asking is in their morning or their evening — the browser says, and
   the answer is generated and cached for that part of the day. An absent or
   nonsense value resolves to morning rather than refusing: a band is not worth
   a 400.

   NO WRITE PATH. Dismissing a message is the BROWSER'S business: it belongs to
   one person on one device, which is `localStorage`, not a row per member per
   message in a shared table. */
export const GET = route({ auth: "studio", name: "studios/greeting" }, async ({ request }) => ({
  band: await getDailyBand(cleanDaypart(new URL(request.url).searchParams.get("daypart"))),
}));
