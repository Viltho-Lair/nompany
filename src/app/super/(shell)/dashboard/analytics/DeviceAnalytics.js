"use client";

import { useEffect, useState } from "react";
import { BarList } from "../../../_components/charts";

// Device Analytics, on what visitors actually browse with.
//
// The split comes from the same per-day counters as everything else on this
// page — /api/track reduces the user-agent to one of three words at ingest —
// so it is cleared and mailed by the same new-year rollover.
const COLORS = { Desktop: "var(--ad-chart-1)", Mobile: "var(--ad-chart-2)", Tablet: "var(--ad-chart-3)" };

export default function DeviceAnalytics() {
  const [devices, setDevices] = useState(null);

  useEffect(() => {
    let live = true;
    fetch("/api/super/site-analytics?range=30d", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live) setDevices(d?.devices || []); })
      .catch(() => { if (live) setDevices([]); });
    return () => { live = false; };
  }, []);

  const rows = (devices || []).map((d) => ({ ...d, color: COLORS[d.label] }));
  const any = rows.some((d) => d.visits > 0);

  return (
    <>
      <BarList items={rows} />
      <div className="mt-7 grid grid-cols-3 gap-3 border-t pt-5 text-center" style={{ borderColor: "var(--ad-border)" }}>
        {rows.map((d) => (
          <div key={d.label}>
            <p className="text-base font-600" style={{ color: d.color }}>{d.value}%</p>
            <p className="mt-0.5 text-[11px] text-[var(--ad-muted-foreground)]">{d.label}</p>
          </div>
        ))}
      </div>
      {devices && !any && (
        <p className="mt-3 text-center text-xs text-[var(--ad-muted-foreground)]">
          No visits recorded in the last 30 days.
        </p>
      )}
    </>
  );
}
