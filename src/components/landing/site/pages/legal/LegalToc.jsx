"use client";
import { useEffect, useState } from "react";

/**
 * The document's contents, with the section being read marked.
 *
 * EVERY LINK IS IN THE SERVER HTML; the observer only moves the mark. Where
 * IntersectionObserver never delivers, the list is simply unmarked and every
 * anchor still works.
 *
 * The titles are the ENGLISH legal text (the English version is authoritative,
 * docs/functionality/legal-pages.md), so each is isolated as an LTR run: on an
 * Arabic page the list keeps the page's alignment and "1. Introduction" still
 * reads with its number first.
 */
export function LegalToc({ items, label }) {
  const [active, setActive] = useState("");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const els = items.map((it) => document.getElementById(it.id)).filter(Boolean);
    if (!els.length) return undefined;
    const visible = new Set();
    // A band a little below the floating header: the section crossing it is
    // the one being read.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = items.find((it) => visible.has(it.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-18% 0px -70% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label={label}>
      <ul className="flex flex-col">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              aria-current={active === it.id ? "location" : undefined}
              className="block border-s border-white/[0.08] py-1.5 ps-4 text-[13px] leading-snug text-white/45 transition-colors duration-200 hover:text-white aria-[current=location]:border-[#8b7cff] aria-[current=location]:text-white focus-visible:outline-none focus-visible:text-white"
            >
              <span dir="ltr" lang="en">
                {it.title}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
