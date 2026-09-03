import { cookies } from "next/headers";
import { UI_LANG_COOKIE, preferredLocale, dirFor } from "@/shared/i18n";
import { commonDict } from "@/shared/studio/common";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";

// WHAT A SECTION CLICK LOOKS LIKE WHILE THE SERVER IS STILL ANSWERING.
//
// THE DEFECT THIS EXISTS FOR. The studio page is `force-dynamic` and there was
// no loading boundary anywhere under app/studio, so the App Router had nothing
// to show and BLOCKED the navigation until the whole RSC payload arrived.
// Measured in the sandbox with a MutationObserver on <main>: `firstDomChange:
// null` on every navigation recorded — not one pixel changed — and the address
// bar itself did not move for 767ms. The click read as broken rather than slow,
// which is the worse of the two, and it is the half of the latency complaint
// that no amount of server work would have fixed.
//
// A boundary here gives the router something to paint the instant the click
// lands. The wait did not get shorter; it stopped being invisible.
//
// SHAPED LIKE THE SHELL, NOT LIKE A SPINNER, and that is load-bearing rather
// than decorative. Until the shell moves into a real layout.js (the planned
// follow-up), this file replaces the ENTIRE studio during a navigation — the
// sidebar included — because a loading boundary replaces everything below it
// and there is no layout above it to hold anything still. So the geometry below
// is copied from StudioFrame deliberately: the same fixed inset-y-4 start-4
// w-64 rounded-geex panel, the same lg:ps-72 content column, the same sticky
// header and the same mx-auto max-w-[1400px] main. What the eye sees is the
// studio greying out for a moment, not the studio disappearing and coming back.
//
// It is the reason this is not a spinner. A spinner in the middle of a blank
// viewport would say "the page went away"; this says "the page is still here".
//
// THE DIRECTION IS A GUESS, AND IT IS THE BEST ONE AVAILABLE HERE.
//
// A studio's language is `preferredLocale(cookie, studioLocale(studio))` — the
// person's own choice over the tenant's default — and the tenant's default is a
// DATABASE READ. A loading boundary runs before any read by definition, so half
// that expression is unreachable from this file and always will be.
//
// The cookie half is reachable and free, so it is used: anyone who has ever
// touched a LangMenu is rendered in their own language, and so is every member
// of an English studio, because English is what `preferredLocale` falls back to.
// The one case this gets wrong is a member of an ARABIC-DEFAULT studio who has
// never set a preference — they see an LTR skeleton for a moment before the real
// shell mirrors it. That is narrow, it is temporary, and it is strictly better
// than the alternative of pinning this to English for everybody.
//
// It goes away entirely with layout.js: a layout resolves the studio, so it
// knows the tenant's default, and the boundary then sits INSIDE a shell that has
// already declared `dir` — no guess left to make. Do not paper over this with a
// second cookie holding the studio's locale; that is a cache of a database fact
// with no invalidation, which is how the UI and the write paths disagreed before.
//
// WHY `dir` IS ON THIS DIV AND NOT INHERITED. The proxy sets `x-locale` only on
// the locale-prefixed public routes; a studio address gets `x-studio-slug` and
// nothing else, so <html> is always `ltr` here and StudioFrame declares the real
// direction on a div of its own. This mirrors that exactly — same attribute, same
// level — which is also why the logical properties below (start-, ps-) resolve
// the way the real shell's do.
export default async function StudioLoading() {
  const locale = preferredLocale((await cookies()).get(UI_LANG_COOKIE)?.value);
  const dir = dirFor(locale);
  // ScreenSkeleton reads the locale from StudioLocaleProvider, and there is no
  // provider above a loading boundary — it would silently fall back to English.
  // The word is resolved here instead and handed down, which is exactly what
  // `loadingLabel` is for.
  const word = commonDict(locale).loading;

  return (
    <div
      lang={locale}
      dir={dir}
      // `aria-busy` on the region rather than a second live region: ScreenSkeleton
      // already announces, and two of them means the same wait is read out twice.
      aria-busy="true"
      className="min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300"
    >
      <aside className="fixed inset-y-4 start-4 z-30 hidden w-64 overflow-hidden rounded-geex bg-[var(--geex-surface)] shadow-geex lg:block">
        <div className="flex h-full flex-col bg-[var(--geex-surface)]">
          {/* The studio's identity block: logo tile, name, address, two plan
              tags. Reserved at its real height so the nav below does not shift
              up when the real one lands. */}
          <div className="flex items-center gap-2.5 px-6 py-5">
            <span className="skel skel-circle block h-10 w-10 shrink-0 rounded-xl" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5 leading-tight">
              <span className="skel skel-text block h-3.5 w-28" />
              <span className="skel skel-text block h-2 w-32" />
              <span className="mt-0.5 flex gap-1">
                <span className="skel block h-4 w-12 rounded-full" />
                <span className="skel block h-4 w-14 rounded-full" />
              </span>
            </span>
          </div>

          {/* TEN ROWS, because that is what the seeded studio actually shows —
              the fifteen sections minus the five in NO_SCREEN_YET, which are
              hidden from the sidebar rather than drawn empty. A placeholder
              longer than the real nav would shrink on arrival, which is the
              shift a skeleton exists to prevent. */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-4 py-6">
            {[28, 22, 20, 30, 26, 24, 18, 26, 22, 16].map((w, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                <span className="skel skel-circle block h-[18px] w-[18px] shrink-0" />
                <span className="skel skel-text block h-2.5" style={{ width: `${w * 4}px` }} />
              </div>
            ))}
          </nav>

          <div className="space-y-0.5 border-t border-[var(--geex-border)] p-4">
            {[24, 28].map((w, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                <span className="skel skel-circle block h-[18px] w-[18px] shrink-0" />
                <span className="skel skel-text block h-2.5" style={{ width: `${w * 4}px` }} />
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="lg:ps-72">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-[var(--geex-page)] px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              {/* THE REAL h1/p, CARRYING A BAR INSTEAD OF WORDS.
                  Reserving this box by hand meant restating the type scale —
                  text-xl over text-xs, 2xl from sm up — and it came out 14px
                  short, which showed as the whole content column jumping the
                  moment the shell landed. Measured, not guessed: the real
                  header is 88px and this one was 102px.
                  Borrowing the real elements' own classes makes the line boxes
                  fall out of the same scale at every breakpoint, so the height
                  is right by construction instead of by a number somebody
                  measured once and the next type change silently invalidates. */}
              <h1 className="truncate font-display text-xl font-800 sm:text-2xl" aria-hidden="true">
                <span className="skel skel-text inline-block h-[0.62em] w-40 align-middle sm:w-56" />
              </h1>
              <p className="truncate text-xs" aria-hidden="true">
                <span className="skel skel-text inline-block h-[0.72em] w-28 align-middle" />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="skel block h-9 w-16 rounded-full" />
            <span className="skel skel-circle block h-10 w-10" />
            <span className="skel skel-circle block h-10 w-10" />
            <span className="skel skel-circle block h-10 w-10" />
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-5 pb-8 sm:px-8">
          <ScreenSkeleton loadingLabel={word} />
        </main>
      </div>
    </div>
  );
}
