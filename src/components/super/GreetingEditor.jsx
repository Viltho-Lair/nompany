"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/app/super/_components/ui";
import { bandCss, defaultTheme, newMessage, BRAND_STOPS, MAX_MESSAGES, MAX_STOPS } from "@/shared/greeting";

/* THE BROADCAST REGISTER — a list of messages, one open at a time.
   ------------------------------------------------------------------
   IT WAS A PILE. Every message drew its whole editor at once — two radio pairs,
   three text fields, twelve colour pickers and a preview — so three messages was
   a column nobody could read, with no way to see at a glance what was actually
   being said. It is a register now, the shape the RFQ screen uses: a row per
   message showing its status and its words, opening into the editor when chosen.

   SENDING IS AN ACT, NOT A CHECKBOX. A message is a Draft until somebody
   broadcasts it, and broadcasting stamps the moment — which is what a reader's
   browser keys its dismissal on, so a re-send reaches even the people who closed
   the first version. Saving text does NOT send: somebody editing a live message
   is not re-announcing it on every keystroke.

   COLOURS PREVIEW LOCALLY, WORDS PREVIEW FROM THE SERVER. `bandCss` is the same
   pure function the studio paints with, so a colour picked here is the colour
   that ships. The WORDS of an automated message are the day's generation and
   this screen has no business computing them, so those come back from the same
   resolve a studio calls. */

const field = "w-full rounded-lg border border-[var(--ad-border)] bg-transparent px-3 py-2 text-sm";
const label = "mb-1 block text-xs text-[var(--ad-muted-foreground)]";

/** `2026-09-09T14:22:31.000Z` as `2026-09-09 14:22`. Deliberately not localised:
 *  the console has no studio whose locale to resolve, and resolving one is the
 *  whole job of `fmtDateTime`. An ISO stamp trimmed is unambiguous everywhere. */
const stamp = (iso) => String(iso || "").slice(0, 16).replace("T", " ");

