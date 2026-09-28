"use client";

import { useEffect } from "react";
import { titleWithCount } from "@/shared/notificationInbox";

// THE UNREAD COUNT IN THE TAB'S TITLE — "(3) Acme · Sales".
//
// The bell only speaks to somebody looking at it. A person working in another
// tab had no way to learn a notice had arrived, which is most of the time a
// notice matters. The title is the one surface a background tab still shows.
//
// WATCHED, NOT SET ONCE. Next writes the title itself on every navigation, so
// a count applied when it changed would vanish at the next click. An observer
// on <head> re-applies it whenever the title is rewritten; it settles after
// one pass because re-applying an already-counted title changes nothing.
export default function useUnreadTitle(unread) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const apply = () => {
      const want = titleWithCount(document.title, unread);
      if (document.title !== want) document.title = want;
    };
    apply();
    const watch = new MutationObserver(apply);
    watch.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => {
      watch.disconnect();
      // Leave the title as the page wrote it: an unmounted bell has nothing
      // left to count.
      document.title = titleWithCount(document.title, 0);
    };
  }, [unread]);
}
