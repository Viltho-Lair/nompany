"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { DOC_SECTIONS } from "@/lib/documentation";
import { canManageSection } from "@/lib/sectionAccessConstants";

// Render **bold** spans inside a plain string.
function RichText({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-700 text-slate-900 dark:text-white">{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export default function DocumentationGuide() {
  const [images, setImages] = useState([]);
  const [canManageDocs, setCanManageDocs] = useState(false);
  const [activeSection, setActiveSection] = useState(DOC_SECTIONS[0]?.key || "");
  const contentRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [imgRes, meRes, accRes] = await Promise.all([
          fetch("/api/docImages", { cache: "no-store" }),
          fetch("/api/users/me", { cache: "no-store" }),
          fetch("/api/section-access", { cache: "no-store" }),
        ]);
        setImages(imgRes.ok ? await imgRes.json() : []);
        const me = meRes.ok ? (await meRes.json())?.user : null;
        const acc = accRes.ok ? (await accRes.json())?.access : {};
        setCanManageDocs(canManageSection(me, "documentation-settings", acc || {}));
      } catch { /* non-fatal */ }
    })();
  }, []);

  const imagesBySlot = useMemo(() => {
    const map = {};
    for (const img of images) {
      if (!img.slot) continue;
      (map[img.slot] ||= []).push(img);
    }
    return map;
  }, [images]);

  // Highlight the section whose heading is nearest the top as the user scrolls
  // (the page scrolls on the window, so we listen there).
  const onScroll = useCallback(() => {
    const headings = document.querySelectorAll("[data-section]");
    let current = DOC_SECTIONS[0]?.key || "";
    for (const h of headings) {
      if (h.getBoundingClientRect().top <= 140) current = h.getAttribute("data-section");
    }
    setActiveSection(current);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const goTo = (key) => {
    const el = document.getElementById(`doc-${key}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(key);
  };

  return (
    <div className="lg:flex lg:gap-8">
      {/* Left rail — section index (Postman-style). */}
      <aside className="mb-6 lg:mb-0 lg:w-56 lg:shrink-0">
        <div className="lg:sticky lg:top-24">
          <p className="mb-2 px-2 text-[11px] font-700 uppercase tracking-wider text-slate-400 dark:text-slate-500">Departments</p>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {DOC_SECTIONS.map((s) => {
              const active = s.key === activeSection;
              return (
                <button
                  key={s.key}
                  onClick={() => goTo(s.key)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm font-500 transition-colors ${
                    active
                      ? "bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon name={s.icon} className={`h-[18px] w-[18px] ${active ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"}`} />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div ref={contentRef} className="min-w-0 flex-1">
        {DOC_SECTIONS.map((section) => (
          <section key={section.key} id={`doc-${section.key}`} data-section={section.key} className="mb-12 scroll-mt-24">
            <div className="mb-5 border-b border-slate-200/70 pb-4 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                  <Icon name={section.icon} className="h-5 w-5" />
                </span>
                <h2 className="font-display text-2xl font-800 text-slate-900 dark:text-white">{section.label}</h2>
              </div>
              {section.intro && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{section.intro}</p>}
            </div>

            <div className="space-y-6">
              {section.articles.map((article) => (
                <article key={article.key} className="rounded-geex border border-slate-200/70 bg-white p-6 shadow-geex-sm dark:border-white/10 dark:bg-[#20202c]">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg font-700 text-slate-900 dark:text-white">{article.title}</h3>
                    {article.location && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{article.location}</span>
                    )}
                  </div>
                  <div className="space-y-4">
                    {article.body.map((block, i) => (
                      <Block key={i} block={block} images={imagesBySlot[block.slot] || []} canManageDocs={canManageDocs} />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Block({ block, images, canManageDocs }) {
  if (block.type === "p") {
    return <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300"><RichText text={block.text} /></p>;
  }
  if (block.type === "steps") {
    return (
      <ol className="space-y-2.5">
        {block.items.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-700 text-white">{i + 1}</span>
            <span><RichText text={item} /></span>
          </li>
        ))}
      </ol>
    );
  }
  if (block.type === "h") {
    return <h4 className="pt-2 font-display text-sm font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{block.text}</h4>;
  }
  if (block.type === "table") {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
              {block.headers.map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-start font-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r} className="border-b border-slate-50 last:border-0 align-top dark:border-white/5">
                {row.map((cell, c) => (
                  <td key={c} className={`px-4 py-2.5 ${c === 0 ? "font-600 text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>
                    <RichText text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "note") {
    return (
      <div className="flex gap-2.5 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3.5 text-sm text-slate-600 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-slate-300">
        <Icon name="bell" className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
        <span><RichText text={block.text} /></span>
      </div>
    );
  }
  if (block.type === "fields") {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-[#191921] dark:text-slate-500">
              <th className="px-4 py-2.5 text-start font-600">Field</th>
              <th className="px-4 py-2.5 text-center font-600">Required</th>
              <th className="px-4 py-2.5 text-center font-600">Automatic</th>
              <th className="px-4 py-2.5 text-start font-600">Notes</th>
            </tr>
          </thead>
          <tbody>
            {block.items.map((f, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0 dark:border-white/5">
                <td className="px-4 py-2.5 font-600 text-slate-700 dark:text-slate-200">{f.name}</td>
                <td className="px-4 py-2.5 text-center">{f.required ? <span className="text-red-500">●</span> : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                <td className="px-4 py-2.5 text-center">{f.auto ? <span className="text-emerald-500">●</span> : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{f.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "image") {
    if (images.length > 0) {
      return (
        <div className="space-y-3">
          {images.map((img) => (
            <figure key={img.id} className="overflow-hidden rounded-xl border border-slate-200/70 bg-slate-50 dark:border-white/10 dark:bg-[#191921]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.description || block.label} className="w-full object-contain" />
              {(img.description || block.label) && (
                <figcaption className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">{img.description || block.label}</figcaption>
              )}
            </figure>
          ))}
        </div>
      );
    }
    // Empty slot: prompt managers, quietly skip for everyone else.
    if (!canManageDocs) return null;
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-3.5 text-xs text-slate-400 dark:border-white/15 dark:bg-white/5 dark:text-slate-500">
        <Icon name="gallery" className="h-4 w-4 shrink-0" />
        <span>Screenshot slot: <span className="font-600 text-slate-500 dark:text-slate-400">{block.label}</span> — add an image in Documentation → Settings (location <code className="rounded bg-slate-200/70 px-1 py-0.5 text-[11px] dark:bg-white/10">{block.slot}</code>).</span>
      </div>
    );
  }
  return null;
}
