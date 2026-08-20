import { notFound } from "next/navigation";
import { getJSON } from "@/lib/data/store";
import { IX } from "@/lib/data/keys";
import { readCol, addRow } from "@/lib/data/sections";
import { getStudioById } from "@/lib/data/studios";
import { listCollaborators } from "@/lib/data/collaborators";
import { renderSections } from "@/lib/qualityRender";
import { directionOf } from "@/lib/qualityDocuments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A controlled document must never be indexed. It left the studio because one
// person was given a link, not because it was published to the world.
export const metadata = { title: "Shared document", robots: { index: false, follow: false, nocache: true } };

// THE ONE PUBLIC DOOR IN THE MODULE.
//
// Everything about this page is arranged around the fact that whoever opens it
// has no account, no session and no relationship with the studio beyond holding
// a link somebody sent them:
//
//  • The TOKEN IS THE WHOLE ADDRESS. It resolves through an index that carries
//    Redis' own TTL, so an expired link stops working without anything having
//    to run and there is no window where a forgotten sweep leaves it live.
//  • It is BOUND TO ONE REVISION. Publishing a newer one does not change what
//    was sent — a link that followed the document would be a link whose
//    contents nobody could testify to afterwards.
//  • It is WATERMARKED. A printout of this must never be mistaken for the
//    controlled original, because the person holding it has no way to check.
//  • EVERY OPEN IS LOGGED onto the document's audit trail.
//
// There is deliberately NO PDF here. A public route that can start a headless
// browser is a public route that can be made to start a thousand of them, and
// the browser in front of the reader can already print this page.

const SHARES = "qualityShareLinks";
const AUDIT = "qualityAudit";

export default async function SharedDocument({ params }) {
  const { token } = await params;
  if (!/^[a-f0-9]{40,80}$/i.test(String(token || ""))) notFound();

  // Expired or revoked links simply are not here: the key is gone, so this is a
  // 404 rather than a page explaining what used to be at this address.
  const claimRow = await getJSON(IX.qshare(token));
  if (!claimRow?.studioId) notFound();

  const { studioId, sectionId, documentId, revisionId } = claimRow;
  const [studio, documents, revisions] = await Promise.all([
    getStudioById(studioId),
    readCol(studioId, sectionId, "qualityDocuments"),
    readCol(studioId, sectionId, "qualityRevisions"),
  ]);
  const document = documents.find((d) => d.id === documentId);
  const revision = revisions.find((r) => r.id === revisionId);
  if (!studio || !document || !revision) notFound();

  // A link is minted against an issued revision, but the document can be
  // WITHDRAWN afterwards — and somebody reading a withdrawn procedure from
  // outside the company is the worst version of the problem document control
  // exists to solve. The link keeps working, because the recipient may need to
  // know what they were sent; it says so across every page.
  const withdrawn = Boolean(document.obsoletedAt);

  const people = await listCollaborators(studioId).catch(() => []);
  const alias = (id) => people.find((c) => c.id === id)?.alias || "";

  const values = {
    "company.name": studio.name || "",
    "company.address": studio.location || "",
    "company.country": studio.country || "",
    "company.city": studio.city || "",
    "document.code": document.code || "",
    "document.title": document.title || "",
    "document.revision": `Rev ${revision.rev}`,
    "document.owner": alias(document.ownerCollaboratorId),
    "document.effectiveDate": revision.effectiveDate || document.effectiveDate || "",
  };

  // Logged before the page is drawn, so a reader who closes the tab immediately
  // is still recorded. Best-effort: a failed log must not deny somebody the
  // document they were legitimately sent.
  addRow(studioId, sectionId, AUDIT, {
    documentId, revisionId, action: "share.opened",
    detail: `Rev ${revision.rev}`, byCollaboratorId: "", byAlias: "External reader",
    at: new Date().toISOString(),
  }).catch(() => {});

  const links = await readCol(studioId, sectionId, SHARES).catch(() => []);
  const link = links.find((l) => l.token === token);
  if (link) {
    const { updateRow } = await import("@/lib/data/sections");
    updateRow(studioId, sectionId, SHARES, link.id, {
      accessCount: (Number(link.accessCount) || 0) + 1,
      lastAccessAt: new Date().toISOString(),
    }).catch(() => {});
  }

  const dir = directionOf(document.language);
  const stamp = withdrawn ? "WITHDRAWN — UNCONTROLLED COPY" : "UNCONTROLLED COPY";

  return (
    <main style={{ background: "#f4f5fa", minHeight: "100vh", padding: "24px 16px" }}>
      <style>{`
.share-sheet { position: relative; max-width: 900px; margin: 0 auto; background: #fff; border-radius: 20px;
  box-shadow: 0 14px 40px -18px rgba(20,30,72,.16); overflow: hidden; }
.share-bar { display: flex; gap: 12px; align-items: center; padding: 14px 18mm; font-size: 9pt; color: #64748b; }
.share-bar + .share-bar { border-top: 1px solid #e2e8f0; }
.share-head { border-bottom: 1px solid #e2e8f0; }
.share-stamp { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  pointer-events: none; z-index: 5; }
.share-stamp span { transform: rotate(-32deg); font-size: 52px; font-weight: 800; letter-spacing: .06em;
  color: rgba(220,38,38,.10); white-space: nowrap; text-align: center; }
.share-note { max-width: 900px; margin: 14px auto 0; font-size: 12px; color: #64748b; text-align: center; }
@media print { body { background: #fff; } .share-sheet { box-shadow: none; border-radius: 0; } .share-note { display: none; } }
`}</style>

      <div className="share-sheet">
        <div className="share-stamp"><span>{stamp}</span></div>

        <div className="share-bar share-head">
          <span style={{ flex: 1 }}>{studio.name}</span>
          <span style={{ flex: 1, textAlign: "center" }}>{document.title}</span>
          <span style={{ flex: 1, textAlign: "end", fontFamily: "monospace" }}>{document.code}</span>
        </div>

        <div dir={dir} style={{ padding: "12mm 18mm", margin: "0 auto" }}
          dangerouslySetInnerHTML={{ __html: renderSections(revision.sections, { values }) }} />

        <div className="share-bar" style={{ borderTop: "1px solid #e2e8f0" }}>
          <span style={{ flex: 1 }}>Rev {revision.rev}</span>
          <span style={{ flex: 1, textAlign: "center" }}>
            {revision.effectiveDate ? `Effective ${revision.effectiveDate}` : "Not dated"}
          </span>
          <span style={{ flex: 1, textAlign: "end" }}>
            {claimRow.expiresAt ? `Link expires ${String(claimRow.expiresAt).slice(0, 10)}` : ""}
          </span>
        </div>
      </div>

      <p className="share-note">
        {withdrawn
          ? "This document has since been withdrawn and must not be worked from."
          : "This is an uncontrolled copy of one revision. Check with the issuer before working from it."}
      </p>
    </main>
  );
}
