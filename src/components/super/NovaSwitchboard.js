"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHead, CardBody, Badge } from "@/app/super/_components/ui";
import { capabilitiesByDepartment, capabilityEnabled } from "@/lib/nova/capabilities";

// The switchboard reads the STRUCTURE from the shared registry (client-safe) and
// only the stored on/off overrides from the server, so the console and Nova's
// tool builder can never disagree about what a capability is. A toggle writes
// the whole `enabled` map back — one small object — and the row shows the
// built-in default when nothing has been set, so "on by default" is legible
// before anyone touches it.
export default function NovaSwitchboard() {
  const [config, setConfig] = useState(null);   // { enabled: {key: bool} }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/super/nova-config", { cache: "no-store" });
    if (!res.ok) { setError("Couldn't load the switchboard."); setConfig({ enabled: {} }); return; }
    setConfig((await res.json()).config || { enabled: {} });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle(cap, on) {
    if (!config || busy) return;
    const enabled = { ...config.enabled, [cap.key]: on };
    setConfig({ enabled });   // optimistic — the switch answers instantly
    setBusy(true); setError("");
    const res = await fetch("/api/super/nova-config", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }),
    });
    setBusy(false);
    if (!res.ok) { setError("That didn't save — reloading."); load(); return; }
    setConfig((await res.json()).config || { enabled });
  }

  const groups = capabilitiesByDepartment();

  return (
    <>
      <Card className="mb-6">
        <CardBody>
          <p className="text-sm text-[var(--ad-muted-foreground)]">
            What the Nova assistant can do, across every studio whose package includes it.
            Turning a capability on makes it <em>offerable</em>; each still checks the asking
            person&apos;s own permission when it runs, so it never reaches someone who lacks the
            right. Read capabilities answer questions; action capabilities always confirm
            before they write.
          </p>
        </CardBody>
      </Card>

      {error && <p className="mb-4 text-sm text-[var(--ad-destructive)]">{error}</p>}

      {config === null ? (
        <Card><CardBody><p className="text-sm text-[var(--ad-muted-foreground)]">Loading…</p></CardBody></Card>
      ) : (
        groups.map((g) => (
          <Card key={g.department} className="mb-4">
            <CardHead title={g.department} sub={`${g.capabilities.length} capabilit${g.capabilities.length === 1 ? "y" : "ies"}`} />
            <CardBody full>
              <ul className="divide-y" style={{ borderColor: "var(--ad-border)" }}>
                {g.capabilities.map((cap) => {
                  const on = capabilityEnabled(config, cap);
                  const overridden = typeof config.enabled?.[cap.key] === "boolean";
                  return (
                    <li key={cap.key} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-500">{cap.label}</span>
                          <Badge tone={cap.kind === "action" ? "secondary" : "muted"}>{cap.kind}</Badge>
                          {cap.writes && <Badge tone="secondary">confirms before write</Badge>}
                          {!overridden && <span className="text-[11px] text-[var(--ad-muted-foreground)]">default {cap.defaultOn ? "on" : "off"}</span>}
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-[var(--ad-muted-foreground)]">
                          {cap.permissionKey || "membership only"}{cap.scope ? ` · ${cap.scope}` : ""}
                        </p>
                      </div>
                      <button
                        type="button" role="switch" aria-checked={on} aria-label={cap.label} disabled={busy}
                        onClick={() => toggle(cap, !on)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[var(--ad-primary)]" : "bg-[var(--ad-muted)]"} ${busy ? "opacity-60" : ""}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "start-[22px]" : "start-0.5"}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        ))
      )}
    </>
  );
}
