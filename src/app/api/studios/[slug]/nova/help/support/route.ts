import { route } from "@/platform/http/route";
import { studioHasNova } from "@/lib/plans";
import { incrWithTTL } from "@/platform/db/store";
import { RL } from "@/platform/db/keys";
import { sendEmail } from "@/platform/notify/email";
import { notifySuper } from "@/platform/notify/notifications";
import { CONTACT } from "@/lib/site";
import { helpEntry } from "@/lib/nova/help/knowledge";
import { addHelpQuestion, updateHelpQuestion } from "@/lib/data/novaHelp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "NONE OF THESE — SEND IT TO SUPPORT." The last step of the help desk, when
// neither the tree nor the matcher found the answer.
//
// TWO COPIES, as the owner specified: one to support@ by email, one to /super →
// Nova → Questions, each naming who asked, from which studio, the question in
// their words, when, and what Nova offered before they gave up. The offered
// list is the part that makes a ticket actionable — it says what the knowledge
// base THOUGHT the question was, which is exactly what support needs in order
// to fix the entry rather than just answer the person.
//
// STORE, THEN SEND — the contact form's order and its reason: a stored question
// whose mail failed is recoverable from the console; a mailed question whose
// store failed has no record anywhere support can reply from. So a failed
// store is the only failure the person is told about.
const spec = { auth: "studio", body: true, name: "nova.help.support" } as const;

// A person with a real problem sends one, maybe two while rephrasing. Six an
// hour is somebody pasting into a box that emails a human.
const RATE_MAX = 6;
const RATE_WINDOW_SEC = 60 * 60;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const POST = route(spec, async (g) => {
  const { studio, collaborator, user, body } = g as typeof g & {
    studio: { id: string; slug?: string; name?: string };
    collaborator: { id: string; alias?: string; name?: string };
    user: { id: string; email?: string };
  };
  if (!(await studioHasNova(studio))) return { status: 403, body: { error: "nova-off" } };

  const b = (body || {}) as Record<string, unknown>;
  const question = typeof b.question === "string" ? b.question.trim().slice(0, 2000) : "";
  if (question.length < 3) return { status: 400, body: { error: "empty" } };

  if ((await incrWithTTL(RL.novaHelpAsk(user.id), RATE_WINDOW_SEC)) > RATE_MAX) {
    return { status: 429, body: { error: "rate-limited" }, headers: { "Retry-After": String(RATE_WINDOW_SEC) } };
  }

  // WHAT WAS OFFERED IS RESOLVED HERE, in English, from the ids — never taken
  // from the body as text. Support reads it as "Nova thought this meant…", and
  // a client-supplied string there could say anything.
  const offered = (Array.isArray(b.offered) ? b.offered : [])
    .map(String).slice(0, 6)
    .map((id) => helpEntry(id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .map((e) => ({ id: e.id, q: e.q.en }));
  const path = (Array.isArray(b.path) ? b.path : []).map(String).slice(0, 10);
  const view = typeof b.view === "string" ? b.view.slice(0, 80) : "";
  const locale = b.locale === "ar" ? "ar" : "en";
  const name = String(collaborator.alias || collaborator.name || user.email || "");

  let row;
  try {
    row = await addHelpQuestion({
      question,
      view,
      path,
      locale,
      offered,
      studio: { id: studio.id, slug: String(studio.slug || g.params.slug || ""), name: String(studio.name || "") },
      asker: { userId: user.id, collaboratorId: collaborator.id, name, email: String(user.email || "") },
    });
  } catch {
    return { status: 502, body: { error: "not-stored" } };
  }

  // THE CONSOLE'S BELL, so a question does not sit in a list nobody opens.
  await notifySuper({
    type: "nova.question",
    title: `Nova question from ${row.studio.name || row.studio.slug}`,
    body: question.slice(0, 160),
    href: "/super/nova/questions",
  });

  const when = new Date(row.askedAt).toUTCString();
  const lines: [string, string][] = [
    ["From", `${name} <${row.asker.email}>`],
    ["Studio", `${row.studio.name} (${row.studio.slug})`],
    ["Asked", when],
    ["Screen", view || "—"],
    ["Language", locale === "ar" ? "Arabic" : "English"],
  ];
  const offeredText = offered.length ? offered.map((o, i) => `${i + 1}. ${o.q}`).join("\n") : "Nothing — no match was found.";

  // THE ASKER IS THE REPLY-TO, never the From — the contact form's reason: sending
  // as them fails SPF/DKIM and lands in spam. Replying from the inbox reaches them
  // directly; replying from /super also records the answer and rings their bell.
  const mail = await sendEmail({
    to: CONTACT.support,
    replyTo: row.asker.email || undefined,
    subject: `Nova question: ${row.studio.name || row.studio.slug}`,
    text: [
      ...lines.map(([k, v]) => `${k}: ${v}`),
      "",
      "Question:",
      question,
      "",
      "Nova offered:",
      offeredText,
    ].join("\n"),
    html: [
      "<table>",
      ...lines.map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`),
      "</table>",
      `<p><strong>Question</strong></p><p style="white-space:pre-wrap">${esc(question)}</p>`,
      `<p><strong>Nova offered</strong></p><p style="white-space:pre-wrap">${esc(offeredText)}</p>`,
    ].join(""),
  });

  if (mail.ok) {
    await updateHelpQuestion(row.id, (r) => ({ ...r, emailed: true })).catch(() => {});
  }

  return { ok: true, id: row.id, emailed: Boolean(mail.ok) };
});
