"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { canAccessSection } from "@/lib/sectionAccessConstants";

// A textarea with @mention support. Typing "@" opens a dropdown of users who
// have ACCESS to `sectionKey` (mentions are limited to people who can see the
// record). Controlled: parent holds { value, mentions } and gets both back via
// onChange(text, mentions). The server re-verifies access before notifying.
export default function MentionTextarea({ value, mentions = [], onChange, sectionKey, className, placeholder, rows = 2 }) {
  const [users, setUsers] = useState([]);
  const [access, setAccess] = useState({});
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const caretRef = useRef(0);
  const ref = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [uRes, aRes] = await Promise.all([
          fetch("/api/users", { cache: "no-store" }),
          fetch("/api/section-access", { cache: "no-store" }),
        ]);
        setUsers(uRes.ok ? await uRes.json() : []);
        setAccess(aRes.ok ? ((await aRes.json())?.access || {}) : {});
      } catch { /* ignore */ }
    })();
  }, []);

  const mentionable = useMemo(() => users.filter((u) => canAccessSection(u, sectionKey, access)), [users, access, sectionKey]);
  const nameOf = (id) => { const u = users.find((x) => x.id === id); return u ? (u.fullName || u.userId) : ""; };

  function handleInput(e) {
    const text = e.target.value;
    const pos = e.target.selectionStart || text.length;
    caretRef.current = pos;
    // Drop any mention whose "@name" no longer appears in the text.
    const pruned = mentions.filter((id) => { const n = nameOf(id); return n && text.includes(`@${n}`); });
    onChange(text, pruned);
    const m = text.slice(0, pos).match(/(?:^|\s)@([\p{L}\p{N} ]{0,30})$/u);
    if (m) { setQuery(m[1]); setOpen(true); } else setOpen(false);
  }

  function pick(u) {
    const name = u.fullName || u.userId;
    const pos = caretRef.current;
    const upto = value.slice(0, pos).replace(/@([\p{L}\p{N} ]{0,30})$/u, `@${name} `);
    const next = upto + value.slice(pos);
    onChange(next, [...new Set([...mentions, u.id])]);
    setOpen(false); setQuery("");
    setTimeout(() => ref.current?.focus(), 0);
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? mentionable.filter((u) => `${u.fullName || ""} ${u.userId || ""}`.toLowerCase().includes(q)) : mentionable;
    return base.slice(0, 6);
  }, [query, mentionable]);

  return (
    <div className="relative">
      <textarea
        ref={ref}
        rows={rows}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={handleInput}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <ul className="absolute bottom-full z-30 mb-1 max-h-52 w-64 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-white/15 dark:bg-[#20202c]">
          {matches.map((u) => (
            <li key={u.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(u)} className="block w-full rounded-md px-2 py-1.5 text-start text-sm text-slate-700 hover:bg-brand-500/10 dark:text-slate-200">
                <span className="font-600">{u.fullName || u.userId}</span>{u.fullName ? <span className="text-slate-400"> · {u.userId}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
