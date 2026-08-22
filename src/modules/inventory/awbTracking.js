// AWB TRACKING — air freight, followed by its waybill.
//
// An AWB number is 11 digits: a 3-digit airline prefix, a 7-digit serial and a
// mod-7 check digit. So the number itself says which carrier is flying it, and
// a typo is catchable arithmetic rather than a failed lookup — see modules/inventory/awb.js.
//
// Rows live under the inventory-awb sub-section:
//   s:<StudioID>:sec:<SectionID>:c:awbShipments
//   s:<StudioID>:sec:<SectionID>:c:awbAirlines
//
// A shipment's CURRENT STATUS IS DERIVED from its movements — the same rule as
// on-hand in Inventory and progress in Projects: the milestone shown is whatever
// the recorded events add up to, so it can never disagree with the timeline
// printed under it.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { addRow, updateRow, deleteRow } from "@/platform/db/sections";
import { parseAwb } from "./awb";
import { AWB_STATUS_BY_CODE, summarizeMovements } from "./awbStatus";

const SHIPMENTS = "awbShipments";
const AIRLINES = "awbAirlines";

// THE COLLECTIONS THIS MODULE QUERIES, named once. A repository binds a
// collection, not a scope — the studio and section arrive per call, which is
// what stops a query naming another tenant's keys and what lets one object
// answer for a sibling department's rows as easily as its own.
const Airlines = repo(AIRLINES);
const Shipments = repo(SHIPMENTS);

const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const qty = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : 0; };
const count = (v) => Math.max(0, Math.round(Number(v)) || 0);

// ---- airline registry -------------------------------------------------------
// The AWB sub-section owns both collections.
export async function listAirlines({ studio, awbSection }) {
  const rows = await Airlines.find({ studio, section: awbSection });
  return [...rows].sort((a, b) => String(a.prefix || "").localeCompare(String(b.prefix || "")));
}

export async function createAirline(ctx, body) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.awb.create");
  if (denied) return denied;

  const { studio, awbSection } = ctx;
  const prefix = str(body?.prefix, 3).replace(/\D/g, "");
  const name = str(body?.name, 160);
  if (prefix.length !== 3) return { error: "prefix" };
  if (!name) return { error: "name" };

  const rows = await Airlines.find({ studio, section: awbSection });
  // The prefix IS the identity — two carriers cannot share one, or a waybill
  // would resolve to whichever row happened to be found first.
  if (rows.some((a) => a.prefix === prefix)) return { error: "duplicate" };

  const airline = await addRow(studio.id, awbSection.id, AIRLINES, {
    prefix,
    name,
    iata: str(body?.iata, 3).toUpperCase(),
    trackUrlTemplate: str(body?.trackUrlTemplate, 500),
    createdAt: new Date().toISOString(),
  });
  return { airline };
}

export async function editAirline(ctx, id, body) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.awb.edit");
  if (denied) return denied;

  const { studio, awbSection } = ctx;
  const patch = {};
  if (body?.prefix !== undefined) {
    const prefix = str(body.prefix, 3).replace(/\D/g, "");
    if (prefix.length !== 3) return { error: "prefix" };
    const rows = await Airlines.find({ studio, section: awbSection });
    if (rows.some((a) => a.id !== id && a.prefix === prefix)) return { error: "duplicate" };
    patch.prefix = prefix;
  }
  if (body?.name !== undefined) { const v = str(body.name, 160); if (!v) return { error: "name" }; patch.name = v; }
  if (body?.iata !== undefined) patch.iata = str(body.iata, 3).toUpperCase();
  if (body?.trackUrlTemplate !== undefined) patch.trackUrlTemplate = str(body.trackUrlTemplate, 500);

  const airline = await updateRow(studio.id, awbSection.id, AIRLINES, id, patch);
  return airline ? { airline } : { error: "notfound" };
}

