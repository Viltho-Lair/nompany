"use client";

import {
  PageHeader, Card, CardHead, CardBody, Row, Col, StatCard, StatCardSkeleton, Skeleton, Icon, toneBg, toneFg, toneInk,} from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import useSuperNotifications from "@/components/super/useSuperNotifications";
import { ago } from "@/lib/format";

// The console's notification history.
//
// This page used to render three invented days of activity — a settled invoice
// numbered INV-2291, a release 4.2.0, a studio called Falcon Contracting — with
// a Preferences panel of email/push toggles beside it. All of it was scaffolding
// from the admin template. It now reads g:superNotifications, live.
//
// The Preferences panel is gone rather than kept as decoration: it offered to
// route each event type to email or push and to hold alerts during quiet hours,
// and none of those delivery channels exist. A control that does nothing is
// worse than no control — it is a promise the product does not keep.

// The tone table, built from the console's ONE tone helper rather than being a
// ninth copy of the same hand-mixed rgba() values. See toneBg/toneFg in
// _components/ui: the tint composes from the semantic token, so it follows the
// design system and the theme instead of freezing the template's palette.
const TONE_NAMES = ["primary", "success", "warning", "info", "danger"];
const TONE_FG = Object.fromEntries(TONE_NAMES.map((t) => [t, toneInk(t)]));
const TONE_BG = Object.fromEntries(TONE_NAMES.map((t) => [t, toneBg(t)]));

// Buckets by real calendar day rather than by elapsed hours, so "Yesterday"
// means yesterday and not "between 24 and 48 hours ago".
function bucketOf(iso) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "Earlier";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (then >= startOfToday) return "Today";
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (then >= startOfYesterday) return "Yesterday";
  return "Earlier";
}

const ORDER = ["Today", "Yesterday", "Earlier"];

// A NOTIFICATION-SHAPED placeholder: the same 36px bell disc, the same two lines
// of text and the same 12px timestamp, in a row of the same height. The list
// used to say "Loading…" in the middle of an empty card — one line of text where
// a column of rows was about to appear, so every arrival pushed the page.
function NotificationsSkeleton({ rows = 5 }) {
  return (
    <>
      <Skeleton className="ad-skel-text mb-3 h-2 w-16" />
      <ul className="space-y-1">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex gap-3 p-3">
            <Skeleton className="ad-skel-circle mt-0.5 h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton className="ad-skel-text h-3 w-56 max-w-full" />
              <Skeleton className="ad-skel-text mt-2 h-2.5 w-72 max-w-full opacity-70" />
              <Skeleton className="ad-skel-text mt-2.5 h-2 w-20 opacity-70" />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function NotificationsPage() {
  const { notifications, unread, loaded, status, markAllRead } = useSuperNotifications();

  const groups = ORDER.map((day) => ({
    day,
    items: notifications.filter((n) => bucketOf(n.at) === day),
  })).filter((g) => g.items.length);

  const weekAgo = Date.now() - 7 * 86400_000;
  const thisWeek = notifications.filter((n) => Date.parse(n.at) >= weekAgo).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Notifications" }]}
        actions={
          <button
            type="button"
            className="ad-btn ad-btn-outline ad-btn-sm"
            onClick={markAllRead}
            disabled={!unread}
          >
            <Icon name="check" className="h-3.5 w-3.5" /> Mark all read
          </button>
        }
      />

      {status === "offline" ? (
        <div
          className="mb-6 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: TONE_BG.warning, color: TONE_FG.warning }}
        >
          <Icon name="alert" className="h-4 w-4" />
          Not receiving live updates. Reconnecting…
        </div>
      ) : null}

      {/* Until the stream has answered, every one of these counts is 0 — which is
          not "no notifications", it is "we have not asked yet". Three zeroes
          that flick to real numbers a moment later is a worse answer than three
          reserved boxes. */}
      <Row className="mb-6">
        {loaded ? (
          <>
            <Col span={4}><StatCard label="Unread" value={String(unread)} icon="bell" tone="primary" /></Col>
            <Col span={4}><StatCard label="This week" value={String(thisWeek)} icon="activity" tone="info" /></Col>
            <Col span={4}><StatCard label="Total kept" value={String(notifications.length)} icon="clock" tone="success" /></Col>
          </>
        ) : (
          <>
            <Col span={4}><StatCardSkeleton /></Col>
            <Col span={4}><StatCardSkeleton /></Col>
            <Col span={4}><StatCardSkeleton /></Col>
          </>
        )}
      </Row>

      <Row>
        <Col span={12}>
          <Card>
            <CardHead title="All Notifications" sub="Newest first — the most recent 200 are kept" />
            <CardBody>
              {!loaded ? (
                <div role="status" aria-busy="true" aria-label="Loading notifications">
                  <span className="sr-only">Loading notifications…</span>
                  <NotificationsSkeleton />
                </div>
              ) : groups.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--ad-muted-foreground)]">Nothing yet.</p>
              ) : (
                groups.map((g) => (
                  <section key={g.day} className="mb-6 last:mb-0">
                    <p className="mb-3 text-[11px] font-600 uppercase tracking-wider text-[var(--ad-muted-foreground)]">
                      {g.day}
                    </p>
                    <ul className="space-y-1">
                      {g.items.map((n) => (
                        <li key={n.id}>
                          <div
                            className="flex gap-3 rounded-lg p-3 transition-colors hover:bg-[var(--ad-accent)]"
                            style={!n.readAt ? { backgroundColor: "color-mix(in srgb, var(--ad-primary) 5%, transparent)" } : undefined}
                          >
                            <span
                              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                              style={{
                                backgroundColor: TONE_BG[n.tone] || TONE_BG.primary,
                                color: TONE_FG[n.tone] || TONE_FG.primary,
                              }}
                            >
                              <Icon name="bell" className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-500">{n.title}</p>
                                {!n.readAt ? (
                                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "var(--ad-primary)" }} />
                                ) : null}
                              </div>
                              {n.body ? (
                                <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{n.body}</p>
                              ) : null}
                              <p className="mt-1 text-[11px] text-[var(--ad-muted-foreground)]">{ago(n.at)}</p>
                            </div>
                            {n.href ? (
                              <a href={n.href} className="ad-btn ad-btn-outline ad-btn-sm shrink-0 self-start">
                                Open
                              </a>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
