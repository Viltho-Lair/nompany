"use client";
/* ==================================================================
   TECHNIQUE 1b — Skeleton screen
   Deliberately mirrors DashboardAssembly's geometry 1:1 (same chrome,
   same rail width, same card grid). Because the boxes land where the
   real content lands, the hand-off reads as content *resolving* rather
   than one UI being swapped for another — that's what kills the
   perceived wait.

   The shimmer is a single translating element per block (transform
   only); no background-position animation, which would repaint.
================================================================== */
function Block({ className = "" }) {
    return (<div className={`relative overflow-hidden rounded-md bg-line-soft ${className}`}>
      <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent"/>
    </div>);
}
export function DashboardSkeleton() {
    return (<div className="relative w-full" aria-hidden="true">
      <div className="surface relative overflow-hidden rounded-2xl">
        {/* chrome */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-line-soft"/>
          <span className="h-2.5 w-2.5 rounded-full bg-line-soft"/>
          <span className="h-2.5 w-2.5 rounded-full bg-line-soft"/>
          <Block className="ml-3 h-6 flex-1"/>
          <Block className="h-6 w-6 rounded-full"/>
        </div>

        <div className="flex">
          {/* rail */}
          <div className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-line py-4 md:w-14">
            {Array.from({ length: 6 }).map((_, i) => (<Block key={i} className="h-7 w-7 rounded-lg"/>))}
          </div>

          {/* content */}
          <div className="min-w-0 flex-1 space-y-3 p-3 md:space-y-4 md:p-4">
            <div className="grid grid-cols-3 gap-2.5 md:gap-3">
              {Array.from({ length: 3 }).map((_, i) => (<div key={i} className="space-y-2 rounded-xl border border-line-soft bg-ink/50 p-2.5 md:p-3">
                  <Block className="h-2 w-12"/>
                  <Block className="h-4 w-16"/>
                </div>))}
            </div>

            <div className="grid gap-3 md:grid-cols-[1.55fr_1fr]">
              <div className="space-y-3 rounded-xl border border-line-soft bg-ink/50 p-3">
                <div className="flex justify-between">
                  <Block className="h-2 w-14"/>
                  <Block className="h-3 w-10 rounded-full"/>
                </div>
                <div className="flex h-20 items-end gap-1.5 md:h-24">
                  {Array.from({ length: 8 }).map((_, i) => (<Block key={i} className="flex-1"/>))}
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-line-soft bg-ink/50 p-3">
                <Block className="h-2 w-16"/>
                <div className="flex items-center gap-3">
                  <Block className="h-[62px] w-[62px] rounded-full"/>
                  <div className="space-y-2">
                    <Block className="h-4 w-12"/>
                    <Block className="h-2 w-16"/>
                  </div>
                </div>
                <Block className="h-9 w-full"/>
              </div>
            </div>

            <div className="space-y-2.5 rounded-xl border border-line-soft bg-ink/50 p-3">
              {Array.from({ length: 3 }).map((_, i) => (<div key={i} className="flex items-center gap-2.5">
                  <Block className="h-1.5 w-1.5 rounded-full"/>
                  <Block className="h-2 flex-1 max-w-40"/>
                  <Block className="ml-auto h-1.5 w-10 rounded-full"/>
                </div>))}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
