"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLive } from "@/components/studio2/LiveProvider";
import { mergeNotices } from "@/shared/notificationInbox";
import useUnreadTitle from "@/components/notifications/useUnreadTitle";

// THIS PERSON'S NOTIFICATIONS, ONCE PER TAB.
//
// Three things showed an unread count and each fetched its own: the bell, the
// Nova launcher's dot (polling the whole list every two minutes to count it),
// and now the notification page. Three reads of one answer are three answers
// free to disagree for a moment, and one of them was a timer. The first page
// and the COUNT live here, and every surface reads them.
//
// THE COUNT IS THE SERVER'S. The bell holds thirty rows and a person may have
// hundreds unread, so the count is asked for (the route counts in Postgres)
// and then moved by what this tab itself does: a streamed arrival adds one, a
// read subtracts. Every connect re-reads both, which is what reconciles a
// count the tab could only estimate.
const InboxContext = createContext(null);

export function useInbox() {
  return useContext(InboxContext);
}

const PAGE = 30;

export default function InboxProvider({ slug, children }) {
  const live = useLive();
  const [rows, setRows] = useState([]);
  const [serverUnread, setServerUnread] = useState(0);
  // THE STUDIO'S OWN WORDING, served with the list. Null until the first
  // load, which is the same as "no overrides" — `renderNotice` falls back to
  // the shipped template, so a notice is never blank while it waits.
  const [templates, setTemplates] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const streamed = live?.notifications;
  const setStreamed = live?.setNotifications;
  const connection = live?.connection;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/studios/${slug}/notifications?limit=${PAGE}`, { cache: "no-store" });
      if (!res.ok) return;
      const out = await res.json();
      setRows(Array.isArray(out.notifications) ? out.notifications : []);
      setServerUnread(Number(out.unread) || 0);
      setTemplates(out.noticeTemplates || null);
      setLoaded(true);
    } catch {
      // Offline or navigating away. What we had stands; the next connect retries.
    }
  }, [slug]);

  // Re-read on EVERY connect, recycles included (see LiveProvider's counter):
  // the personal channel has no replay, so a connect is exactly when something
  // may have been missed.
  useEffect(() => {
    if (connection) load();
  }, [connection, load]);

  const merged = useMemo(() => mergeNotices(streamed, rows), [streamed, rows]);
  // What the server counted, plus what arrived on the stream since and is not
  // in the fetched page. Never below nought, whatever order things land in.
  const arrived = useMemo(() => {
    const fetched = new Set(rows.map((r) => r.id));
    return (streamed || []).filter((n) => !fetched.has(n.id) && !n.readAt).length;
  }, [streamed, rows]);
  const unread = Math.max(0, serverUnread + arrived);
  useUnreadTitle(unread);

  // Everything this tab changes is applied to BOTH lists at once — optimistic,
  // because the count is the point and should not wait for a round trip — and
  // then reconciled by a load.
  const patchBoth = useCallback((fn) => {
    setRows((prev) => fn(prev));
    setStreamed?.((prev) => fn(prev));
  }, [setStreamed]);

  const send = useCallback(async (body) => {
    try {
      await fetch(`/api/studios/${slug}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // The optimistic state stands; the load below reconciles it.
    }
    load();
  }, [slug, load]);

  // HOW MANY OF THESE THE SERVER'S COUNT ALREADY INCLUDES — only the FETCHED
  // rows. A notice that arrived on the stream after the last load is counted
  // by `arrived` instead, and reading it takes it out of `arrived` by itself;
  // subtracting it from the server's count as well took it off twice, and the
  // badge flashed "0" for a moment when six were unread and three were read.
  const fetchedUnread = useCallback((wanted) =>
    rows.filter((n) => !n.readAt && (!wanted || wanted.has(n.id))).length, [rows]);

  /** Mark read — `ids` empty means all of mine. */
  const markRead = useCallback(async (ids = []) => {
    const at = new Date().toISOString();
    const wanted = ids.length ? new Set(ids) : null;
    const hits = fetchedUnread(wanted);
    setServerUnread((u) => (wanted ? Math.max(0, u - hits) : 0));
    patchBoth((prev) => prev.map((n) => (n.readAt || (wanted && !wanted.has(n.id)) ? n : { ...n, readAt: at })));
    await send(ids.length ? { ids } : {});
  }, [fetchedUnread, patchBoth, send]);

  /** Put notices away (or back). Archiving reads them too, as the server does. */
  const setArchived = useCallback(async (ids, archived = true) => {
    if (!ids?.length) return;
    const wanted = new Set(ids);
    if (archived) {
      const hits = fetchedUnread(wanted);
      setServerUnread((u) => Math.max(0, u - hits));
      patchBoth((prev) => prev.filter((n) => !wanted.has(n.id)));
    }
    await send({ ids, action: archived ? "archive" : "unarchive" });
  }, [fetchedUnread, patchBoth, send]);

  const value = useMemo(
    () => ({ rows: merged, unread, templates, loaded, reload: load, markRead, setArchived }),
    [merged, unread, templates, loaded, load, markRead, setArchived],
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}
