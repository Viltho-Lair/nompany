import Link from "next/link";
import { miscDict } from "@/shared/studio/misc";
import { Icon } from "@/components/studio2/icons";

// The studio manual, full-screen: rendered OUTSIDE StudioFrame, so there is no
// sidebar or panel header competing with it. Reached from the Documentation
// link above "My account" in the studio sidebar.
//
// Intentionally empty for now — the shell, the route and the way back exist so
// articles can be dropped in without touching the studio chrome again.
export default function StudioDocs({ studio, locale = "en" }) {
  const tr = miscDict(locale);
  return (
    <div className="min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300">
      <header className="sticky top-0 z-20 border-b border-[var(--geex-border)] bg-[var(--geex-page)]">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-5 py-4 sm:px-8">
          <Link
            href={`/${studio.slug}`}
            title={tr.backStudio}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
          >
            <Icon name="arrowLeft" className="h-[18px] w-[18px] rtl:-scale-x-100" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white sm:text-2xl">
              {tr.documentation}
            </h1>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">{studio.name}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-10 sm:px-8">
        <div className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-10 text-center dark:border-white/10">
          <p className="font-display text-base font-700 text-slate-900 dark:text-white">{tr.nothingHereYet}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            {tr.manualWillLive}
          </p>
        </div>
      </main>
    </div>
  );
}
