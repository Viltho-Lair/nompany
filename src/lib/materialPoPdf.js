"use client";

// Build + auto-download a vendor Purchase Order PDF for a material-po task
// (jsPDF, dynamically imported). Styled to match the Cash-sheet print palette:
// company logo + navy (#022e72) header band and table header, bordered rows.

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

// Aggregate the task's items by itemId + model, summing quantity.
function aggregate(items) {
  const map = {};
  for (const it of items || []) {
    const key = `${it.itemId || it.name}__${it.model || ""}`;
    if (!map[key]) map[key] = { name: it.name || it.itemId || "—", model: it.model || "", qty: 0 };
    map[key].qty += Number(it.qty) || 0;
  }
  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
}

export async function downloadMaterialPo(task) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const NAVY = [2, 46, 114];       // #022e72
  const NAVY_TINT = [238, 242, 251]; // #eef2fb
  let y = 46;

  const logo = await logoDataUrl();
  if (logo) { try { doc.addImage(logo, "PNG", margin, y - 26, 128, 38); } catch { /* ignore */ } }
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...NAVY);
  doc.text("Purchase Order", pageW - margin, y, { align: "right" });
  y += 30;

  doc.setDrawColor(210); doc.line(margin, y, pageW - margin, y); y += 20;
  const meta = [
    ["Vendor", task.vendorName || "—"],
    ["Project", task.projectName || "—"],
    ["Date", new Date(task.createdAt || Date.now()).toLocaleDateString("en-GB")],
    ["Reference", task.orderId ? String(task.orderId) : (task.id || "—")],
  ];
  doc.setFontSize(10);
  for (const [k, val] of meta) {
    doc.setFont("helvetica", "bold"); doc.setTextColor(60); doc.text(`${k}:`, margin, y);
    doc.setFont("helvetica", "normal"); doc.setTextColor(30); doc.text(String(val), margin + 84, y);
    y += 16;
  }
  y += 10;

  // Table layout: # | Item | Model | Qty
  const rows = aggregate(task.items);
  const cols = [
    { key: "n", label: "#", w: 30, align: "center" },
    { key: "name", label: "Item", w: pageW - margin * 2 - 30 - 150 - 60, align: "left" },
    { key: "model", label: "Model", w: 150, align: "left" },
    { key: "qty", label: "Qty", w: 60, align: "center" },
  ];
  const rowH = 22;
  const drawHeader = () => {
    doc.setFillColor(...NAVY); doc.rect(margin, y, pageW - margin * 2, rowH, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    let x = margin;
    for (const c of cols) {
      const tx = c.align === "center" ? x + c.w / 2 : x + 5;
      doc.text(c.label, tx, y + 15, { align: c.align === "center" ? "center" : "left" });
      x += c.w;
    }
    y += rowH;
  };
  drawHeader();

  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  let total = 0;
  rows.forEach((r, i) => {
    if (y + rowH > pageH - 60) { doc.addPage(); y = 46; drawHeader(); doc.setFont("helvetica", "normal"); }
    doc.setDrawColor(180);
    let x = margin;
    doc.setTextColor(30);
    const cells = { n: String(i + 1), name: r.name, model: r.model || "—", qty: String(r.qty) };
    total += Number(r.qty) || 0;
    for (const c of cols) {
      doc.rect(x, y, c.w, rowH);
      const txt = doc.splitTextToSize(String(cells[c.key]), c.w - 8)[0] || "";
      const tx = c.align === "center" ? x + c.w / 2 : x + 5;
      doc.text(txt, tx, y + 15, { align: c.align === "center" ? "center" : "left" });
      x += c.w;
    }
    y += rowH;
  });

  // Total row.
  doc.setFillColor(...NAVY_TINT); doc.setDrawColor(180);
  const totalLabelW = cols[0].w + cols[1].w + cols[2].w;
  doc.rect(margin, y, totalLabelW, rowH, "FD");
  doc.rect(margin + totalLabelW, y, cols[3].w, rowH, "FD");
  doc.setFont("helvetica", "bold"); doc.setTextColor(...NAVY);
  doc.text("Total", margin + 6, y + 15);
  doc.text(String(total), margin + totalLabelW + cols[3].w / 2, y + 15, { align: "center" });
  y += rowH + 30;

  // Footer signatures.
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60);
  const fin = task.approvals?.Finance?.byLabel || "";
  const mng = task.approvals?.Management?.byLabel || "";
  doc.text(`Finance approval: ${fin || "________________"}`, margin, y);
  doc.text(`Management approval: ${mng || "________________"}`, pageW - margin, y, { align: "right" });

  const safe = (s) => String(s || "").replace(/[^\w.-]+/g, "_").slice(0, 40) || "vendor";
  doc.save(`vendor-po-${safe(task.vendorName)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