function Band({ theme, greeting, quote, author }) {
  const css = bandCss(theme);
  return (
    <div
      className="greeting-band px-4 py-2.5"
      style={{ "--band-bg": css.background, "--band-border": css.border, "--band-glow": css.glow }}
    >
      <p className="truncate text-sm font-600">{greeting || <span className="opacity-50">Nothing written yet</span>}</p>
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
    <div>
      <span className={label}>{title}</span>
      <div className="flex flex-wrap items-center gap-2">
        {stops.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            <input
              type="color"
              value={c}
              onChange={(e) => onChange(stops.map((s, j) => (j === i ? e.target.value : s)))}
              className="h-8 w-10 cursor-pointer rounded border border-[var(--ad-border)] bg-transparent p-0.5"
              aria-label={`${title} ${i + 1}`}
            />
            {stops.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(stops.filter((_, j) => j !== i))}
                aria-label={`Remove ${title.toLowerCase()} ${i + 1}`}
                className="text-xs text-[var(--ad-muted-foreground)] hover:text-[var(--ad-destructive)]"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {stops.length < MAX_STOPS && (
          <button
            type="button"
            onClick={() => onChange([...stops, stops[stops.length - 1] || BRAND_STOPS[0]])}
            className="rounded-lg border border-[var(--ad-border)] px-2 py-1 text-xs"
          >
            + Colour
          </button>
        )}
      </div>
      {/* ONE COLOUR IS A SOLID, and saying so here is the difference between a
          person understanding the control and thinking a gradient is broken. */}
      <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">{hint}</p>
    </div>
  );
}

function Editor({ message, resolved, onChange }) {
  const ai = message.source === "ai";
  const custom = message.theme.mode === "custom";
  const set = (patch) => onChange({ ...message, ...patch });
  const setTheme = (patch) => onChange({ ...message, theme: { ...message.theme, ...patch } });

  return (
    <div className="border-t border-[var(--ad-border)] p-4">
      <div className="flex flex-wrap gap-4">
        {[
          { id: "ai", title: "Automated", hint: "The AI writes it fresh each day, on the key set above." },
          { id: "manual", title: "Written by you", hint: "Exactly these words, every day, until you change them." },
        ].map((s) => (
          <label key={s.id} className="flex max-w-xs cursor-pointer items-start gap-2.5">
            <input
              type="radio" name={`source-${message.id}`} checked={message.source === s.id}
              onChange={() => set({ source: s.id })} className="mt-1"
            />
            <span>
              <span className="block text-sm font-500">{s.title}</span>
              <span className="block text-xs text-[var(--ad-muted-foreground)]">{s.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {ai ? (
        <p className="mt-5 rounded-lg border border-dashed border-[var(--ad-border)] p-3 text-xs text-[var(--ad-muted-foreground)]">
          {resolved?.generated
            ? "Written by the AI for today. It changes on its own at midnight, server time."
            : "Nothing generated for today — this is the built-in fallback. That means no key is set, or the call didn't go through."}
        </p>
      ) : (
        <div className="mt-5 grid gap-3">
          <label className="block">
            <span className={label}>Greeting</span>
            <input value={message.greeting} maxLength={200} className={field}
              onChange={(e) => set({ greeting: e.target.value })}
              placeholder="Good morning. Here is your studio." />
          </label>
          <label className="block">
            <span className={label}>Quotation</span>
            <input value={message.quote} maxLength={300} className={field}
              onChange={(e) => set({ quote: e.target.value })}
              placeholder="Quality is not an act, it is a habit." />
          </label>
          <label className="block sm:max-w-xs">
            <span className={label}>Attributed to</span>
            <input value={message.author} maxLength={120} className={field}
              onChange={(e) => set({ author: e.target.value })} placeholder="Aristotle" />
          </label>
        </div>
      )}

      <div className="mt-6 border-t border-[var(--ad-border)] pt-4">
        <div className="flex flex-wrap gap-4">
          {[
            { id: "default", title: "House colours", hint: "The logo ramp — cyan, amber, red — tinted over the page." },
            { id: "custom", title: "Custom", hint: "Your own fill and border. One colour is a solid, several make a gradient." },
          ].map((m) => (
            <label key={m.id} className="flex max-w-xs cursor-pointer items-start gap-2.5">
              <input
                type="radio" name={`theme-${message.id}`} checked={message.theme.mode === m.id}
                onChange={() => setTheme({ mode: m.id })} className="mt-1"
              />
              <span>
                <span className="block text-sm font-500">{m.title}</span>
                <span className="block text-xs text-[var(--ad-muted-foreground)]">{m.hint}</span>
              </span>
            </label>
          ))}
        </div>

        {/* THE STOPS STAY VISIBLE ON "HOUSE COLOURS", dimmed rather than removed —
            somebody switching back should find what they picked still there, and a
            control that vanishes reads as one that was cleared. */}
        <div className={`mt-4 grid gap-4 sm:grid-cols-2 ${custom ? "" : "pointer-events-none opacity-50"}`}>
          <Stops
            title="Background" stops={message.theme.background}
            hint={message.theme.background.length === 1 ? "One colour: a solid fill." : `${message.theme.background.length} colours, left to right.`}
            onChange={(background) => setTheme({ background })}
          />
          <Stops
            title="Border" stops={message.theme.border}
            hint={message.theme.border.length === 1 ? "One colour: a plain 1px border." : `${message.theme.border.length} colours, left to right.`}
            onChange={(border) => setTheme({ border })}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ message, resolved, open, busy, onOpen, onChange, onSend, onWithdraw, onRemove }) {
  const sent = message.status === "Sent";
  // A SENT ROW SHOWS WHAT A STUDIO IS READING; a draft shows what it would say.
  // For an automated message those are different things — the draft holds no
  // words of its own — so both come from the same resolve the studio calls.
  const shown = message.source === "ai"
    ? { greeting: resolved?.greeting || "", quote: resolved?.quote || "", author: resolved?.author || "" }
    : { greeting: message.greeting, quote: message.quote, author: message.author };

  return (
    <Card className="mb-3">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <button
          type="button" onClick={onOpen} aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-start"
        >
          <span className="shrink-0 text-xs text-[var(--ad-muted-foreground)]">{open ? "▾" : "▸"}</span>
          <span className="min-w-0 flex-1"><Band theme={message.theme} {...shown} /></span>
        </button>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-500 ${
              sent
                ? "bg-[var(--ad-success)]/15 text-[var(--ad-success)]"
                : "bg-[var(--ad-border)] text-[var(--ad-muted-foreground)]"}`}
          >
            {sent ? "Sent" : "Draft"}
          </span>
          {sent && message.sentAt && (
            <span className="num text-xs text-[var(--ad-muted-foreground)]">{stamp(message.sentAt)}</span>
          )}
          <span className="text-xs text-[var(--ad-muted-foreground)]">
            {message.source === "ai" ? "Automated" : "Written"}
          </span>

          {/* RE-SENDING IS THE SAME ACT WITH A FRESH STAMP, which is what reaches
              the readers who already closed this message. */}
          <button type="button" onClick={onSend} disabled={busy}
            className="rounded-lg bg-[var(--ad-primary)] px-3 py-1.5 text-sm font-500 text-white disabled:opacity-50">
            {sent ? "Send again" : "Broadcast"}
          </button>
          {sent && (
            <button type="button" onClick={onWithdraw} disabled={busy}
              className="rounded-lg border border-[var(--ad-border)] px-3 py-1.5 text-sm disabled:opacity-50">
              Withdraw
            </button>
          )}
          <button type="button" onClick={onRemove} disabled={busy}
            className="rounded-lg px-2 py-1.5 text-sm text-[var(--ad-destructive)] disabled:opacity-50">
            Remove
          </button>
        </div>
      </div>

      {open && <Editor message={message} resolved={resolved} onChange={onChange} />}
    </Card>
  );
}

export default function GreetingEditor() {
  const [config, setConfig] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ai, setAi] = useState(null);
  const [openId, setOpenId] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function take(d) { setConfig(d.config); setPreview(d.preview); setAi(d.ai); }

  useEffect(() => {
    fetch("/api/super/greeting", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) take(d); else setError("Couldn't load the broadcasts."); })
      .catch(() => setError("Couldn't load the broadcasts."));
  }, []);

  /* EVERY ACT SAVES FIRST. Broadcast, Withdraw and Regenerate all read the
     STORED config on the server, so sending a message whose words are only on
     this screen would send the previous ones. One PUT, then the POST. */
  async function act(action, id) {
    setBusy(action + id); setError(""); setSaved(false);
    const put = await fetch("/api/super/greeting", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config),
    });
    if (!put.ok) { setBusy(""); setError("Couldn't save."); return; }
    const res = await fetch("/api/super/greeting", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id }),
    });
    setBusy("");
    if (!res.ok) { setError("That didn't go through."); return; }
    take(await res.json());
  }

  async function save() {
    setBusy("save"); setError(""); setSaved(false);
    const res = await fetch("/api/super/greeting", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config),
    });
    setBusy("");
    if (!res.ok) { setError("Couldn't save."); return; }
    take(await res.json());
    setSaved(true);
  }

  if (!config) {
    return <Card><CardBody><p className="text-sm text-[var(--ad-muted-foreground)]">{error || "Loading…"}</p></CardBody></Card>;
  }

  const messages = config.messages;
  const byId = Object.fromEntries((preview?.messages || []).map((m) => [m.id, m]));
  const dirty = () => setSaved(false);
  const update = (i, next) => { setConfig({ ...config, messages: messages.map((m, j) => (j === i ? next : m)) }); dirty(); };
  const remove = (i) => { setConfig({ ...config, messages: messages.filter((_, j) => j !== i) }); dirty(); };
  const add = () => {
    const m = newMessage(`m${Date.now().toString(36)}`);
    setConfig({ ...config, messages: [...messages, { ...m, theme: defaultTheme() }] });
    setOpenId(m.id);
    dirty();
  };

  const live = messages.filter((m) => m.status === "Sent").length;
  const automated = messages.some((m) => m.status === "Sent" && m.source === "ai");

  return (
    <>
      <Card className="mb-6">
        <CardBody>
          <p className="text-sm text-[var(--ad-muted-foreground)]">
            {live === 0
              ? "Nothing is being broadcast. A message reaches studios when you send it, not when you save it."
              : `${live} message${live === 1 ? "" : "s"} out there. Studios pick up a change within a minute.`}
            {" "}Closing one in a studio hides that message alone — anything sent afterwards still arrives,
            and sending again reaches the people who closed it.
          </p>

          {automated && (
            <p className="mt-3 text-sm">
              {ai?.keySet ? (
                <>Automated messages are written by <strong>{ai.provider}</strong>, <strong>{ai.model}</strong> — once a day, for every studio at once.</>
              ) : (
                <><strong>No AI key is set</strong>, so automated messages fall back to a built-in rotation of seven greetings. Add one above and they start writing themselves.</>
              )}
            </p>
          )}
        </CardBody>
      </Card>

      {error && <p className="mb-4 text-sm text-[var(--ad-destructive)]">{error}</p>}

      {messages.map((m, i) => (
        <Row
          key={m.id}
          message={m}
          resolved={byId[m.id]}
          open={openId === m.id}
          busy={!!busy}
          onOpen={() => setOpenId(openId === m.id ? "" : m.id)}
          onChange={(next) => update(i, next)}
          onSend={() => act("broadcast", m.id)}
          onWithdraw={() => act("withdraw", m.id)}
          onRemove={() => remove(i)}
        />
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={!!busy}
          className="rounded-lg border border-[var(--ad-border)] px-3 py-1.5 text-sm disabled:opacity-50">
          {busy === "save" ? "Saving…" : "Save drafts"}
        </button>
        {messages.length < MAX_MESSAGES && (
          <button type="button" onClick={add} disabled={!!busy}
            className="rounded-lg border border-[var(--ad-border)] px-3 py-1.5 text-sm disabled:opacity-50">
            New message
          </button>
        )}
        {automated && ai?.keySet && (
          /* THE WAY OUT OF TWO STATES A PERSON CANNOT OTHERWISE LEAVE: a key that
             was wrong when the day's first reader arrived (the failure is
             remembered until midnight), and a line nobody wants under the
             company's name. Waiting until tomorrow answers neither. */
          <button type="button" onClick={() => act("regenerate", "")} disabled={!!busy}
            className="rounded-lg border border-[var(--ad-border)] px-3 py-1.5 text-sm disabled:opacity-50">
            {busy === "regenerate" ? "Writing…" : "Regenerate today's"}
          </button>
        )}
        {saved && <span className="text-xs text-[var(--ad-muted-foreground)]">Saved. Nothing sent — use Broadcast.</span>}
      </div>
    </>
  );
}
