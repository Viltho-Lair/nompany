"use client";

// Build + auto-download the chat transcript as a PDF (jsPDF, dynamically
// imported so it stays out of the initial bundle). Header carries the company
// logo + client details; the body lists both sides' messages with timestamps.
import { TOPIC_LABEL } from "@/lib/chatConstants";

async function logoDataUrl() {
  try {
    const res = await fetch("/brand/logo-full.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function downloadTranscript(room) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 44;

  const logo = await logoDataUrl();
  if (logo) { try { doc.addImage(logo, "PNG", margin, y - 24, 128, 38); } catch { /* ignore */ } }
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(20, 30, 72);
  doc.text("Chat Transcript", pageW - margin, y, { align: "right" });
  y += 34;

  doc.setDrawColor(222); doc.line(margin, y, pageW - margin, y); y += 20;
  const v = room.visitor || {};
  const rows = [
    ["Client", v.name || "—"],
    ["Company", v.company || "—"],
    ["Email", v.email || "—"],
    ["Phone", v.phone || "—"],
    ["Topic", TOPIC_LABEL[room.topic] || room.topic || "—"],
    ["Date", new Date(room.createdAt || Date.now()).toLocaleString("en-GB")],
    ["Handled by", room.agentLabel ? `MegaTech · ${room.agentLabel}` : "MegaTech Arabia"],
  ];
  doc.setFontSize(10);
  for (const [k, val] of rows) {
    doc.setFont("helvetica", "bold"); doc.setTextColor(60); doc.text(`${k}:`, margin, y);
    doc.setFont("helvetica", "normal"); doc.setTextColor(30); doc.text(String(val), margin + 84, y);
    y += 16;
  }
  y += 8; doc.setDrawColor(222); doc.line(margin, y, pageW - margin, y); y += 22;

  const maxW = pageW - margin * 2;
  doc.setFontSize(10);
  for (const m of (room.messages || [])) {
    const isAgent = m.from === "agent";
    const who = isAgent ? `MegaTech · ${room.agentLabel || "Agent"}` : (v.name || "Client");
    const time = m.at ? new Date(m.at).toLocaleTimeString("en-GB") : "";
    const lines = doc.splitTextToSize(String(m.text || ""), maxW);
    const blockH = 16 + lines.length * 13 + 8;
    if (y + blockH > pageH - 40) { doc.addPage(); y = 44; }
    doc.setFont("helvetica", "bold");
    if (isAgent) doc.setTextColor(20, 30, 72); else doc.setTextColor(120, 70, 20);
    doc.text(who, margin, y);
    doc.setFont("helvetica", "normal"); doc.setTextColor(160); doc.text(time, pageW - margin, y, { align: "right" });
    y += 14;
    doc.setTextColor(40); doc.text(lines, margin, y); y += lines.length * 13 + 12;
  }

  const safe = (s) => String(s || "").replace(/[^\w.-]+/g, "_").slice(0, 40) || "client";
  doc.save(`chat-${safe(v.company || v.name)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
