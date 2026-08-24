"use client";

import { useState } from "react";
import { Card, CardHead, CardBody, Button, Badge, Icon } from "@/app/super/_components/ui";

// THE EXPORT CONTROLS — the one place this section DOES something rather than just
// describing the plan. Two paths, matching the two decisions the export offers:
//
//   • Full database — every studio, the platform registries, and user records in
//     one .sql. Behind a deliberate acknowledgement, because the file packages
//     every tenant's data (encrypted id/passport blobs and salaries included).
//   • One studio — fast and bounded, always well within a function's time limit.
//
// A download is just a navigation to the route: the response is an attachment, so
// the browser saves it and this page stays put. No fetch/blob dance needed.
export default function MigrationExport({ studios = [] }) {
  const [ack, setAck] = useState(false);
  const [studioId, setStudioId] = useState("");

  const go = (url) => {
    // assign, not a new tab: the attachment download keeps the current document.
    window.location.assign(url);
  };

  return (
    <Card>
      <CardHead
        title="Export database"
        sub="Generate a self-contained SQL Server dump (schema + data, ids preserved verbatim) of the current Redis data."
        action={<Badge tone="info">read-only</Badge>}
      />
      <CardBody className="flex flex-col gap-6">
        {/* One studio — the safe, bounded default, so it comes first. */}
        <div className="flex flex-col gap-2">
          <label htmlFor="mig-studio" className="text-sm font-600 text-[var(--ad-foreground)]">
            A single studio
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="mig-studio"
              value={studioId}
              onChange={(e) => setStudioId(e.target.value)}
              className="min-w-56 rounded-geex border border-[var(--ad-border)] bg-[var(--ad-background)] px-3 py-2 text-sm text-[var(--ad-foreground)]"
            >
              <option value="">Choose a studio…</option>
              {studios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.slug || s.id}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              disabled={!studioId}
              onClick={() => go(`/api/super/migration/export?studio=${encodeURIComponent(studioId)}`)}
            >
              <Icon name="download" className="me-1.5 h-4 w-4" />
              Export studio
            </Button>
          </div>
        </div>

        {/* Full database — gated behind an explicit acknowledgement. */}
        <div className="flex flex-col gap-2 rounded-geex border border-[var(--ad-border)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-600 text-[var(--ad-foreground)]">The whole database</span>
            <Badge tone="warning">every tenant</Badge>
          </div>
          <p className="text-sm text-[var(--ad-muted-foreground)]">
            All studios, platform registries and user records in one file — including encrypted ID/passport blobs,
            salaries and password hashes. A full production scan; it can take a while.
          </p>
          <label className="mt-1 flex items-start gap-2 text-sm text-[var(--ad-muted-foreground)]">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--ad-primary)]"
            />
            <span>I understand this downloads every tenant&apos;s data.</span>
          </label>
          <div>
            <Button
              variant="primary"
              disabled={!ack}
              onClick={() => go("/api/super/migration/export")}
            >
              <Icon name="download" className="me-1.5 h-4 w-4" />
              Export full database (.sql)
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
