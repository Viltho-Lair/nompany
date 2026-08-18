import Link from "next/link";
import { Icon } from "@/components/studio2/icons";

// QUALITY → DOCUMENTS, full-screen: rendered OUTSIDE StudioFrame, so a document
// gets the whole viewport with no sidebar beside it. The same shape as the
// manual and the two live views, which is deliberate — they are the four
// screens in the studio you READ rather than work in, and they should not each
// invent their own way back.
//
// The way back goes to Quality rather than the studio home: the sidebar is gone
// while this is open, so without it the only route out of the section is the
// browser's own back button.
//
// Intentionally empty for now. The route, the section grant and the way back
// all exist, so documents can be dropped into the <main> below without touching
// the studio chrome, the access model or the router again.
export default function StudioQualityDocuments({ studio }) {
  return (
    <div className="min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300">
      <header className="sticky top-0 z-20 border-b border-[var(--geex-border)] bg-[var(--geex-page)]">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-5 py-4 sm:px-8">
          <Link
            href={`/${studio.slug}/quality`}
            title="Back to Quality"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
          >
            <Icon name="arrowLeft" className="h-[18px] w-[18px] rtl:-scale-x-100" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white sm:text-2xl">
              Documents
            </h1>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">{studio.name} · Quality</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-10 sm:px-8">
        <div className="rounded-geex border border-slate-200/70 bg-white p-10 text-center dark:border-white/10 dark:bg-[#20202c]">
          <p className="font-display text-base font-700 text-slate-900 dark:text-white">Nothing here yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            The studio's quality documents will live on this page.
          </p>
        </div>
      </main>
    </div>
  );
}
