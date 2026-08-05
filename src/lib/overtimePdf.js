"use client";

// Export the Overtimes matrix (Projects × Users, total hours) as a landscape
// PDF styled to the Cash-sheet palette (logo + navy header). jsPDF.

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

// matrix = { projects:[{id,name}], users:[{id,name}], cell:(pid,uid)=>hours,
//            rowTotal:(pid)=>h, colTotal:(uid)=>h, grand:number }
export async function downloadOvertimeMatrix(matrix) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;
  const NAVY = [2, 46, 114];
  const NAVY_TINT = [238, 242, 251];
  let y = 42;

  const logo = await logoDataUrl();
  if (logo) { try { doc.addImage(logo, "PNG", margin, y - 24, 120, 36); } catch { /* ignore */ } }
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...NAVY);
  doc.text("Overtime Report", pageW - margin, y, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90);
  doc.text(new Date().toLocaleDateString("en-GB"), pageW - margin, y + 14, { align: "right" });
  y += 32;

  const { projects, users } = matrix;
  const firstW = 150;
  const totalW = 46;
  const usableW = pageW - margin * 2 - firstW - totalW;
  const uW = users.length ? Math.max(28, usableW / users.length) : usableW;
  const rowH = 18;

  const header = () => {
    doc.setFillColor(...NAVY); doc.rect(margin, y, pageW - margin * 2, rowH, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    let x = margin;
    doc.text("Project", x + 4, y + 12); x += firstW;
    for (const u of users) { doc.text(doc.splitTextToSize(u.name, uW - 4)[0] || "", x + uW / 2, y + 12, { align: "center" }); x += uW; }
    doc.text("Total", x + totalW / 2, y + 12, { align: "center" });
    y += rowH;
  };
  header();

  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  for (const p of projects) {
    if (y + rowH > pageH - 30) { doc.addPage(); y = 42; header(); doc.setFont("helvetica", "normal"); doc.setFontSize(8); }
    doc.setDrawColor(190); doc.setTextColor(30);
    let x = margin;
    doc.rect(x, y, firstW, rowH); doc.text(doc.splitTextToSize(p.name, firstW - 6)[0] || "", x + 4, y + 12); x += firstW;
    for (const u of users) { const h = matrix.cell(p.id, u.id); doc.rect(x, y, uW, rowH); if (h) doc.text(String(h), x + uW / 2, y + 12, { align: "center" }); x += uW; }
    doc.rect(x, y, totalW, rowH); doc.text(String(matrix.rowTotal(p.id)), x + totalW / 2, y + 12, { align: "center" });
    y += rowH;
  }
  // Totals row.
  doc.setFillColor(...NAVY_TINT); doc.setFont("helvetica", "bold"); doc.setTextColor(...NAVY);
  let x = margin;
  doc.rect(x, y, firstW, rowH, "FD"); doc.text("Total", x + 4, y + 12); x += firstW;
  for (const u of users) { doc.rect(x, y, uW, rowH, "FD"); doc.text(String(matrix.colTotal(u.id)), x + uW / 2, y + 12, { align: "center" }); x += uW; }
  doc.rect(x, y, totalW, rowH, "FD"); doc.text(String(matrix.grand), x + totalW / 2, y + 12, { align: "center" });

  doc.save(`overtime-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
