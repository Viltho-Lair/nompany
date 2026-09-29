import { route } from "@/platform/http/route";
import { IX, REG } from "@/platform/db/keys";
import { readArr, sMembers } from "@/platform/db/store";
import { listCollaborators } from "@/platform/auth/collaborators";
import { listForCollaborator, unreadCount } from "@/platform/notify/notifications";
import { readPrefs } from "@/platform/notify/prefs";
import { renderNotice } from "@/modules/administration/notices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// WHAT A PUSH SHOULD SAY — asked by the service worker (public/sw.js) the moment
// an EMPTY push wakes it. The push itself carries nothing (platform/notify/push
// says why); this answers on the person's own session cookie, so the words are
// read by nobody but the person they are addressed to.
//
// THE NEWEST UNREAD NOTICE across every studio the person is in, in the
// device's language when it says one, else their chosen one — plus the total
// unread, which the worker puts on the app icon where the platform allows.
// Nothing unread (read on another device in the meantime) is `notice: null`,
// and the worker shows nothing new.

type StudioRow = { id: string; slug?: string; name?: string; noticeTemplates?: unknown };

export const GET = route({ auth: "user", name: "account/push/latest" }, async ({ request, user }) => {
  const userId = String(user.id);
  const asked = new URL(request.url).searchParams.get("locale");
  const [studioIds, registry, prefs] = await Promise.all([
    sMembers(IX.collab(userId)), readArr<StudioRow>(REG.studios), readPrefs(userId),
  ]);
  const locale = asked === "ar" || asked === "en" ? asked : prefs.locale;

  let newest: { notice: Record<string, unknown>; studio: StudioRow } | null = null;
  let unread = 0;
  for (const studioId of studioIds) {
    const studio = registry.find((s) => s.id === studioId);
    if (!studio) continue;
    const me = (await listCollaborators(studioId)).find((c) => String((c as { userId?: unknown }).userId) === userId);
    if (!me) continue;
    const [{ rows }, count] = await Promise.all([
      listForCollaborator(studioId, String(me.id), { unread: true, limit: 1 }),
      unreadCount(studioId, String(me.id)),
    ]);
    unread += count;
    const top = rows[0];
    if (top && (!newest || String(top.at || "") > String(newest.notice.at || ""))) newest = { notice: top, studio };
  }

  if (!newest) return { notice: null, unread };
  const words = renderNotice(newest.notice as never, locale, newest.studio.noticeTemplates);
  const href = String(newest.notice.href || "");
  return {
    unread,
    notice: {
      id: String(newest.notice.id),
      title: words.title,
      body: [words.body, newest.studio.name].filter(Boolean).join(" · "),
      url: `/${newest.studio.slug}${href ? `/${href}` : ""}`,
    },
  };
});
