import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { LegalToc } from "./LegalToc";
import { Reveal } from "../../Reveal";

/* A LEGAL DOCUMENT ON THE SITE'S OWN CHROME (27/09/2026).
   ------------------------------------------------------------------
   Terms and Privacy wore the account layout's light editorial hero and moved
   into the (site) group, so this is their body in the site's design: a reading
   page. The measure is ~68ch, the leading generous, and the only motion is
   the title settling in once — a contract is read, not watched.

   A SERVER COMPONENT, like the LegalDocument it replaces. Every word of the
   documents is in the server HTML; the two client pieces (the reveal and the
   contents' "you are here" mark) wrap it and add nothing a crawler needs.

   THE BODY IS ENGLISH ON BOTH LOCALES and is marked so (`dir="ltr"
   lang="en"`): the English text is the authoritative one and is not
   translated (docs/functionality/legal-pages.md). The CHROME around it — the
   hero, the note, the contact card — is the reader's language and follows the
   page's direction. Before, an Arabic page set the English clauses right to
   left, which moves full stops and brackets to the wrong end of a line. */

function Paragraph({ block }) {
  return (
    <p className="text-[16px] leading-[1.75] text-white/70">
      {block.lead ? <strong className="font-medium text-[#ececf1]">{block.lead} </strong> : null}
      {block.text}
    </p>
  );
}

