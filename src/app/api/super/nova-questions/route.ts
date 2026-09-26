import { route } from "@/platform/http/route";
import { sendEmail } from "@/platform/notify/email";
import { notifyCollaborators, NOTIFY } from "@/platform/notify/notifications";
import { CONTACT } from "@/lib/site";
import { HELP_ENTRIES, helpEntry } from "@/lib/nova/help/knowledge";
import { addHelpAlias, listHelpQuestions, updateHelpQuestion } from "@/lib/data/novaHelp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /super → NOVA → QUESTIONS. The console's copy of every question the help desk
// could not answer, and the three things support does with one:
//
//   reply  — the answer goes back to the person who asked, by email AND on
//            their studio's bell, so it reaches them wherever they look first.
//   teach  — "this wording means that answer": the question becomes a phrasing
//            of an existing entry, so the next person asking it the same way is
//            answered by Nova without a ticket. The loop that makes the help
//            desk better with use rather than only bigger with releases.
//   close  — answered elsewhere, or not a question.
//
// `?entries=1` returns the knowledge base's questions, in English, for the
// teach picker — asked for only when the picker opens, not on every load.
const spec = { auth: "super", name: "super/nova-questions" } as const;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const GET = route(spec, async (g) => {
  const url = new URL(g.request.url);
  if (url.searchParams.get("entries") === "1") {
    return { entries: HELP_ENTRIES.map((e) => ({ id: e.id, q: e.q.en, topic: e.topic })) };
  }
  return { questions: await listHelpQuestions() };
});

export const PATCH = route({ ...spec, body: true }, async (g) => {
  const admin = (g as { admin?: { id?: string; email?: string } }).admin || {};
  const by = String(admin.email || admin.id || "support");
  const b = (g.body || {}) as Record<string, unknown>;
  const id = String(b.id || "");
  const action = String(b.action || "");
  if (!id) return { status: 400, body: { error: "no-id" } };

  const existing = (await listHelpQuestions()).find((q) => q.id === id);
  if (!existing) return { status: 404, body: { error: "notfound" } };

  if (action === "close") {
    const q = await updateHelpQuestion(id, (r) => ({ ...r, status: "closed" }));
    return { ok: true, question: q };
  }

  if (action === "teach") {
    const entryId = String(b.entryId || "");
    if (!helpEntry(entryId)) return { status: 400, body: { error: "no-entry" } };
    // THE PHRASING IS THE ASKER'S OWN WORDS unless support tidies it — the
    // words somebody actually typed are the ones the next person will type.
    const phrase = typeof b.phrase === "string" && b.phrase.trim() ? b.phrase : existing.question;
    await addHelpAlias(entryId, phrase, by);
    const q = await updateHelpQuestion(id, (r) => ({ ...r, taughtEntryId: entryId }));
    return { ok: true, question: q };
  }

  if (action === "reply") {
    const reply = typeof b.reply === "string" ? b.reply.trim().slice(0, 5000) : "";
    if (!reply) return { status: 400, body: { error: "empty" } };

    const ar = existing.locale === "ar";
    const subject = ar ? "رد فريق الدعم على سؤالك في Nova" : "Support answered your Nova question";
    const intro = ar ? "سألت:" : "You asked:";
    const answer = ar ? "الرد:" : "Our answer:";
    const mail = existing.asker.email
      ? await sendEmail({
          to: existing.asker.email,
          replyTo: CONTACT.support,
          subject,
          text: [intro, existing.question, "", answer, reply].join("\n"),
          html: `<div dir="${ar ? "rtl" : "ltr"}"><p><strong>${esc(intro)}</strong></p><p style="white-space:pre-wrap">${esc(existing.question)}</p><p><strong>${esc(answer)}</strong></p><p style="white-space:pre-wrap">${esc(reply)}</p></div>`,
        })
      : { ok: false };

    // AND ON THEIR BELL, addressed to the COLLABORATOR (invariant 6) in the
    // studio they asked from. Best-effort, like every notification: the answer
    // is recorded and mailed either way.
    await notifyCollaborators(existing.studio.id, [existing.asker.collaboratorId], {
      type: NOTIFY.novaAnswered,
      title: ar ? "رد الدعم على سؤالك" : "Support answered your question",
      body: reply.slice(0, 240),
      href: "",
      tone: "success",
    });

    const q = await updateHelpQuestion(id, (r) => ({
      ...r,
      status: "answered",
      reply,
      repliedAt: new Date().toISOString(),
      repliedBy: by,
    }));
    return { ok: true, question: q, emailed: Boolean(mail.ok) };
  }

  return { status: 400, body: { error: "unknown-action" } };
});
