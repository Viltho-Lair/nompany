'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { useStudioLocale } from '@/components/studio2/locale';
import { plannerDict } from '@/shared/studio/planner';
import { availabilityWindow, type BusyInterval } from '@/shared/calendar';
import type { Resource } from '@/components/planner/lib/types';
import type { Timeline } from '@/components/planner/lib/timeline';
import { Switch } from '@/components/planner/ui/primitives';
import { cn, formatMediumDate } from '@/components/planner/lib/utils';
import { Avatar } from './Avatar';

/* ------------------------------------------------------------------ *
 * WHEN A COLLEAGUE IS BUSY. Never what they are doing.
 *
 * A block on this strip carries no title, no location and no guest —
 * not because they are hidden here, but because none was ever fetched:
 * the whole path behind it (shared/calendar's BusyInterval, busyFor,
 * teamAvailability, the availability route) is two instants wide by
 * construction. Nothing on this screen may promise a detail that does
 * not exist, which is why a busy block has no tooltip: a tooltip is a
 * promise that hovering will tell you more, and hovering cannot.
 *
 * THE GEOMETRY IS THE CHART'S, NOT A SECOND COPY. Every position here
 * comes from the same `Timeline` object GanttHeader and GanttBody are
 * drawn from, through the same `timeline.x(date)`. A strip that
 * recomputed pixels-per-day from the same dates would agree today and
 * part company the first time the chart's padding, alignment or "fit to
 * tasks" trimming changed — and a strip whose columns drift from the
 * chart above it is worse than no strip, because it is confidently
 * wrong about a colleague's afternoon.
 * ------------------------------------------------------------------ */

/** One person's lane. Shorter than a task row — this is a footnote to the plan. */
const LANE_HEIGHT = 22;

/**
 * What one person's lookup came back as, exactly as the availability route
 * answers. `connected` is optional HERE and required there — not to tolerate an
 * older server, but because NOTHING VALIDATES THIS BODY: the fetch below casts
 * `body.people`, it does not parse it, so at runtime the field genuinely may be
 * absent and the type has to say so. What matters is which way the absence
 * resolves, and it resolves to unknown; see `unconnected` in Lane.
 */
type PersonRow = { collaboratorId: string; busy: BusyInterval[]; connected?: boolean; error?: string };

/** Where the strip is between asking and knowing. */
type Phase = 'idle' | 'loading' | 'ready' | 'failed';

/**
 * One answer, tagged with the request that produced it. `byId: null` is a
 * request that failed — which is NOT the same as one that came back empty, and
 * the difference is the whole strip: an empty answer means nobody opted in, a
 * failed one means we know nothing at all.
 */
type Answer = { key: string; byId: Map<string, PersonRow> | null };

/*
 * THE WINDOW ACTUALLY ASKED FOR — availabilityWindow, which used to live here
 * and now sits in shared/calendar.ts beside the rule the route judges it by.
 * It was the one piece of arithmetic in this file that could be wrong in a way
 * the eye cannot catch, and it WAS: exported for testability, imported by
 * nothing, and a JSX file is not something the suite's loader can import. Next
 * to the route's own rule it is one import away from both, and the two are
 * asserted against each other in tests/connected-calendars.mjs.
 */

/**
 * Diagonal hatching — the texture of "we do not know".
 *
 * NOT A COLOUR ON ITS OWN. A pale grey lane and an empty lane are the same
 * thing to a tired reader and to a colour-blind one, and the two facts they
 * would be carrying are opposites: "this calendar was never shown to you" and
 * "this calendar is open all week". Texture is what makes them impossible to
 * confuse at a glance, which is the entire reason this strip exists.
 */
function hatch(color: string): React.CSSProperties {
  return {
    backgroundImage: `repeating-linear-gradient(45deg, ${color} 0 3px, transparent 3px 7px)`,
  };
}

