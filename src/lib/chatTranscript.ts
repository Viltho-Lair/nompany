"use client";

// THE ONLY RECORD A CHAT EVER LEAVES.
//
// Nothing about a conversation is stored — the room expires and is gone — so
// this is how either side keeps one: a PDF built in the browser, from the
// thread already on screen, and handed straight to the person who asked for it.
// It never touches the server, which is the point: a transcript exists because
// somebody chose to keep it, not because the platform did.
//
// jsPDF is imported dynamically so it stays out of the studio bundle until the
// first download — the widget is on every studio page and most sessions never
// press this.

import { NOMPANY, SUPPORT_LABEL } from "@/lib/chatConstants";

const MARGIN = 40;
// TUPLES, not arrays: jsPDF's setTextColor takes three numbers, and only a
// tuple type carries the length through a spread.
const INK: [number, number, number] = [24, 30, 44];
const BRAND: [number, number, number] = [70, 128, 255];

// The mark, as a data URI. Optional in every sense: a transcript without a logo
// is still a transcript, so every failure path here just returns null.
async function logoDataUrl() {
  try {
    const res = await fetch("/brand/logo-full.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const fmtStamp = (value) => {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? new Date(t).toLocaleString("en-GB") : "—";
};
const fmtClock = (value) => {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? new Date(t).toLocaleTimeString("en-GB") : "";
};
const safe = (s) => String(s || "").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/**
 * @param {object} chat
 * @param {string} chat.id           the Chat ID, printed so a transcript can be
 *                                   quoted back at either side
 * @param {string} chat.studioName
 * @param {string} [chat.studioSlug]
 * @param {string} chat.userName
 * @param {string} [chat.handledBy]  who answered, as this side is allowed to
 *                                   know it — the console prints the admin's
 *                                   address, the studio prints "nompany Support"
 * @param {Array}  chat.messages     [{ from, text, at }]
 * @param {string} chat.createdAt
 */
export async function downloadTranscript(chat) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - MARGIN * 2;
  let y = 52;

  const logo = await logoDataUrl();
  if (logo) {
    try { doc.addImage(String(logo), "PNG", MARGIN, y - 26, 120, 34); } catch { /* header just goes without it */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text("Chat transcript", pageW - MARGIN, y, { align: "right" });
  y += 30;

  doc.setDrawColor(220);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 22;

  const facts = [
    ["Studio", chat.studioName || "—"],
    ["Address", chat.studioSlug ? `nompany.com/${chat.studioSlug}` : "—"],
    ["Opened by", chat.userName || "—"],
    ["Handled by", chat.handledBy || "Not answered"],
    ["Chat ID", chat.id || "—"],
    ["Started", fmtStamp(chat.createdAt)],
    ["Downloaded", fmtStamp(new Date().toISOString())],
  ];
  doc.setFontSize(10);
  for (const [label, value] of facts) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(110);
    doc.text(`${label}:`, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK);
    doc.text(String(value), MARGIN + 78, y);
    y += 15;
  }

  y += 8;
  doc.setDrawColor(220);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 24;

  const messages = chat.messages || [];
  if (messages.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150);
    doc.text("Nothing was said in this chat.", MARGIN, y);
  }

  for (const m of messages) {
    const fromNompany = m.from === NOMPANY;
    const who = fromNompany ? (chat.handledBy || SUPPORT_LABEL) : (chat.userName || "Studio");
    const lines = doc.splitTextToSize(String(m.text || ""), maxW);
    // Measure the whole block before drawing it, so a message is never split
    // across the page break with its author left behind on the previous page.
    const blockH = 14 + lines.length * 13 + 12;
    if (y + blockH > pageH - MARGIN) {
      doc.addPage();
      y = 52;
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(fromNompany ? BRAND : INK));
    doc.text(who, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160);
    doc.text(fmtClock(m.at), pageW - MARGIN, y, { align: "right" });
    y += 14;
    doc.setTextColor(50);
    doc.text(lines, MARGIN, y);
    y += lines.length * 13 + 12;
  }

  const name = safe(chat.studioSlug || chat.studioName) || "chat";
  doc.save(`chat-${name}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
