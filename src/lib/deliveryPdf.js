"use client";

// Build + auto-download a Delivery Note PDF (jsPDF, dynamically imported).
// Styled to the Cash-sheet palette: company logo + navy (#022e72) header band
// and table header, bordered rows, plus a client-signature line at the bottom.

const DSTATUS_LABEL = { "in-progress": "Pending delivery", completed: "Delivered", "partially-completed": "Partially delivered", rejected: "Rejected" };

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

export async function downloadDeliveryNote(delivery, project) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const NAVY = [2, 46, 114];
  let y = 46;

  const logo = await logoDataUrl();
  if (logo) { try { doc.addImage(logo, "PNG", margin, y - 26, 128, 38); } catch { /* ignore */ } }
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...NAVY);
  doc.text("Delivery Note", pageW - margin, y, { align: "right" });
  y += 30;

  doc.setDrawColor(210); doc.line(margin, y, pageW - margin, y); y += 20;
  const meta = [
    ["Reference", delivery.ref || "—"],
    ["Project", project?.title_en || delivery.projectName || "—"],
    ["Client", project?.clientName || delivery.clientName || "—"],
    ["Date", new Date(delivery.statusAt || delivery.createdAt || Date.now()).toLocaleDateString("en-GB")],
    ["Released by", delivery.releasedBy || "—"],
    ["Status", DSTATUS_LABEL[delivery.status] || delivery.status || "—"],
  ];
  doc.setFontSize(10);
  for (const [k, val] of meta) {
    doc.setFont("helvetica", "bold"); doc.setTextColor(60); doc.text(`${k}:`, margin, y);
    doc.setFont("helvetica", "normal"); doc.setTextColor(30); doc.text(String(val), margin + 84, y);
    y += 16;
  }
  y += 10;

  const cols = [
    { key: "n", label: "#", w: 30, align: "center" },
    { key: "name", label: "Item", w: 170, align: "left" },
    { key: "model", label: "Model", w: 110, align: "left" },
    { key: "qty", label: "Qty", w: 40, align: "center" },
    { key: "serials", label: "Serial numbers", w: pageW - margin * 2 - 30 - 170 - 110 - 40, align: "left" },
  ];
  const drawHeader = () => {
    doc.setFillColor(...NAVY); doc.rect(margin, y, pageW - margin * 2, 22, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    let x = margin;
    for (const c of cols) {
      const tx = c.align === "center" ? x + c.w / 2 : x + 5;
      doc.text(c.label, tx, y + 15, { align: c.align === "center" ? "center" : "left" });
      x += c.w;
    }
    y += 22;
  };
  drawHeader();

  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  (delivery.items || []).forEach((it, i) => {
    const serials = (it.serials || []).join(", ");
    const serialLines = doc.splitTextToSize(serials || "—", cols[4].w - 8);
    const rowH = Math.max(22, 8 + serialLines.length * 11);
    if (y + rowH > pageH - 80) { doc.addPage(); y = 46; drawHeader(); doc.setFont("helvetica", "normal"); doc.setFontSize(9); }
    doc.setDrawColor(180); doc.setTextColor(30);
    const cells = { n: String(i + 1), name: doc.splitTextToSize(String(it.name || it.itemId || "—"), cols[1].w - 8)[0] || "", model: doc.splitTextToSize(String(it.model || "—"), cols[2].w - 8)[0] || "", qty: String(it.qty), serials: serialLines };
    let x = margin;
    for (const c of cols) {
      doc.rect(x, y, c.w, rowH);
      if (c.key === "serials") {
        doc.text(serialLines, x + 5, y + 13);
      } else {
        const tx = c.align === "center" ? x + c.w / 2 : x + 5;
        doc.text(String(cells[c.key]), tx, y + 14, { align: c.align === "center" ? "center" : "left" });
      }
      x += c.w;
    }
    y += rowH;
  });

  y += 40;
  if (y > pageH - 80) { doc.addPage(); y = 80; }
  doc.setDrawColor(120);
  const half = (pageW - margin * 2 - 30) / 2;
  doc.line(margin, y, margin + half, y);
  doc.line(pageW - margin - half, y, pageW - margin, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90);
  doc.text("Delivered by (MegaTech Arabia)", margin, y + 14);
  doc.text("Received by / Client signature & date", pageW - margin - half, y + 14);

  const safe = (s) => String(s || "").replace(/[^\w.-]+/g, "_").slice(0, 40) || "delivery";
  doc.save(`delivery-${safe(delivery.ref)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
