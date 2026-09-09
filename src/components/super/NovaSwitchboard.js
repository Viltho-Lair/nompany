"use client";

import { useCallback, useState } from "react";
import { Card, CardHead, CardBody, Badge } from "@/app/super/_components/ui";
import { capabilitiesByDepartment, capabilityEnabled } from "@/lib/nova/capabilities";
import { useReload } from "@/components/studio2/useReload";
import { NOVA_PROVIDERS, providerMeta } from "@/lib/nova/providers";

// The switchboard reads the STRUCTURE from the shared registry (client-safe) and
// only the stored on/off overrides from the server, so the console and Nova's
// tool builder can never disagree about what a capability is. A toggle writes
// the whole `enabled` map back — one small object — and the row shows the
// built-in default when nothing has been set, so "on by default" is legible
// before anyone touches it.
export default function NovaSwitchboard() {
  const [config, setConfig] = useState(null);   // { enabled: {key: bool}, provider, model, keySet }
  const [keyInput, setKeyInput] = useState("");
  const [credBusy, setCredBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/super/nova-config", { cache: "no-store" });
    if (!res.ok) { setError("Couldn't load the switchboard."); setConfig({ enabled: {} }); return; }
    setConfig((await res.json()).config || { enabled: {} });
  }, []);
  useReload(load);

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

  // SENDS ONLY THE CREDENTIAL FIELDS. `enabled` is deliberately absent so the
  // switchboard's toggles are left exactly as stored — see saveNovaConfig.
  async function saveCredential(explicit) {
    setCredBusy(true); setError("");
    const apiKey = explicit !== undefined ? explicit : keyInput.trim();
    const res = await fetch("/api/super/nova-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: config.provider,
        model: config.model,
        // An untouched field must not clear a stored key, so it is only sent
        // when there is something to send — or when Remove passed "" on purpose.
        ...(apiKey || explicit !== undefined ? { apiKey } : {}),
      }),
    });
    setCredBusy(false);
    if (!res.ok) { setError("Couldn't save the key."); return; }
    setKeyInput("");
    setConfig((await res.json()).config || config);
  }

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

      {/* THE PLATFORM'S AI CREDENTIAL, and it lives here because it is the
          platform's. It used to sit in /account, where every member of every
          studio was shown a field asking for an Anthropic or OpenAI key —
          a developer credential put in front of people who mostly have no such
          key, no way to get one without a card, and no reason to know what a
          model id is. Nova's availability was a property of the reader rather
          than of the plan.

          THE KEY IS WRITE-ONLY FROM HERE. The GET hands back `keySet` and the
          model and never the key itself, so this form can say whether one is
          stored and cannot show it. Saving an empty field clears it; not
          touching the field leaves it alone, which is what lets the switchboard
          below save its toggles without wiping the credential. */}
      {config !== null && (
        <Card className="mb-6">
          <CardBody>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-600">AI key</h3>
              <span className={`text-xs ${config.keySet ? "text-[var(--ad-muted-foreground)]" : "text-[var(--ad-destructive)]"}`}>
                {config.keySet ? "A key is stored." : "Not set."}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--ad-muted-foreground)]">Provider</span>
                <select
                  value={config.provider || "anthropic"}
                  onChange={(e) => setConfig({ ...config, provider: e.target.value, model: providerMeta(e.target.value).defaultModel })}
                  className="w-full rounded-lg border border-[var(--ad-border)] bg-transparent px-3 py-2 text-sm"
                >
                  {NOVA_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </label>

              {/* THE MODEL IS A FIELD, NOT A LIST. Providers ship new model ids
                  between our releases, and a hard-coded dropdown is a list that
                  goes stale the week after it is written — it would make
                  reaching a new model a deploy. It is pre-filled with the
                  provider's default so it is never empty. */}
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--ad-muted-foreground)]">Model</span>
                <input
                  value={config.model || ""}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder={providerMeta(config.provider).defaultModel}
                  className="w-full rounded-lg border border-[var(--ad-border)] bg-transparent px-3 py-2 font-mono text-sm"
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-[var(--ad-muted-foreground)]">
                API key {config.keySet && <span>— leave blank to keep the stored one</span>}
              </span>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={providerMeta(config.provider).keyHint}
                autoComplete="off"
                className="w-full rounded-lg border border-[var(--ad-border)] bg-transparent px-3 py-2 font-mono text-sm"
              />
            </label>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={saveCredential} disabled={credBusy}
                className="rounded-lg bg-[var(--ad-primary)] px-3 py-1.5 text-sm font-500 text-white disabled:opacity-50">
                {credBusy ? "Saving…" : "Save"}
              </button>
              {config.keySet && (
                <button type="button" onClick={() => saveCredential("")} disabled={credBusy}
                  className="rounded-lg px-3 py-1.5 text-sm text-[var(--ad-destructive)]">
                  Remove key
                </button>
              )}
              <span className="text-xs text-[var(--ad-muted-foreground)]">
                Get one at {providerMeta(config.provider).docs}. Stored encrypted and never shown again.
              </span>
            </div>
          </CardBody>
        </Card>
      )}

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
