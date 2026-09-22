"use client";

// PROMOTIONS (22/09/2026) — Point of Sale's sixth screen: what takes money off
// a sale at the till, and when. `docs/functionality/promotions.md` is the file.
//
// THE OFFER'S OWN WORDS ARE THE STUDIO'S. A name and a description print as
// they were typed, here and on the receipt; only the product's own labels come
// from the dictionary.

import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { posPromotionsDict } from "@/shared/studio/posPromotions";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, fmtDate } from "@/components/studio2/ui";

const td = "py-2.5 pe-3 align-middle";

export default function StudioPosPromotions({ slug }) {
  const locale = useStudioLocale();
  const tr = posPromotionsDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/pos/promotions`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, [slug]);

  useEffect(() => {
    let current = true;
    (async () => { if (current) await load(); })();
    return () => { current = false; };
  }, [load]);
  // The offers are written under their own section key.
  useLiveUpdates(slug, "pos-promotions", load);

  if (error === "forbidden" && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{tr.refused}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const rows = data.promotions || [];
  return (
    <div className="space-y-5">
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <section className={panel}>
        <h2 className="font-display text-lg font-700 text-[var(--geex-ink)]">{tr.title}</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>

        {rows.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-display font-700 text-[var(--geex-ink)]">{tr.empty}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{tr.emptyLead}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 dark:border-white/5">
                    <td className={`${td} font-mono`}>{p.code}</td>
                    <td className={td}>{locale === "ar" && p.nameAr ? p.nameAr : p.name}</td>
                    <td className={`${td} text-slate-500 dark:text-slate-400`}>{tr.status(p.status)}</td>
                    <td className={`${td} text-slate-500 dark:text-slate-400`}>{p.createdAt ? fmtDate(p.createdAt) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
