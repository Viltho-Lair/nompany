"use client";

import { useCallback, useState } from "react";
import { Card, CardBody } from "@/app/super/_components/ui";
import SelectMenu from "@/components/fields/SelectMenu";
import { useReload } from "@/components/studio2/useReload";
import { NOVA_PROVIDERS, providerMeta } from "@/lib/nova/providers";

/* THE PLATFORM'S AI CREDENTIAL, on its own so two screens can show it.
   ------------------------------------------------------------------
   It used to sit in /account, where every member of every studio was shown a
   field asking for an Anthropic or OpenAI key — a developer credential put in
   front of people who mostly have no such key, no way to get one without a card,
   and no reason to know what a model id is. Nova's availability was a property
   of the reader rather than of the plan.

   IT IS ONE KEY AND TWO PLACES TO SET IT, deliberately. Nova's chat runs on it
   and Broadcast's automated messages run on it, and somebody looking for it on
   either screen should find it rather than be sent to the other one — being sent
   to the other one is the exact bug this component exists to close. Extracted
   rather than copied: two forms writing one credential are two forms free to
   disagree about what "leave blank" means.

   THE KEY IS WRITE-ONLY FROM HERE. The GET hands back `keySet` and the model and
   never the key itself, so this form can say whether one is stored and cannot
   show it. Saving an empty field CLEARS it; not touching the field leaves it
   alone — which is what lets the switchboard beside it save its capability
   toggles without wiping the credential, and this form save the credential
   without wiping the toggles. `saveNovaConfig` merges on absence for exactly
   that reason.

   It loads its own config rather than taking one as a prop, which costs the Nova
   page a second GET of a small document and buys both callers being able to drop
   it in with no wiring. */
export default function NovaCredentials({ note = "" }) {
  const [config, setConfig] = useState(null);
  const [keyInput, setKeyInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/super/nova-config", { cache: "no-store" });
    if (!res.ok) { setError("Couldn't load the key."); return; }
    setConfig((await res.json()).config || null);
  }, []);
  useReload(load);

  async function save(explicit) {
    if (!config) return;
    const apiKey = explicit !== undefined ? explicit : keyInput.trim();
    setBusy(true); setError("");
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
    setBusy(false);
    if (!res.ok) { setError("Couldn't save the key."); return; }
    setKeyInput("");
    setConfig((await res.json()).config || config);
  }

  if (!config) {
    return <Card><CardBody><p className="text-sm text-[var(--ad-muted-foreground)]">{error || "Loading…"}</p></CardBody></Card>;
  }

  const meta = providerMeta(config.provider);
  const box = "w-full rounded-lg border border-[var(--ad-border)] bg-transparent px-3 py-2 text-sm";

  return (
    <Card className="mb-6">
      <CardBody>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-600">AI key</h3>
          <span className={`text-xs ${config.keySet ? "text-[var(--ad-muted-foreground)]" : "text-[var(--ad-destructive)]"}`}>
            {config.keySet ? "A key is stored." : "Not set."}
          </span>
        </div>

        {note && <p className="mt-2 text-sm text-[var(--ad-muted-foreground)]">{note}</p>}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--ad-muted-foreground)]">Provider</span>
            {/* THE PRODUCT'S OWN DROPDOWN, not the browser's. A native <select>
                hands its open list to the operating system, which in dark mode
                paints near-white ink onto a white popup — see the header of
                SelectMenu. This one was native until it moved here, and the
                architectural guard missed it because the tag ended its line. */}
            <SelectMenu
              className={box}
              value={config.provider || "anthropic"}
              aria-label="Provider"
              onChange={(v) => setConfig({ ...config, provider: v, model: providerMeta(v).defaultModel })}
              options={NOVA_PROVIDERS.map((p) => ({ value: p.id, label: p.label }))}
            />
          </label>

          {/* THE MODEL IS A FIELD, NOT A LIST. Providers ship new model ids
              between our releases, and a hard-coded dropdown is a list that goes
              stale the week after it is written — it would make reaching a new
              model a deploy. It is pre-filled with the provider's default so it
              is never empty. */}
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--ad-muted-foreground)]">Model</span>
            <input
              value={config.model || ""}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder={meta.defaultModel}
              className={`${box} font-mono`}
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
            placeholder={meta.keyHint}
            autoComplete="off"
            className={`${box} font-mono`}
          />
        </label>

        {error && <p className="mt-3 text-sm text-[var(--ad-destructive)]">{error}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => save()} disabled={busy}
            className="rounded-lg bg-[var(--ad-primary)] px-3 py-1.5 text-sm font-500 text-white disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
          {config.keySet && (
            <button type="button" onClick={() => save("")} disabled={busy}
              className="rounded-lg px-3 py-1.5 text-sm text-[var(--ad-destructive)]">
              Remove key
            </button>
          )}
          <span className="text-xs text-[var(--ad-muted-foreground)]">
            Get one at {meta.docs}. Stored encrypted and never shown again.
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
