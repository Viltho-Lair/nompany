// THE PROCUREMENT DASHBOARD — the section's six registers, answered at once.
//
// IT HAS NO ARITHMETIC OF ITS OWN, and that is the whole design. Every figure
// below comes from the pure model that already owns it: `expediteOrders` for
// what is late, `threeWayMatch` for what does not add up, `supplierQualification`
// for who may be bought from, `subcontractPosition` for what is held back,
// `requisitionTotals` for what is being asked for. A dashboard that recomputed
// any of them would be a second answer free to disagree with the screen, which
// is exactly what `salesAnalytics` did — three copies of the pipeline's own
// vocabulary that agreed on the day they were written and not afterwards.
//
// THE DASHBOARD GRANTS NOTHING. Every block is gated by the right over its own
// records, and a block the reader may not see is NEVER READ — so it costs no
// round trip either, and no figure derived from records somebody cannot open
// can reach them by this door. The same shape as customer 360, and the reason
// this screen cannot become a way to see what the registers refuse.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { expediteOrders } from "./expediting";
import { threeWayMatch } from "./receivingModel";
import { supplierQualification, supplierOnTime } from "./supplierModel";
import { subcontractPosition } from "./subcontractModel";
import { requisitionTotals } from "./model";
import type { GoodsReceipt } from "./receivingSchema";
import type { Requisition } from "./schema";
import type { Rfq } from "./rfqSchema";
import type { Subcontract, PaymentCertificate } from "./subcontractSchema";
import type { ProcurementContext } from "./types";
import type { Order, Vendor } from "@/modules/inventory/schema";
import type { Bill } from "@/modules/finance/schema";

const Requisitions = repo<Requisition>("requisitions");
const Rfqs = repo<Rfq>("supplierRfqs");
const Orders = repo<Order>("materialOrders");
const Receipts = repo<GoodsReceipt>("goodsReceipts");
const Vendors = repo<Vendor>("inventoryVendors");
const Subcontracts = repo<Subcontract>("subcontracts");
const Certificates = repo<PaymentCertificate>("paymentCertificates");
const Bills = repo<Bill>("bills");

/** A requisition still waiting on somebody. */
const AWAITING = new Set(["Submitted", "In review"]);

const money = (n: number) => Math.round(n * 100) / 100;

