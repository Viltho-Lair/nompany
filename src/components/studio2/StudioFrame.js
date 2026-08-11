import Link from "next/link";

// Studio chrome for the restructured model: the studio's identity, its sections
// (each a real row with its own SectionID), and who you are INSIDE this studio.
// Every link stays on the tenant's own address, /<slug>/… — the internal route
// name is never exposed.
export default function StudioFrame({ studio, me, sections, activeKey, children }) {
  return (
    <div className="min-h-screen bg-[var(--geex-page)] text-slate-700 dark:text-slate-300">
      <header className="border-b border-slate-200/70 bg-white dark:border-white/10 dark:bg-[#20202c]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div>
            <h1 className="font-display text-lg font-800 text-slate-900 dark:text-white">{studio.name}</h1>
            <p className="font-mono text-xs text-slate-400">nompany.com/{studio.slug}</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              {me.alias || "Member"}
              <span className="ms-2 rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-600 text-brand-700 dark:text-brand-300">
                {me.role}
              </span>
            </span>
            <Link href="/en/account" className="rounded-full border border-slate-200 px-4 py-2 font-600 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5">
              My account
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 py-6 sm:px-8 lg:flex-row">
        <nav className="lg:w-56 lg:shrink-0">
          <ul className="flex flex-wrap gap-1 lg:flex-col">
            {sections.map((s) => {
              const isActive = s.key === activeKey;
              return (
                <li key={s.id}>
                  <Link
                    href={`/${studio.slug}/${s.key}`}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-500 transition-colors ${
                      isActive
                        ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                    }`}
                  >
                    {s.name}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={`/${studio.slug}/people`}
            className={`mt-3 block rounded-lg px-3 py-2.5 text-sm font-600 transition-colors ${
              activeKey === "people"
                ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400"
                : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5"
            }`}
          >
            {me.canAdminister ? "People & requests" : "People"}
          </Link>
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
