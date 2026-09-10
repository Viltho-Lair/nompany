"use client";

import { useEffect, useState } from "react";
import NovaCredentials from "@/components/super/NovaCredentials";
import { bandCss, defaultTheme, newMessage, BRAND_STOPS, DAYPARTS, MAX_MESSAGES, MAX_STOPS } from "@/shared/greeting";

/* THE BROADCAST REGISTER — a list on the left, one message on the right.
   ------------------------------------------------------------------
   IT WAS A PILE. Every message drew its whole editor at once — two radio pairs,
   three fields, twelve colour pickers and a preview — so three messages was a
   column nobody could read, with no way to see at a glance what was being said.
   The list scrolls; the detail does not move; the container never grows a page
   scrollbar, because the wall it slides out of is exactly one screen tall.

   A MESSAGE IS LISTED BY A TITLE ITS AUTHOR TYPES, never by its words. An
   automated message HAS no words of its own — they are generated, three times a
   day — so listing by text would give a register that rewrites itself at noon.

   NOTHING HERE IS INVENTED. There is no built-in greeting behind an automated
   message any more: what a studio reads comes from the AI key and nothing else,
   and when there is no key the honest display is an empty band and a row that
   says "Not generated". The three dayparts are shown separately for exactly that
   reason — one of them failing is invisible if you only ever see your own hour.

   COLOURS PREVIEW LOCALLY, WORDS COME FROM THE SERVER. `bandCss` is the same
   pure function the studio paints with, so a colour picked here is the colour
   that ships. The words are the day's generation and this screen has no business
   computing them. */

const box = "w-full rounded-lg border border-[var(--ad-border)] bg-transparent px-3 py-2 text-sm";
const lab = "mb-1 block text-xs text-[var(--ad-muted-foreground)]";
const btn = "rounded-lg border border-[var(--ad-border)] px-3 py-1.5 text-sm disabled:opacity-50";

/** An ISO stamp as `2026-09-09 17:41`. Deliberately not localised: the console
 *  has no studio whose locale to resolve, and resolving one is `fmtDateTime`'s
 *  whole job. A trimmed ISO stamp reads the same in every language. */
const stamp = (iso) => String(iso || "").slice(0, 16).replace("T", " ");

function Band({ theme, greeting, quote, author }) {
  const css = bandCss(theme);
  return (
    <div
      className="greeting-band px-4 py-2.5"
      // The preview wears the ink the studio will, or a pale custom fill would
      // show the console theme's white text in dark mode — the owner's screenshot.
      style={{ "--band-bg": css.background, "--band-border": css.border, "--band-glow": css.glow, color: css.ink || undefined }}
    >
      <p className="truncate text-sm font-600">{greeting || <span className="opacity-50">Nothing to show</span>}</p>
      {quote && (
        <blockquote className="mt-0.5 truncate text-xs opacity-80">
          “{quote}”{author && <cite className="ms-1.5 not-italic opacity-70">— {author}</cite>}
        </blockquote>
      )}
    </div>
  );
}

function Stops({ title, hint, stops, onChange }) {
  return (
    <div className="mt-4">
      <span className={lab}>{title}</span>
      <div className="flex flex-wrap items-center gap-2">
        {stops.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            <input
              type="color" value={c} aria-label={`${title} ${i + 1}`}
              onChange={(e) => onChange(stops.map((s, j) => (j === i ? e.target.value : s)))}
              className="h-8 w-10 cursor-pointer rounded border border-[var(--ad-border)] bg-transparent p-0.5"
            />
            {stops.length > 1 && (
              <button
                type="button" onClick={() => onChange(stops.filter((_, j) => j !== i))}
                aria-label={`Remove ${title.toLowerCase()} ${i + 1}`}
                className="text-xs text-[var(--ad-muted-foreground)] hover:text-[var(--ad-destructive)]"
              >×</button>
            )}
          </span>
        ))}
        {stops.length < MAX_STOPS && (
          <button type="button" onClick={() => onChange([...stops, stops[stops.length - 1] || BRAND_STOPS[0]])}
            className="rounded-lg border border-[var(--ad-border)] px-2 py-1 text-xs">+ Colour</button>
        )}
      </div>
      <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">{hint}</p>
    </div>
  );
}

