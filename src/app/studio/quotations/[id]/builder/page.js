import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { getSectionAccess } from "@/lib/sectionAccess";
import { canAccessSection } from "@/lib/sectionAccessConstants";
import { hasTag } from "@/lib/auth";
import { PRESALES_TAG } from "@/lib/authConstants";
import { getCollection, getSettings } from "@/lib/db";
import { quotationBuildingType, defaultQuotationCopy } from "@/lib/quotationSheet";
import QuotationBuilder from "@/components/studio/QuotationBuilder";
import QuotationViewer from "@/components/studio/QuotationViewer";

export const dynamic = "force-dynamic";

export const metadata = { title: "Quotation builder" };

// Cover-page metadata for the two pages prepended to the printable quotation.
// Revisions = every quotation raised from the same ticket, earliest (Rev 1)
// first; each row carries its submission (completion) date.
function buildCover(quotation, allQuotations, settings) {
  const siblings = quotation.fromTicketId
    ? allQuotations.filter((q) => q.fromTicketId && q.fromTicketId === quotation.fromTicketId)
    : [quotation];
  const revisions = [...siblings]
    .sort((a, b) => (Number(a.revision) || 1) - (Number(b.revision) || 1))
    .map((q) => {
      const rev = Number(q.revision) || 1;
      return {
        revision: rev,
        remarks: rev === 1 ? "Initial Proposal" : `Revision ${rev}`,
        date: q.completedAt || "",
      };
    });
  const buildingType = quotationBuildingType(quotation.industry);
  const custom = settings?.quotationCopy?.[buildingType] || {};
  const fallback = defaultQuotationCopy(buildingType);
  return {
    logo: "/brand/logo-full.png",
    companyName: settings?.name_en || "",
    clientName: quotation.clientName || "",
    projectName: quotation.title || "",
    buildingType,
    intro: (custom.intro && custom.intro.trim()) || fallback.intro,
    summary: (custom.summary && custom.summary.trim()) || fallback.summary,
    quotationNumber: quotation.number || "",
    // Static "date of the quotation" — today until it's completed, then locked
    // to the completion date.
    dateOfQuotation: quotation.completedAt || new Date().toISOString(),
    revisions,
  };
}

export default async function Page({ params, searchParams }) {
  const actor = await currentUser();
  if (!actor) redirect("/studio/login");
  const { id } = await params;
  const sp = (await searchParams) || {};
  const forceView = sp.view === "1" || sp.view === "true";
  const quotations = await getCollection("quotations");
  const quotation = quotations.find((q) => q.id === id);
  if (!quotation) redirect("/studio/technical/quotations");

  const accessMap = await getSectionAccess();
  const settings = await getSettings();
  const cover = buildCover(quotation, quotations, settings);

  // Sales & Technical (+ Presales, admin) use the full quotation BUILDER.
  const canBuild =
    canAccessSection(actor, "technical-quotations", accessMap) ||
    hasTag(actor, PRESALES_TAG) ||
    canAccessSection(actor, "sales-list", accessMap) ||
    canAccessSection(actor, "sales", accessMap);

  // Project & Logistics (Inventory) users get a read-only VIEWER of the linked
  // quotation instead of the builder.
  const canView =
    canAccessSection(actor, "projects", accessMap) ||
    canAccessSection(actor, "projects-list", accessMap) ||
    canAccessSection(actor, "inventory", accessMap) ||
    canAccessSection(actor, "inventory-sheets", accessMap);

  // Opened from a project's quotation link (?view=1) — always the read-only
  // viewer, even for Sales/Technical/admin who could otherwise build.
  if (forceView && (canBuild || canView)) {
    return <QuotationViewer quotation={quotation} />;
  }
  if (canBuild) {
    return <QuotationBuilder quotation={quotation} cover={cover} />;
  }
  if (canView) {
    return <QuotationViewer quotation={quotation} />;
  }

  redirect("/studio");
}