// A carrier is removable only while nothing it flew is still being tracked —
// otherwise those shipments lose the name of whoever is carrying them.
export async function removeAirline(ctx, id) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.awb.delete");
  if (denied) return denied;

  const { studio, awbSection } = ctx;
  const [airlines, shipments] = await Promise.all([
    Airlines.find({ studio, section: awbSection }),
    Shipments.find({ studio, section: awbSection }),
  ]);
  const airline = airlines.find((a) => a.id === id);
  if (!airline) return { error: "notfound" };
  const used = shipments.filter((s) => s.prefix === airline.prefix).length;
  if (used) return { error: "in-use", shipments: used };

  const removed = await deleteRow(studio.id, awbSection.id, AIRLINES, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- shipments --------------------------------------------------------------
// Each one with its carrier resolved from the prefix and its status summarised
// from the movements.
export async function listShipments({ studio, awbSection }) {
  const [shipments, airlines] = await Promise.all([
    Shipments.find({ studio, section: awbSection }),
    Airlines.find({ studio, section: awbSection }),
  ]);
  const byPrefix = Object.fromEntries(airlines.map((a) => [a.prefix, a]));

  return [...shipments]
    .map((s) => {
      const airline = byPrefix[s.prefix] || null;
      return {
        ...s,
        ...summarizeMovements(s.movements),
        airlineName: airline?.name || "",
        airlineIata: airline?.iata || "",
        // The carrier's own tracking page, when it has published a template.
        trackUrl: airline?.trackUrlTemplate
          ? airline.trackUrlTemplate
            .split("{AWB}").join(s.awbNumber || "")
            .split("{PREFIX}").join(s.prefix || "")
            .split("{SERIAL}").join(s.serial || "")
          : "",
      };
    })
    // Undelivered first — a shipment still moving is the one being watched. Then
    // most recently moved, so what just happened is at the top of each group.
    .sort((a, b) =>
      Number(a.delivered) - Number(b.delivered) ||
      String(b.currentStatusAt || b.createdAt || "").localeCompare(String(a.currentStatusAt || a.createdAt || "")));
}

// Start following a waybill. The number is validated ARITHMETICALLY here — 11
// digits and a correct mod-7 check digit — so a mistyped waybill is refused at
// the door rather than sitting in the list forever, never moving, because it
// refers to nothing.
export async function trackShipment(ctx, body) {
  // Guarded before anything is read or written — see platform/access/resolve.ts. Every other
  // write in this file asked for its right and this one did not, which made the
  // route's section-level check the only thing standing in front of it.
  const denied = requirePermission(ctx.access, "inventory.awb.create");
  if (denied) return denied;

  const { studio, awbSection, collaborator } = ctx;
  const parsed = parseAwb(body?.awbNumber);
  if (!parsed.valid) return { error: "awb", reason: parsed.reason };

  const rows = await Shipments.find({ studio, section: awbSection });
  if (rows.some((s) => s.digits === parsed.digits)) return { error: "duplicate" };

  const shipment = await addRow(studio.id, awbSection.id, SHIPMENTS, {
    awbNumber: parsed.formatted,
    digits: parsed.digits,
    prefix: parsed.prefix,
    serial: parsed.serial,
    reference: str(body?.reference, 160),
    origin: str(body?.origin, 8).toUpperCase(),
    destination: str(body?.destination, 8).toUpperCase(),
    pieces: count(body?.pieces),
    weightKg: qty(body?.weightKg),
    projectId: str(body?.projectId, 60),
    movements: [],
    trackedByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
  });
  return { shipment: { ...shipment, ...summarizeMovements([]) } };
}

export async function updateShipment(ctx, id, body) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.awb.edit");
  if (denied) return denied;

  const { studio, awbSection, collaborator } = ctx;
  const rows = await Shipments.find({ studio, section: awbSection });
  const current = rows.find((s) => s.id === id);
  if (!current) return { error: "notfound" };

  const patch = {};
  if (body?.reference !== undefined) patch.reference = str(body.reference, 160);
  for (const f of ["origin", "destination"]) if (body?.[f] !== undefined) patch[f] = str(body[f], 8).toUpperCase();
  if (body?.pieces !== undefined) patch.pieces = count(body.pieces);
  if (body?.weightKg !== undefined) patch.weightKg = qty(body.weightKg);
  if (body?.projectId !== undefined) patch.projectId = str(body.projectId, 60);

  // Movements are APPENDED one at a time, never replaced wholesale: two people
  // logging a milestone at once must not overwrite each other, and who recorded
  // it is taken from the session rather than the payload.
  if (body?.movement) {
    const code = str(body.movement.code, 8).toUpperCase();
    if (!AWB_STATUS_BY_CODE[code]) return { error: "status" };
    patch.movements = [
      ...(Array.isArray(current.movements) ? current.movements : []),
      {
        id: `mv${Date.now().toString(36)}`,
        code,
        // An event that carries no time is being logged as it happens.
        at: str(body.movement.at, 40) || new Date().toISOString(),
        station: str(body.movement.station, 8).toUpperCase(),
        flightNo: str(body.movement.flightNo, 16).toUpperCase(),
        note: str(body.movement.note, 300),
        byCollaboratorId: collaborator.id,
      },
    ];
  }

  const shipment = await updateRow(studio.id, awbSection.id, SHIPMENTS, id, patch);
  return shipment ? { shipment: { ...shipment, ...summarizeMovements(shipment.movements) } } : { error: "notfound" };
}

export async function removeShipment(ctx, id) {
  // Guarded before anything is read or written — see platform/access/resolve.ts.
  const denied = requirePermission(ctx.access, "inventory.awb.delete");
  if (denied) return denied;

  const removed = await deleteRow(ctx.studio.id, ctx.awbSection.id, SHIPMENTS, id);
  return removed ? { ok: true } : { error: "notfound" };
}