function Block({ block }) {
  if (block.type === "p") return <Paragraph block={block} />;
  if (block.type === "h3")
    return <h3 className="pt-4 text-[1.1rem] font-medium leading-snug tracking-[-0.015em] text-[#ececf1]">{block.text}</h3>;
  if (block.type === "ul")
    return (
      <ul className="space-y-3">
        {block.items.map((it, i) => (
          <li key={i} className="flex gap-3.5 text-[16px] leading-[1.75] text-white/70">
            <span aria-hidden="true" className="mt-[0.72em] size-1.5 shrink-0 rounded-full bg-[#8b7cff]" />
            <span className="min-w-0">{it}</span>
          </li>
        ))}
      </ul>
    );
  if (block.type === "table")
    return (
      // The table scrolls inside its own frame on a phone rather than
      // squeezing three columns of clause text into 340 pixels.
      <div className="overflow-x-auto rounded-2xl ring-1 ring-inset ring-white/[0.08]">
        <table className="w-full min-w-[34rem] border-collapse text-start text-[14px]">
          <thead>
            <tr className="bg-white/[0.03]">
              {block.head.map((h, i) => (
                <th key={i} scope="col" className="px-4 py-3 text-start text-[12px] font-medium uppercase tracking-[0.08em] text-white/55">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} className="align-top">
                {row.map((cell, ci) => (
                  <td key={ci} className={`border-t border-white/[0.06] px-4 py-3 leading-relaxed ${ci === 0 ? "text-white/85" : "text-white/65"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return null;
}

/**
 * @param meta      LegalMeta — version and dates, stamped under the title.
 * @param sections  LegalSection[] — the document body. Anchor ids are
 *                  PUBLISHED; they are used exactly as authored.
 * @param copy      dict.terms or dict.privacy — the two slices share a shape.
 * @param crossLink { href, label } — the sibling document. The two cite each
 *                  other's clauses by number, so a reader of one needs the other.
 */
export function LegalPage({ meta, sections, copy, crossLink }) {
  const toc = sections.map((s) => ({ id: s.id, title: s.title }));
  const stamps = [
    [copy.versionLabel, meta.version],
    [copy.effectiveLabel, meta.effective],
    [copy.updatedLabel, meta.updated],
  ];

  return (
    <section className="px-6 pb-28 pt-36 md:px-10 md:pb-40 md:pt-44">
      <div className="mx-auto max-w-[1280px]">
        <Reveal as="header" variant="rise" className="max-w-[52rem]">
          <p className="inline-flex min-h-8 items-center rounded-full bg-white/[0.05] px-3.5 py-1.5 text-[13px] text-white/75 ring-1 ring-inset ring-white/10 backdrop-blur-md">
            {copy.eyebrow}
          </p>
          <h1 className="mt-7 text-balance text-[2.6rem] font-medium leading-[1.05] tracking-[-0.035em] md:text-[4rem] rtl:leading-[1.25] rtl:tracking-normal">
            {copy.title}
          </h1>
          <p className="mt-7 max-w-[56ch] text-[16px] leading-relaxed text-[#9d9dab] md:text-[17px]">{copy.lead}</p>
          <dl className="mt-9 flex flex-wrap gap-2">
            {stamps.map(([label, value]) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.035] px-3.5 py-1.5 text-[13px] ring-1 ring-inset ring-white/[0.08]"
              >
                <dt className="text-white/45">{label}</dt>
                <dd className="tabular-nums text-white/85" dir="ltr">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <div className="mt-16 border-t border-white/[0.07] pt-12 md:mt-20 md:pt-16 lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-16 xl:gap-24">
          {/* Contents: a sticky column on a wide screen, a folded list above
              the text on a narrow one. Two renderings of the same links, so
              each is labelled; only one is ever displayed. */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 max-h-[calc(100dvh-9rem)] overflow-y-auto pb-6 [scrollbar-width:thin]">
              <p className="mb-4 text-[13px] text-white/45">{copy.tocTitle}</p>
              <LegalToc items={toc} label={copy.tocTitle} />
            </div>
          </aside>

          <div className="min-w-0 max-w-[68ch]">
            <details className="group/toc mb-12 rounded-2xl bg-white/[0.025] ring-1 ring-inset ring-white/[0.07] lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 text-[14px] text-white/75 [&::-webkit-details-marker]:hidden">
                {copy.tocTitle}
                <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className="text-white/45 transition-transform duration-200 group-open/toc:rotate-180" />
              </summary>
              <div className="max-h-[60dvh] overflow-y-auto border-t border-white/[0.06] px-5 py-4">
                <LegalToc items={toc} label={copy.tocTitle} />
              </div>
            </details>

            <p className="rounded-2xl bg-[#8b7cff]/[0.06] p-5 text-[14px] leading-relaxed text-white/65 ring-1 ring-inset ring-[#8b7cff]/20 md:p-6">
              {copy.langNote}
              {crossLink ? (
                <>
                  {" "}
                  <Link
                    href={crossLink.href}
                    className="font-medium text-[#c9c2ff] underline decoration-[#8b7cff]/40 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
                  >
                    {crossLink.label}
                  </Link>
                </>
              ) : null}
            </p>

            <div dir="ltr" lang="en" className="mt-14">
              {sections.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  aria-labelledby={`${s.id}-title`}
                  className="scroll-mt-28 border-t border-white/[0.06] py-12 first:border-t-0 first:pt-0"
                >
                  <h2 id={`${s.id}-title`} className="text-[1.5rem] font-medium leading-tight tracking-[-0.025em] text-[#ececf1] md:text-[1.75rem]">
                    {s.title}
                  </h2>
                  <div className="mt-6 space-y-5">
                    {s.blocks.map((b, i) => (
                      <Block key={i} block={b} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-6 rounded-3xl bg-white/[0.025] p-7 ring-1 ring-inset ring-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-9">
              <h2 className="text-[1.35rem] font-medium tracking-[-0.025em] rtl:tracking-normal">{copy.contactTitle}</h2>
              <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-[#9a9aa8]">{copy.contactLead}</p>
              <a
                href="mailto:info@nompany.com"
                dir="ltr"
                className="mt-6 inline-flex h-10 items-center rounded-full bg-white/[0.05] px-4 text-[14px] font-medium text-[#ececf1] ring-1 ring-inset ring-white/10 transition-colors duration-200 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7cff]"
              >
                info@nompany.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
