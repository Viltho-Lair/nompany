import Link from "next/link";
import { miscDict } from "@/shared/studio/misc";
import { manualDict } from "@/shared/studio/manual";
import { Icon } from "@/components/studio2/icons";

// The studio manual, full-screen: rendered OUTSIDE StudioFrame, so there is no
// sidebar or panel header competing with it. Reached from the Documentation
// link above "My account" in the studio sidebar.
//
// THE ARTICLES ARE PRODUCT COPY (`shared/studio/manual`), the same in every
// studio and shipped with the deploy — see that module's header for why this is
// not tenant content, and why it must move in the same commit as the behaviour
// it describes.
//
// A SERVER COMPONENT CANNOT READ THE LOCALE, so it arrives as a prop from
// page.js rather than through the client hook every other screen uses.
export default function StudioDocs({ studio, locale = "en" }) {
  const tr = miscDict(locale);
  const { contents, articles } = manualDict(locale);

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
        {/* NO EMPTY STATE. The manual always ships at least one article, so a
            branch for none would be unreachable — and the sentence it used to
            show ("the manual will live on this page") stopped being true the
            moment it did. */}
        {articles.map((article) => (
            <article key={article.key} className="space-y-8">
              <div>
                <h2 className="font-display text-2xl font-800 text-slate-900 dark:text-white sm:text-3xl">
                  {article.title}
                </h2>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {article.summary}
                </p>
              </div>

              {/* A contents list, because the article is long enough to want one
                  and the headings are the questions somebody arrives with. */}
              <nav aria-label={contents} className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
                <p className="text-xs font-700 uppercase tracking-wide text-slate-400 dark:text-slate-500">{contents}</p>
                <ol className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {article.sections.map((section, i) => (
                    <li key={section.id} className="flex gap-2 text-sm">
                      <span className="num shrink-0 text-slate-400 dark:text-slate-500">{i + 1}.</span>
                      <a href={`#${section.id}`} className="text-brand-600 hover:underline dark:text-brand-400">
                        {section.heading}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>

              <div className="space-y-8">
                {article.sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-24 rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-6 dark:border-white/10 sm:p-8"
                  >
                    <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{section.heading}</h3>
                    <div className="mt-4 space-y-4">
                      {section.blocks.map((block, i) => {
                        if (block.kind === "p") {
                          return (
                            <p key={i} className="max-w-2xl text-[15px] leading-relaxed">
                              {block.text}
                            </p>
                          );
                        }
                        if (block.kind === "steps") {
                          return (
                            <ol key={i} className="max-w-2xl space-y-2 text-[15px] leading-relaxed">
                              {block.items.map((item, j) => (
                                <li key={j} className="flex gap-3">
                                  <span className="num mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-700 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                                    {j + 1}
                                  </span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ol>
                          );
                        }
                        return (
                          <ul key={i} className="max-w-2xl space-y-2 text-[15px] leading-relaxed">
                            {block.items.map((item, j) => (
                              <li key={j} className="flex gap-3">
                                <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
          </article>
        ))}
      </main>
    </div>
  );
}