function Radio({ name, checked, onChange, title, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1" />
      <span>
        <span className="block text-sm font-500">{title}</span>
        <span className="block text-xs text-[var(--ad-muted-foreground)]">{hint}</span>
      </span>
    </label>
  );
}

function Detail({ message, generated, problems, keySet, busy, onChange, onSend, onWithdraw, onRemove }) {
  const ai = message.source === "ai";
  const custom = message.theme.mode === "custom";
  const sent = message.status === "Sent";
  const set = (patch) => onChange({ ...message, ...patch });
  const setTheme = (patch) => onChange({ ...message, theme: { ...message.theme, ...patch } });

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
        <span className={`text-sm font-600 ${sent ? "text-[var(--ad-success)]" : "text-[var(--ad-muted-foreground)]"}`}>
          {sent ? "Sent" : "Draft"}
        </span>
        {sent && message.sentAt && <span className="num text-sm text-[var(--ad-muted-foreground)]">{stamp(message.sentAt)}</span>}
        <span className="me-2 text-sm text-[var(--ad-muted-foreground)]">{ai ? "Automated" : "Written"}</span>
        {/* RE-SENDING IS THE SAME ACT WITH A FRESH STAMP, which is what reaches
            the readers who already closed this message. */}
        <button type="button" onClick={onSend} disabled={busy}
          className="rounded-lg bg-[var(--ad-primary)] px-3 py-1.5 text-sm font-500 text-white disabled:opacity-50">
          {sent ? "Send again" : "Broadcast"}
        </button>
        {sent && <button type="button" onClick={onWithdraw} disabled={busy} className={btn}>Withdraw</button>}
        <button type="button" onClick={onRemove} disabled={busy}
          className="rounded-lg px-2 py-1.5 text-sm text-[var(--ad-destructive)] disabled:opacity-50">Remove</button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Radio name={`src-${message.id}`} checked={ai} onChange={() => set({ source: "ai" })}
              title="Automated" hint="The AI writes it fresh each day, for each part of the day, on the key in Settings." />
            <Radio name={`src-${message.id}`} checked={!ai} onChange={() => set({ source: "manual" })}
              title="Written by you" hint="Exactly these words, every day, until you change them." />
          </div>

          <label className="mt-6 block sm:max-w-sm">
            <span className={lab}>Title — for this list only, never shown to a studio</span>
            <input value={message.title} maxLength={80} className={box}
              onChange={(e) => set({ title: e.target.value })} placeholder="Name this message" />
          </label>

          {/* THE FIELDS ARE THE WRITTEN MESSAGE'S. An automated one has no words
              to edit here — its text arrives from the key, three times a day —
              so the boxes are replaced by what was actually generated rather
              than left empty and editable, which would read as a bug. */}
          {ai ? (
            <div className="mt-6">
              <span className={lab}>What the key wrote for today</span>
              <div className="grid gap-2">
                {DAYPARTS.map((dp) => {
                  const g = generated?.[dp];
                  return (
                    <div key={dp} className="rounded-lg border border-[var(--ad-border)] p-3">
                      <p className="text-xs uppercase tracking-wider text-[var(--ad-muted-foreground)]">{dp}</p>
                      {g ? (
                        <>
                          <p className="mt-1 text-sm font-500">{g.greeting}</p>
                          {g.quote && (
                            <blockquote className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">
                              “{g.quote}”{g.author && <cite className="ms-1.5 not-italic">— {g.author}</cite>}
                            </blockquote>
                          )}
                        </>
                      ) : (
                        /* IT SAYS WHICH, because "no key, or the call failed" is
                           two situations with two different fixes and the screen
                           already knows which one it is. When the provider gave a
                           reason, that reason is shown verbatim: "model not
                           found" and "invalid api key" are the same red box
                           otherwise, and only one of them is about the key. */
                        <div className="mt-1">
                          <p className="text-sm text-[var(--ad-destructive)]">
                            {!keySet
                              ? "No key is set — add one under Settings. Nothing shows in a studio until then."
                              : problems?.[`${message.id}:${dp}`]
                                ? "The call didn't go through. Nothing shows in a studio for this part of the day."
                                : "Not generated yet for this part of the day."}
                          </p>
                          {keySet && problems?.[`${message.id}:${dp}`] && (
                            <>
                              <p className="mt-1 break-words font-mono text-xs text-[var(--ad-muted-foreground)]">
                                {problems[`${message.id}:${dp}`]}
                              </p>
                              <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">
                                A failure is remembered until midnight so a broken key does not cost a call per
                                page view. Fix it, then press Regenerate today&apos;s.
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              <label className="block">
                <span className={lab}>Greeting</span>
                <input value={message.greeting} maxLength={200} className={box}
                  onChange={(e) => set({ greeting: e.target.value })} placeholder="The line studios read" />
              </label>
              <label className="block">
                <span className={lab}>Quotation</span>
                <input value={message.quote} maxLength={300} className={box}
                  onChange={(e) => set({ quote: e.target.value })} placeholder="Optional second line" />
              </label>
              <label className="block sm:max-w-xs">
                <span className={lab}>Attributed to</span>
                <input value={message.author} maxLength={120} className={box}
                  onChange={(e) => set({ author: e.target.value })} placeholder="Who said it" />
              </label>
            </div>
          )}
        </div>

        <div>
          <div className="grid gap-6">
            <Radio name={`thm-${message.id}`} checked={!custom} onChange={() => setTheme({ mode: "default" })}
              title="House colours" hint="The logo ramp — cyan, amber, red — tinted over the page." />
            <Radio name={`thm-${message.id}`} checked={custom} onChange={() => setTheme({ mode: "custom" })}
              title="Custom" hint="Your own fill and border. One colour is a solid, several make a gradient." />
          </div>

          {/* THE STOPS STAY VISIBLE ON HOUSE COLOURS, dimmed rather than removed —
              somebody switching back should find what they picked still there,
              and a control that vanishes reads as one that was cleared. */}
          <div className={custom ? "" : "pointer-events-none opacity-50"}>
            <Stops title="Border" stops={message.theme.border}
              hint={message.theme.border.length === 1 ? "One colour: a plain 1px border." : `${message.theme.border.length} colours, left to right.`}
              onChange={(border) => setTheme({ border })} />
            <Stops title="Background" stops={message.theme.background}
              hint={message.theme.background.length === 1 ? "One colour: a solid fill." : `${message.theme.background.length} colours, left to right.`}
              onChange={(background) => setTheme({ background })} />
          </div>

          <div className="mt-6">
            <span className={lab}>Preview</span>
            <Band
              theme={message.theme}
              greeting={ai ? (generated?.morning?.greeting || "") : message.greeting}
              quote={ai ? (generated?.morning?.quote || "") : message.quote}
              author={ai ? (generated?.morning?.author || "") : message.author}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GreetingEditor() {
  const [config, setConfig] = useState(null);
  const [bands, setBands] = useState(null);
  const [problems, setProblems] = useState(null);
  const [ai, setAi] = useState(null);
  const [selected, setSelected] = useState("");
  const [settings, setSettings] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function take(d) { setConfig(d.config); setBands(d.bands); setProblems(d.problems); setAi(d.ai); }

  useEffect(() => {
    fetch("/api/super/greeting", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) { setError("Couldn't load the broadcasts."); return; }
        take(d);
        setSelected(d.config?.messages?.[0]?.id || "");
      })
      .catch(() => setError("Couldn't load the broadcasts."));
  }, []);

  async function put() {
    const res = await fetch("/api/super/greeting", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config),
    });
    return res.ok ? res.json() : null;
  }

  /* EVERY ACT SAVES FIRST. Broadcast, Withdraw and Regenerate all read the
     STORED config on the server, so sending a message whose words are only on
     this screen would send the previous ones. One PUT, then the POST. */
  async function act(action, id) {
    setBusy(action); setError(""); setSaved(false);
    if (!(await put())) { setBusy(""); setError("Couldn't save."); return; }
    const res = await fetch("/api/super/greeting", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id }),
    });
    setBusy("");
    if (!res.ok) { setError("That didn't go through."); return; }
    take(await res.json());
  }

  async function save() {
    setBusy("save"); setError(""); setSaved(false);
    const d = await put();
    setBusy("");
    if (!d) { setError("Couldn't save."); return; }
    take(d); setSaved(true);
  }

  if (!config) {
    return <p className="p-5 text-sm text-[var(--ad-muted-foreground)]">{error || "Loading…"}</p>;
  }

  const messages = config.messages;
  const dirty = () => setSaved(false);
  const current = messages.find((m) => m.id === selected) || messages[0];

  // WHAT THE KEY WROTE, per daypart, for the selected message — read out of the
  // three bands the server resolved rather than computed here.
  const generatedFor = (id) => Object.fromEntries(
    DAYPARTS.map((dp) => [dp, (bands?.[dp]?.messages || []).find((m) => m.id === id) || null]),
  );

  const update = (next) => {
    setConfig({ ...config, messages: messages.map((m) => (m.id === next.id ? next : m)) });
    dirty();
  };
  const remove = (id) => {
    setConfig({ ...config, messages: messages.filter((m) => m.id !== id) });
    if (selected === id) setSelected(messages.find((m) => m.id !== id)?.id || "");
    dirty();
  };
  const add = () => {
    const m = { ...newMessage(`m${Date.now().toString(36)}`), theme: defaultTheme() };
    setConfig({ ...config, messages: [...messages, m] });
    setSelected(m.id);
    setSettings(false);
    dirty();
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--ad-border)] px-4 py-3">
        <h1 className="font-display text-base font-800 tracking-tight">Broadcast</h1>
        {error && <span className="text-sm text-[var(--ad-destructive)]">{error}</span>}
        {saved && <span className="text-xs text-[var(--ad-muted-foreground)]">Saved. Nothing sent — use Broadcast.</span>}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {ai?.keySet && messages.some((m) => m.status === "Sent" && m.source === "ai") && (
            <button type="button" onClick={() => act("regenerate", "")} disabled={!!busy} className={btn}>
              {busy === "regenerate" ? "Writing…" : "Regenerate today's"}
            </button>
          )}
          <button type="button" onClick={() => setSettings(!settings)} disabled={!!busy}
            className={`${btn} ${settings ? "bg-[var(--ad-primary)] text-white" : ""}`}>Settings</button>
          <button type="button" onClick={save} disabled={!!busy} className={btn}>
            {busy === "save" ? "Saving…" : "Save Drafts"}
          </button>
          <button type="button" onClick={add} disabled={!!busy || messages.length >= MAX_MESSAGES} className={btn}>
            New Message
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* THE LIST SCROLLS, THE PANE DOES NOT. A register of twenty messages
            must not push the top bar off a screen-tall container. */}
        <aside className="w-64 shrink-0 overflow-y-auto border-e border-[var(--ad-border)]">
          {messages.map((m) => (
            <button
              key={m.id} type="button"
              onClick={() => { setSelected(m.id); setSettings(false); }}
              aria-current={!settings && current?.id === m.id ? "true" : undefined}
              className={`block w-full border-b border-[var(--ad-border)] px-4 py-3 text-start ${
                !settings && current?.id === m.id ? "bg-[var(--ad-primary)]/10" : "hover:bg-[var(--ad-border)]/40"}`}
            >
              <span className="block truncate text-sm font-600">
                {m.title || "Untitled"}{m.status === "Draft" && <span className="font-400 text-[var(--ad-muted-foreground)]"> — Draft</span>}
              </span>
              <span className="block truncate text-xs text-[var(--ad-muted-foreground)]">
                Created: {stamp(m.createdAt) || "—"}
              </span>
            </button>
          ))}
          {!messages.length && (
            <p className="p-4 text-sm text-[var(--ad-muted-foreground)]">No messages yet.</p>
          )}
        </aside>

        <section className="min-w-0 flex-1">
          {settings ? (
            <div className="h-full overflow-y-auto p-5">
              <p className="mb-4 max-w-2xl text-sm text-[var(--ad-muted-foreground)]">
                Automated messages are written with this key — once per part of the day, for the whole
                platform. There is no built-in text behind them: without a key, an automated message
                shows nothing at all. Nova&apos;s chat runs on the same key.
              </p>
              <div className="max-w-2xl"><NovaCredentials /></div>
            </div>
          ) : current ? (
            <Detail
              message={current}
              generated={generatedFor(current.id)}
              problems={problems}
              keySet={!!ai?.keySet}
              busy={!!busy}
              onChange={update}
              onSend={() => act("broadcast", current.id)}
              onWithdraw={() => act("withdraw", current.id)}
              onRemove={() => remove(current.id)}
            />
          ) : (
            <p className="p-5 text-sm text-[var(--ad-muted-foreground)]">Choose a message, or start a new one.</p>
          )}
        </section>
      </div>
    </div>
  );
}