/**
 * The second texture: "there is nothing to ask".
 *
 * A DIFFERENT SHAPE, NOT A DIFFERENT SHADE. It sits beside hatching on the same
 * strip, and the two say different things — a calendar that was never shared
 * with you against one that does not exist. Two greys at different opacities
 * would be one grey to anybody not comparing them side by side.
 */
function dots(color: string): React.CSSProperties {
  return {
    backgroundImage: `radial-gradient(${color} 1px, transparent 1.2px)`,
    backgroundSize: '5px 5px',
  };
}

export function AvailabilityStrip({
  slug,
  timeline,
  people,
  syncFrom,
  gutterWidth,
  timelineVisible,
}: {
  /** The tenant's own address. The two routes this reads are studio-scoped. */
  slug: string;
  /** The chart's timeline. Read, never rebuilt. */
  timeline: Timeline;
  /** The plan's people, in the order the header's avatar stack shows them. */
  people: Resource[];
  /**
   * The chart's own scroll pane. The lanes mirror its horizontal position so a
   * column under the strip is the column above it — one-way, because the lanes
   * do not scroll on their own and so can never push back.
   */
  syncFrom: React.RefObject<HTMLDivElement | null>;
  /**
   * How far the chart column starts from the shell's inline edge. The strip
   * spans the whole pane so its controls have room, so its lanes have to begin
   * exactly where the chart's do — and the shell already knows that number,
   * because it is the width it lays the information table out at.
   */
  gutterWidth: number;
  /**
   * Whether the waterfall is on screen. False in the information-table view,
   * where there is no timeline to draw lanes against.
   *
   * THE BAND STILL RENDERS THERE, WITHOUT ITS LANES. It used to be hidden
   * outright, which meant somebody who works only in the table could never
   * reach their own consent switch — a privacy control that exists but cannot
   * be found is not much better than one that does not exist. The lanes go and
   * the switch stays, and nothing is fetched from anyone's calendar provider,
   * because there is nothing here that could draw the answer.
   */
  timelineVisible: boolean;
}) {
  const locale = useStudioLocale();
  const tr = plannerDict(locale);
  const switchId = React.useId();

  // CLOSED UNTIL ASKED FOR. Opening this band is what sends a request to every
  // sharer's calendar provider, so it must be a deliberate act rather than a
  // side effect of opening a plan — nobody's Google account should be polled
  // because somebody glanced at a Gantt chart.
  const [open, setOpen] = React.useState(false);
  const [sharing, setSharing] = React.useState<boolean | null>(null);
  const [hasConnection, setHasConnection] = React.useState<boolean | null>(null);
  const [saveFailed, setSaveFailed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  // THE ANSWER CARRIES THE QUESTION IT ANSWERS. "Loading" is then derived —
  // the answer in hand is for a different window than the one now drawn —
  // rather than written into state at the top of the effect. Two reasons, and
  // the second is the one that matters: a synchronous setState in an effect
  // body costs a cascading render, and, far worse, an answer for last window
  // would otherwise still be on screen for the frame between the range
  // changing and the effect running. On this strip that frame shows one
  // person's busy blocks against another window's dates.
  const [answer, setAnswer] = React.useState<Answer | null>(null);
  // Bumped after a successful save so the strip re-reads: switching sharing on
  // has to make your own row appear, and off has to make it disappear.
  const [reload, setReload] = React.useState(0);
  // The consent read's own two pieces of state: whether the last attempt came
  // back at all, and a counter the retry button bumps to attempt it again.
  // `sharing === null` alone cannot say which of "still loading" and "could not
  // be read" is true, and the switch has to stay disabled through both while
  // only one of them is worth putting words on screen for.
  const [shareUnreadable, setShareUnreadable] = React.useState(false);
  const [shareReload, setShareReload] = React.useState(0);
  const lanesRef = React.useRef<HTMLDivElement>(null);

  const { from, to } = React.useMemo(
    () => availabilityWindow(timeline.origin, timeline.end, new Date()),
    [timeline.origin, timeline.end],
  );
  const fromISO = from.toISOString();
  const toISO = to.toISOString();
  // What is being asked, as one value: the window, plus the reload counter so a
  // save invalidates an answer that is otherwise for the same window.
  const requestKey = `${fromISO}|${toISO}|${reload}`;
  const current = answer && answer.key === requestKey ? answer : null;
  const byId = current?.byId ?? null;
  // Nothing is asked for while the lanes are not on screen, so nothing is
  // pending either — `idle` covers both the closed band and the table view.
  const asking = open && timelineVisible;
  const phase: Phase = !asking ? 'idle' : !current ? 'loading' : byId ? 'ready' : 'failed';

  /* ---- follow the chart sideways ----
   * The band opens LONG AFTER the chart has scrolled itself to today, so the
   * first thing this does is catch up; without that the lanes would sit at day
   * zero under a chart showing next month, which is the drift this component
   * exists not to have. A plain listener rather than the shell's mirrored
   * onScroll handlers: those guard against a feedback loop between two panes
   * that both scroll, and these lanes never scroll on their own. */
  React.useEffect(() => {
    const source = syncFrom.current;
    if (!asking || !source) return;
    const follow = () => {
      if (lanesRef.current) lanesRef.current.scrollLeft = source.scrollLeft;
    };
    follow();
    source.addEventListener('scroll', follow, { passive: true });
    return () => source.removeEventListener('scroll', follow);
  }, [asking, syncFrom, people.length, timeline.width]);

  /* ---- my own consent, and whether I have anything to consent with ---- */
  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      // Both are the caller's own state; neither takes a collaborator id,
      // because neither route accepts one (see calendar-share/route.ts).
      const [share, account] = await Promise.all([
        fetch(`/api/studios/${encodeURIComponent(slug)}/calendar-share`, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch('/api/account/calendar', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      if (!alive) return;
      // A FAILED READ IS SAID OUT LOUD, exactly as a failed save already is.
      // It used to be swallowed here: `sharing` stayed null, `disabled` stayed
      // true, and the one control this screen exists for sat permanently grey
      // with nothing on screen explaining why — one blip at mount was enough,
      // and nothing retried. Silence is the worst outcome for a consent
      // control, because a dead switch is indistinguishable from a switch
      // somebody has already decided about.
      //
      // AND IT IS NOT DEFAULTED TO OFF. Rendering "not sharing" when the value
      // could not be read would assert something nothing established — the
      // same class of error as drawing an unknown calendar as a free one, one
      // control instead of one lane. So the switch stays disabled while the
      // answer is genuinely unknown, and the line below says why.
      setShareUnreadable(!share);
      if (share) setSharing(Boolean(share.sharing));
      // The account read gets no such treatment, on purpose: its only job is
      // to decide whether to OFFER the connect hint, and a failure there falls
      // back to not offering it. Nothing is disabled and nothing is asserted.
      if (account) setHasConnection((account.connections || []).length > 0);
    })();
    return () => {
      alive = false;
    };
  }, [open, slug, shareReload]);

  /* ---- the strip itself ---- */
  React.useEffect(() => {
    if (!asking) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/studios/${encodeURIComponent(slug)}/availability?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`,
          { cache: 'no-store' },
        );
        if (!alive) return;
        // A REFUSAL IS NOT AN EMPTY STRIP. `{ people: [] }` means nobody in
        // this studio has opted in — a real, sayable fact. A 400 or a dropped
        // connection means we know nothing at all, and rendering the two the
        // same way would report every colleague as free because a query string
        // was malformed.
        if (!res.ok) {
          setAnswer({ key: requestKey, byId: null });
          return;
        }
        const body = await res.json();
        if (!alive) return;
        const rows: PersonRow[] = Array.isArray(body?.people) ? body.people : [];
        setAnswer({ key: requestKey, byId: new Map(rows.map((r) => [String(r.collaboratorId), r])) });
      } catch {
        if (alive) setAnswer({ key: requestKey, byId: null });
      }
    })();
    return () => {
      alive = false;
    };
  }, [asking, slug, fromISO, toISO, requestKey]);

  async function toggleSharing(next: boolean) {
    setSaving(true);
    setSaveFailed(false);
    try {
      const res = await fetch(`/api/studios/${encodeURIComponent(slug)}/calendar-share`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sharing: next }),
      });
      const body = await res.json().catch(() => ({}));
      // THE ANSWER IS THE STORED STATE, NOT WHAT WAS ASKED FOR — the route
      // reads it back out of a compare-and-set. Believing the request instead
      // would show a switch that is on while the store says off, which is the
      // worst possible lie for a consent control.
      if (!res.ok || typeof body?.sharing !== 'boolean') {
        setSaveFailed(true);
      } else {
        setSharing(body.sharing);
        setReload((n) => n + 1);
      }
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  // Where the answered window sits inside the drawn one, in the chart's own
  // pixels. See the overlay below for what is done with the gap.
  const headX = Math.max(0, timeline.x(from));
  const tailX = Math.min(timeline.width, timeline.x(to));

  return (
    <div data-planner-chrome className="shrink-0 border-t border-slate-200 bg-white">
      {/* ------------------------- the control row ------------------------- */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 hover:text-slate-900"
        >
          {/* Closed, the chevron points at the band's inline start — so it has
              to turn the other way in Arabic. `-rotate-90` with an `rtl:`
              override rather than an `ltr:` variant, which needs a `dir`
              attribute on an ancestor to fire at all. */}
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90 rtl:rotate-90')}
          />
          {tr.availability}
        </button>

        {open && (
          <>
            {/* The window and the legend describe the lanes, so they go where
                the lanes are. In the table view the switch is the whole band. */}
            {timelineVisible && (
              <>
                <span className="text-[11px] text-slate-400">
                  {formatMediumDate(from, locale)} → {formatMediumDate(to, locale)}
                </span>

                <Legend />
              </>
            )}

            {/* THE SWITCH SITS BESIDE WHAT IT CONTROLS, on purpose: somebody
                deciding whether to share can see, in the same glance, exactly
                what a colleague would then see — a shaded band and nothing
                else. A consent control on a settings page three screens away
                is a promise the person has to take on trust. */}
            <div className="ms-auto flex items-center gap-2 text-[12px] text-slate-600">
              <Switch
                id={switchId}
                checked={Boolean(sharing)}
                disabled={sharing === null || saving}
                onCheckedChange={toggleSharing}
              />
              <label htmlFor={switchId} className="cursor-pointer font-medium">
                {tr.availabilityShareLabel}
              </label>
            </div>
          </>
        )}
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-x-2 px-3 pb-1.5 text-[11px] text-slate-500">
          <span>{tr.availabilityShareHint}</span>
          {/* SOMEBODY WITH NO CALENDAR CONNECTED IS TOLD SO, rather than left
              with a switch that appears to do nothing. Connecting is an
              ACCOUNT act, not a studio one — a connection is reachable from
              every studio a person is in — so the link leaves for the account
              screen, and in a new tab so an open plan is not thrown away. */}
          {hasConnection === false && (
            <>
              <span className="text-amber-700">{tr.availabilityNoCalendar}</span>
              <a
                href={`/${locale}/account?view=calendars`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary underline underline-offset-2"
              >
                {tr.availabilityConnectInAccount}
              </a>
            </>
          )}
          {saveFailed && <span className="text-rose-600">{tr.availabilityShareFailed}</span>}
          {/* The read failed, so the switch above is disabled and this says so.
              A retry rather than a reload of the whole plan: the plan itself is
              fine, and re-running one effect is the smallest thing that can put
              the control back. */}
          {shareUnreadable && (
            <>
              <span className="text-rose-600">{tr.availabilityShareUnreadable}</span>
              <button
                type="button"
                onClick={() => {
                  // Cleared first, so the retry reads as an attempt in progress
                  // (disabled, no message) rather than as a message that
                  // ignored the click.
                  setShareUnreadable(false);
                  setShareReload((n) => n + 1);
                }}
                className="font-semibold text-primary underline underline-offset-2"
              >
                {tr.retry}
              </button>
            </>
          )}
        </div>
      )}

      {/* ---------------------------- the lanes ---------------------------- */}
      {/* A LANE IS A TIMELINE OR IT IS NOTHING. In the information-table view
          there is no waterfall to align to, so the band keeps its switch — the
          reason it renders there at all — and drops the drawing, rather than
          inventing a second timeline of its own beside a table that has none. */}
      {open && timelineVisible && (
        people.length === 0 ? (
          <p className="px-3 pb-2 text-[11px] text-slate-400">{tr.availabilityNobodyAssigned}</p>
        ) : (
          <div className="flex pb-1.5">
            {/* The chart column's own inline offset, so lane x=0 lands on
                timeline origin x=0 exactly as it does in the header above. */}
            <div className="shrink-0" style={{ width: gutterWidth }} />
            <div
              ref={lanesRef}
              className="no-scrollbar min-w-0 flex-1 overflow-x-hidden"
              aria-busy={phase === 'loading'}
            >
              <div className="relative" style={{ width: timeline.width }}>
                {people.map((person) => (
                  <Lane
                    key={person.id}
                    person={person}
                    row={byId ? byId.get(person.id) : undefined}
                    known={Boolean(byId)}
                    phase={phase}
                    timeline={timeline}
                    tr={tr}
                  />
                ))}

                {/* THE PART OF THE DRAWN TIMELINE NOBODY ASKED ABOUT. Drawn
                    ONCE, across every lane, rather than per person — it is a
                    fact about the request, not about anyone's calendar, and
                    repeating it inside each lane would make it read as a
                    fifth per-person state. Left blank it would say "everybody
                    is free out here", which is the same mistake as rendering
                    a private calendar as an empty one, one range wide instead
                    of one person wide. */}
                {headX > 0 && (
                  <OutsideWindow left={0} width={headX} align="end" label={tr.availabilityOutsideWindow} />
                )}
                {tailX < timeline.width && (
                  <OutsideWindow
                    left={tailX}
                    width={timeline.width - tailX}
                    align="start"
                    label={tr.availabilityOutsideWindow}
                  />
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

/* ================================= LANE ================================= */

function Lane({
  person,
  row,
  known,
  phase,
  timeline,
  tr,
}: {
  person: Resource;
  row: PersonRow | undefined;
  known: boolean;
  phase: Phase;
  timeline: Timeline;
  tr: ReturnType<typeof plannerDict>;
}) {
  /* THE FIVE STATES THIS STRIP EXISTS TO KEEP APART. Only ONE of them may
   * look like an open afternoon, and it is the last one.
   *
   *  absent from `people`  → UNKNOWN. They never opted in. An empty lane here
   *                          would advertise a private calendar as bookable,
   *                          which is precisely the failure this whole phase
   *                          was built to prevent.
   *  `error` on the row    → UNKNOWN, WITH A REASON. Their provider could not
   *                          be reached. Also never free: a lookup that failed
   *                          and an open afternoon are opposite facts.
   *  not `connected: true` → UNKNOWN, WITH NOTHING TO ASK. They opted in and
   *                          have hooked no calendar up, so their `busy` is
   *                          empty for a reason that says nothing whatever
   *                          about their time. This one is the most dangerous
   *                          of the three unknowns, because it arrives looking
   *                          EXACTLY like the free case below — same empty
   *                          array, same absent error — and only the field
   *                          studioAvailability.ts carries tells them apart.
   *  `busy: []`, connected → FREE. They opted in, a calendar answered, and
   *                          there is genuinely nothing there. The only state
   *                          that may look empty.
   *  `busy: [...]`         → BUSY, and nothing more than that.
   *
   * A row may be both: `busy` still carries whatever one provider answered
   * when another failed, so an error row draws its blocks AND its hatching.
   */
  const pending = !known;
  // Which kind of "no answer yet" this is: still in flight, or the request
  // came back refused. They caption differently, so they must draw differently.
  const pendingWait = pending && phase !== 'failed';
  const pendingFailed = pending && phase === 'failed';
  const missing = known && !row;
  const failed = Boolean(row?.error);
  // `!== true`, NOT `=== false`. This read `=== false`, defended as tolerance
  // for a browser and a server on different bundles — but the field and this
  // strip shipped in the same commit, so no server that omits it has ever
  // existed, and the branch only decided what to do with a body that arrived
  // MALFORMED. It decided "free": `connected` absent with an empty `busy` fell
  // through to the one state this whole phase exists to forbid. Absent is not
  // false, but it is certainly not `connected: true` either, and every way of
  // not being true is an unknown.
  const unconnected = Boolean(row) && !failed && row?.connected !== true;
  const busy = row?.busy ?? [];
  const free = known && row && !failed && !unconnected && busy.length === 0;

  const caption = pending
    ? phase === 'failed'
      ? tr.availabilityUnavailable
      : tr.availabilityChecking
    : missing
      ? tr.availabilityNotShared
      : failed
        ? tr.availabilityUnavailable
        : unconnected
          ? tr.availabilityNoCalendarConnected
          : free
            ? tr.availabilityFree
            : '';

  const unknown = pending || missing || failed || unconnected;

  return (
    <div
      className="relative border-b border-slate-100 last:border-b-0"
      style={{ height: LANE_HEIGHT }}
      aria-label={`${person.name}: ${caption || tr.availabilityBusy}`}
    >
      {/* THE UNKNOWN WASH, and three textures rather than one colour. The three
          unknowns are different facts and a reader has to be able to tell them
          apart at a glance: stripes for a calendar that was never shared, dots
          for one that does not exist, amber stripes for one that could not be
          reached. Texture and not merely tint, because a pale wash and an empty
          lane are the same thing to a tired reader and to a colour-blind one —
          and the fact they would be confusing is "bookable" against "nobody
          knows".

          A WHOLE-REQUEST FAILURE TAKES THE AMBER, not the grey. Every lane is
          unknown then, and the caption on each already reads "Couldn't be
          checked" — wearing the stripes the legend labels "Not shared" would
          have made the legend briefly disagree with the caption beside it. A
          request still in flight gets neither texture but a plain wash, which
          is in no legend entry at all, because it is a state that resolves on
          its own and nothing should be looked up to understand it. */}
      {unknown && (
        <div
          className={cn('pointer-events-none absolute inset-0', pendingWait && 'bg-slate-100/70')}
          style={
            pendingWait
              ? undefined
              : failed || pendingFailed
                ? hatch('rgba(217,119,6,0.32)')
                : unconnected
                  ? dots('rgba(100,116,139,0.42)')
                  : hatch('rgba(100,116,139,0.22)')
          }
        />
      )}

      {/* BUSY BLOCKS. Positioned with physical `left`, exactly as every tick in
          GanttHeader and every bar in GanttBody is: the chart lays its calendar
          out left-to-right in both languages, and a lane using
          inset-inline-start would mirror in Arabic while the chart above it did
          not — the two would part company by the width of the whole plan. The
          band's own chrome, which is prose, uses logical properties throughout. */}
      {busy.map((interval) => {
        const start = timeline.x(new Date(interval.start));
        const width = Math.max(timeline.x(new Date(interval.end)) - start, 2);
        return (
          <div
            key={`${interval.start}-${interval.end}`}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-[2px] bg-slate-500/70"
            style={{ left: start, width, top: 5, height: LANE_HEIGHT - 10 }}
          />
        );
      })}

      {/* Identity, pinned to the start of the scroll port so it survives being
          scrolled away from. An avatar rather than a name: it occludes twenty
          pixels of lane instead of a hundred and forty, and it carries the name
          in the tooltip the planner already gives every avatar. */}
      {/* PINNED AND PADDED PHYSICALLY, BOTH INLINE, WHICH IS HOW ITS NEIGHBOUR
          DOES IT. This element sticks to the timeline's left edge because that
          is where the chart's day zero is in both languages, and `ps-1` beside
          it would have flipped to the other side in Arabic and pushed the
          avatar off the very edge it is pinned to.

          The physical values are inline styles rather than Tailwind utilities
          for the same reason GanttChart's every tick, bar and marker is: an
          inline style is a stated exception at the place it is made, while a
          physical utility class is one more entry in the count Gate A holds a
          ceiling over, and that ceiling exists to stop a mirroring backlog
          growing before Wave 4 rewrites these screens. Only `sticky` is a
          class, because sticky has no handedness at all. */}
      <div
        className="pointer-events-none sticky z-10 flex h-full w-fit items-center gap-1.5"
        style={{ left: 0, paddingLeft: 4 }}
      >
        <span className="pointer-events-auto rounded-full bg-white/85">
          <Avatar resource={person} size={16} />
        </span>
        {caption && (
          <span
            className={cn(
              'whitespace-nowrap rounded bg-white/85 px-1 text-[10px] font-medium leading-none',
              failed ? 'text-amber-700' : missing ? 'text-slate-500' : 'text-slate-400',
            )}
          >
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}

/* ========================== OUTSIDE THE WINDOW ========================== */

/**
 * A region of the drawn timeline the request did not cover, labelled.
 *
 * A DIFFERENT TEXTURE FROM AN UNKNOWN LANE, deliberately. Both are "we do not
 * know", but a reader has to be able to tell WHY: one is a colleague who did
 * not opt in, the other is a stretch of calendar nobody was asked about. The
 * word does that work; the dotted edge marks where the answer stops.
 *
 * `left`/`width` in pixels, physical — same frame as the lanes and the chart.
 * `align` is which of the region's own edges the label hugs, which is the edge
 * next to the answered range, so the word sits where the boundary is.
 */
function OutsideWindow({
  left,
  width,
  align,
  label,
}: {
  left: number;
  width: number;
  align: 'start' | 'end';
  label: string;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 flex items-center overflow-hidden"
      style={{
        left,
        width,
        justifyContent: align === 'start' ? 'flex-start' : 'flex-end',
        ...hatch('rgba(148,163,184,0.30)'),
      }}
    >
      <span className="whitespace-nowrap bg-white/80 px-1 text-[10px] font-medium text-slate-400">
        {label}
      </span>
    </div>
  );
}

/* =============================== LEGEND ================================= */

function Legend() {
  const tr = plannerDict(useStudioLocale());
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500">
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-4 rounded-[2px] bg-slate-500/70" />
        {tr.availabilityBusy}
      </span>
      <span className="flex items-center gap-1">
        <span
          className="h-2.5 w-4 rounded-[2px] border border-slate-200"
          style={hatch('rgba(100,116,139,0.35)')}
        />
        {tr.availabilityNotShared}
      </span>
      <span className="flex items-center gap-1">
        <span
          className="h-2.5 w-4 rounded-[2px] border border-slate-200"
          style={dots('rgba(100,116,139,0.55)')}
        />
        {tr.availabilityNoCalendarConnected}
      </span>
      <span className="flex items-center gap-1">
        <span
          className="h-2.5 w-4 rounded-[2px] border border-amber-200"
          style={hatch('rgba(217,119,6,0.45)')}
        />
        {tr.availabilityUnavailable}
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-4 rounded-[2px] border border-slate-200 bg-white" />
        {tr.availabilityFree}
      </span>
    </span>
  );
}
