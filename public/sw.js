// nompany's service worker — WEB PUSH AND NOTHING ELSE (29/09/2026).
//
// THERE IS NO `fetch` HANDLER, deliberately. This worker does not cache, does
// not serve pages offline and never stands between a page and the network; a
// worker that intercepted requests would be a second place every deploy could
// go stale. It exists so a push can wake something when nompany is closed.
//
// THE PUSH ARRIVES EMPTY. It travels through the browser vendor's servers, so
// it carries no words (platform/notify/push.ts); this worker asks nompany what
// to show, on the person's own session, in the language the device registered
// with (`?locale=` on this script's own URL).
//
// A PUSH MUST SHOW SOMETHING. Browsers require every push to produce a visible
// notification and penalise a site that stays silent, so when the fetch fails
// or everything was already read on another device, a plain line is shown
// rather than nothing.

const LOCALE = new URL(self.location.href).searchParams.get("locale") === "ar" ? "ar" : "en";
const WORDS = {
  en: { fallback: "New notification", unread: (n) => `${n} unread in nompany` },
  ar: { fallback: "إشعار جديد", unread: (n) => `${n} غير مقروء في nompany` },
}[LOCALE];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let data = null;
    try {
      const res = await fetch(`/api/account/push/latest?locale=${LOCALE}`, { credentials: "same-origin", cache: "no-store" });
      if (res.ok) data = await res.json();
    } catch { /* offline, or signed out: the fallback below still shows */ }

    // THE COUNT ON THE APP ICON, where the platform has one (an installed app on
    // iOS, Android, Windows, macOS). Cleared when nothing is unread.
    try {
      if (data && "setAppBadge" in self.navigator) {
        if (data.unread > 0) await self.navigator.setAppBadge(data.unread);
        else await self.navigator.clearAppBadge();
      }
    } catch { /* a badge is a nicety */ }

    const n = data && data.notice;
    const title = n ? n.title : (data && data.unread > 0 ? WORDS.unread(data.unread) : WORDS.fallback);
    await self.registration.showNotification(title, {
      body: n ? n.body : "",
      // ONE PER NOTICE: the same notice pushed twice replaces itself.
      tag: n ? `nompany-${n.id}` : "nompany",
      icon: "/brand/logo-icon.png",
      badge: "/brand/logo-icon.png",
      lang: LOCALE,
      dir: LOCALE === "ar" ? "rtl" : "ltr",
      data: { url: n ? n.url : "/" },
    });
  })());
});

// OPEN WHERE THE NOTICE POINTS — in a nompany tab already open if there is one,
// rather than a new window every time.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const tab of tabs) {
      if (new URL(tab.url).origin === self.location.origin && "focus" in tab) {
        await tab.focus();
        if ("navigate" in tab) await tab.navigate(url);
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
