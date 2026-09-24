import { listCatalog } from "@/lib/data/catalog";
import { currentUser, requestIsHttps } from "@/platform/auth/identity";
import {
  parseIntent, sealIntent, intentCookie, clearedIntentCookie, intentOnSale,
} from "@/platform/auth/purchaseIntent";
import { isLocale, defaultLocale } from "@/shared/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* WHERE A PRICING BUTTON GOES — it remembers the choice, then sends the visitor on.
   ---------------------------------------------------------------------------
   `/api/intent?package=<id>&band=<id>&cycle=monthly|yearly&locale=en|ar`.

   A PAID PACKAGE is checked against the catalogue as it is NOW — public, not
   free, and the band one of its own — and only then sealed into the cookie
   (platform/auth/purchaseIntent says why a cookie). Anything else CLEARS the
   cookie: "Start free" links here with no package at all, so pressing it after
   looking at Small leaves no stale choice behind to pre-select.

   A PREMIUM package (Large) is never queued: it is sold by a conversation, so
   its card links to the contact page and a hand-made link for it lands on
   signup with nothing chosen.

   SIGNED IN ALREADY goes straight to the account page, which opens studio
   creation with the choice selected; everybody else goes to signup, and the
   cookie waits through the code step or the OAuth round trip. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams;
  const locale = isLocale(q.get("locale")) ? String(q.get("locale")) : defaultLocale;

  const asked = parseIntent({ package: q.get("package"), band: q.get("band"), cycle: q.get("cycle") });
  const intent = asked ? intentOnSale(asked, (await listCatalog("packages")) as Array<Record<string, unknown>>) : null;

  const user = await currentUser().catch(() => null);
  const to = user ? `/${locale}/account${intent ? "?create=1" : ""}` : `/${locale}/signup`;

  const res = new Response(null, { status: 303, headers: { Location: new URL(to, url.origin).toString() } });
  res.headers.append("Set-Cookie", intent ? intentCookie(sealIntent(intent), requestIsHttps(request)) : clearedIntentCookie());
  return res;
}