export async function procurementDashboard(ctx: ProcurementContext) {
  const denied = requirePermission(ctx.access, "procurement.dashboard.view");
  if (denied) return denied;

  const {
    studio, requisitionsSection, rfqSection, ordersSection,
    suppliersSection, subcontractsSection, billsSection,
  } = ctx;

  // ONE PERMISSION QUESTION PER BLOCK, asked before anything is fetched.
  const may = {
    requisitions: !requirePermission(ctx.access, "procurement.requisitions.view"),
    rfq: !requirePermission(ctx.access, "procurement.rfq.view"),
    expediting: !requirePermission(ctx.access, "procurement.expediting.view"),
    receiving: !requirePermission(ctx.access, "procurement.receiving.view"),
    suppliers: !requirePermission(ctx.access, "procurement.suppliers.view"),
    subcontracts: !requirePermission(ctx.access, "procurement.subcontracts.view"),
    bills: !requirePermission(ctx.access, "finance.payables.view"),
  };

  // ORDERS FEED TWO BLOCKS, so they are fetched once for either. Expediting and
  // receiving are different rights over the same rows, and reading them twice
  // would be two round trips for one answer.
  const wantsOrders = may.expediting || may.receiving;

  const [requisitions, rfqs, orders, receipts, vendors, subcontracts, certificates, bills] =
    await Promise.all([
      may.requisitions && requisitionsSection
        ? Requisitions.find({ studio, section: requisitionsSection })
        : Promise.resolve([] as Requisition[]),
      may.rfq && rfqSection
        ? Rfqs.find({ studio, section: rfqSection })
        : Promise.resolve([] as Rfq[]),
      wantsOrders && ordersSection
        ? Orders.find({ studio, section: ordersSection })
        : Promise.resolve([] as Order[]),
      may.receiving && ordersSection
        ? Receipts.find({ studio, section: ordersSection })
        : Promise.resolve([] as GoodsReceipt[]),
      may.suppliers
        ? Vendors.find({ studio, section: suppliersSection })
        : Promise.resolve([] as Vendor[]),
      may.subcontracts && subcontractsSection
        ? Subcontracts.find({ studio, section: subcontractsSection })
        : Promise.resolve([] as Subcontract[]),
      may.subcontracts && subcontractsSection
        ? Certificates.find({ studio, section: subcontractsSection })
        : Promise.resolve([] as PaymentCertificate[]),
      // THE INVOICE LEG, and only for a reader entitled to it. Not fetched
      // otherwise, so the over-billed count below cannot exist for somebody who
      // may not see an invoice — the figure is withheld rather than zeroed.
      may.receiving && may.bills && billsSection
        ? Bills.find({ studio, section: billsSection })
        : Promise.resolve([] as Bill[]),
    ]);

  // WHEN THIS ANSWER WAS TRUE, decided once and travelling with it, so every
  // block agrees about what "late" and "expiring" mean.
  const asOf = new Date().toISOString();
  const today = asOf.slice(0, 10);

  // ---- requisitions --------------------------------------------------------
  const awaiting = requisitions.filter((r) => AWAITING.has(String(r.status || "")));
  const awaitingTotals = awaiting.map((r) => requisitionTotals(r.lines));
  const requisitionBlock = may.requisitions ? {
    awaiting: awaiting.length,
    awaitingValue: money(awaitingTotals.reduce((s, t) => s + t.estimated, 0)),
    // AND WHETHER THAT FIGURE IS THE WHOLE OF IT. `requisitionTotals` carries
    // `complete` for the reason `boqTotals` does — the total of a
    // part-estimated request is a number and is NOT what the request is worth
    // — so a sum across requests inherits the caveat rather than dropping it.
    // Where this is false the screen shows the figure as a floor, because a
    // headline that quietly understates what is being asked for is worse than
    // one that admits it does not know.
    awaitingValueComplete: awaitingTotals.every((t) => t.complete),
    // APPROVED AND NOT YET ORDERED — the queue the buyer is actually working.
    approved: requisitions.filter((r) => String(r.status || "") === "Approved").length,
  } : null;

  // ---- supplier quotes -----------------------------------------------------
  const rfqBlock = may.rfq ? {
    open: rfqs.filter((r) => String(r.status || "") === "Sent").length,
    draft: rfqs.filter((r) => String(r.status || "") === "Draft").length,
  } : null;

  // ---- expediting ----------------------------------------------------------
  // THE VIEW ITSELF, not a re-count of it. `expediteOrders` decides what is
  // outstanding, what is late and what has never been chased.
  const expediting = expediteOrders(orders, today);
  const expeditingBlock = may.expediting ? {
    late: expediting.late,
    dueSoon: expediting.dueSoon,
    unchased: expediting.unchased,
    undated: expediting.undated,
  } : null;

  // ---- receiving -----------------------------------------------------------
  // BILLS ARE NOT FETCHED AT ALL without the payables right, so for that reader
  // the match runs on two legs and reports what it can — the same posture
  // `listReceiving` takes, and the reason the exception counts below can never
  // leak an invoice figure to somebody who may not see one.
  const matches = may.receiving
    ? orders
      .filter((o) => !["Draft", "Cancelled"].includes(String(o.status || "")))
      .map((o) => threeWayMatch(o, receipts, bills))
    : [];
  const receivingBlock = may.receiving ? {
    awaitingDelivery: matches.filter((m) => !m.fullyReceived).length,
    partDelivered: matches.filter((m) => m.flags.includes("part-delivered")).length,
    overReceived: matches.filter((m) => m.flags.includes("over-received")).length,
    rejected: matches.filter((m) => m.rejectedQty > 0).length,
    // NULL RATHER THAN NOUGHT when the reader may not see invoices. Nought
    // would say "no order is over-billed", which is a finding they have not
    // been shown and, with no bills fetched, this screen does not have.
    overBilled: may.bills
      ? matches.filter((m) => m.flags.includes("over-billed")).length
      : null,
  } : null;

  // ---- suppliers -----------------------------------------------------------
  const qualifications = may.suppliers
    ? vendors.map((v) => supplierQualification(v, today))
    : [];
  const supplierBlock = may.suppliers ? {
    total: vendors.length,
    blocked: qualifications.filter((q) => q.state === "blocked").length,
    lapsed: qualifications.filter((q) => q.state === "lapsed").length,
    expiring: qualifications.filter((q) => q.state === "expiring").length,
    unassessed: qualifications.filter((q) => q.state === "unassessed").length,
  } : null;

  // ---- on-time by supplier (the one paid widget) ---------------------------
  //
  // NEEDS BOTH RIGHTS, and asks for both. It is a supplier's name against
  // delivery performance, so somebody holding only the supplier register must
  // not learn it from here and somebody holding only expediting must not learn
  // whose it is. `supplierOnTime` is the register's own function, unchanged —
  // measured against the ORIGINAL promise, so a supplier who re-promised four
  // times cannot climb this ranking by doing it again.
  //
  // ONLY SUPPLIERS WITH SOMETHING TO JUDGE. A vendor whose orders have not
  // landed yet has a null percentage, and sorting nulls into a league table
  // would rank them as perfect or as worst depending on which way the
  // comparator fell — neither of which anybody said.
  const onTimeBySupplier = may.suppliers && may.expediting
    ? vendors
      .map((v) => ({ vendorId: v.id, name: v.name, ...supplierOnTime(orders, v.id) }))
      .filter((r) => r.percent !== null)
      .sort((a, b) => (a.percent as number) - (b.percent as number))
      .slice(0, 8)
    : null;

  // ---- subcontracts --------------------------------------------------------
  const positions = may.subcontracts
    ? subcontracts.map((s) => subcontractPosition(
      s, certificates.filter((c) => c.subcontractId === s.id), today))
    : [];
  const subcontractBlock = may.subcontracts ? {
    live: subcontracts.filter((s) => String(s.status || "") === "Live").length,
    certifiedToDate: money(positions.reduce((s, p) => s + p.certifiedToDate, 0)),
    retentionHeld: money(positions.reduce((s, p) => s + (p.retention?.held || 0), 0)),
  } : null;

  return {
    asOf,
    may,
    requisitions: requisitionBlock,
    rfq: rfqBlock,
    expediting: expeditingBlock,
    receiving: receivingBlock,
    suppliers: supplierBlock,
    subcontracts: subcontractBlock,
    onTimeBySupplier,
  };
}
