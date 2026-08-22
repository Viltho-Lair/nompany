import type { AwbMovement } from "./types";

// Canonical air-cargo milestone model — client-safe (no imports).
//
// Air cargo movement is a sequence of IATA Cargo-IMP status events. This is the
// superset we store/display; aggregator payloads are normalised into these
// codes. `order` gives the natural lifecycle sequence (origin → delivered) used
// to sort a timeline when event timestamps tie or are missing. `exception`
// flags off-happy-path events (discrepancy/shortage) that shouldn't advance the
// "progress" but must be shown.
export const AWB_STATUS = [
  { code: "FOH", label: "Freight on Hand", order: 10, desc: "Cargo received into the handler's care at origin." },
  { code: "RCS", label: "Received from Shipper", order: 20, desc: "Carrier accepted the cargo (ready for carriage)." },
  { code: "BKD", label: "Booked", order: 30, desc: "Space confirmed on a flight." },
  { code: "MAN", label: "Manifested", order: 40, desc: "Added to a flight's cargo manifest." },
  { code: "DEP", label: "Departed", order: 50, desc: "Flight departed the station." },
  { code: "ARR", label: "Arrived", order: 60, desc: "Flight arrived at a station." },
  { code: "RCF", label: "Received from Flight", order: 70, desc: "Unloaded & received at transit/destination." },
  { code: "TRM", label: "To be Transferred", order: 74, desc: "Awaiting transfer to an interline/road partner." },
  { code: "TFD", label: "Transferred", order: 76, desc: "Handed to an interline partner / trucking." },
  { code: "NFD", label: "Notified", order: 80, desc: "Consignee/broker notified — ready for collection." },
  { code: "AWD", label: "Arrival Docs Delivered", order: 85, desc: "Arrival documents handed over." },
  { code: "CCD", label: "Customs Cleared", order: 90, desc: "Released by customs." },
  { code: "DLV", label: "Delivered", order: 100, desc: "Picked up by / delivered to the consignee." },
  { code: "DIS", label: "Discrepancy", order: 105, desc: "Exception — refusal or reported issue.", exception: true },
  { code: "MSCA", label: "Shortage / Missing", order: 106, desc: "Exception — pieces missing at scan.", exception: true },
];

/** One point on the lifecycle, as the carrier's scans report it. */
export type AwbStatus = {
  code: string;
  label: string;
  order: number;
  desc: string;
  /** An exception is not a stage — it sits beside the ladder, not on it. */
  exception?: boolean;
};

export const AWB_STATUS_BY_CODE: Record<string, AwbStatus | undefined> =
  Object.fromEntries(AWB_STATUS.map((s) => [s.code, s]));

export function statusLabel(code: string) {
  return AWB_STATUS_BY_CODE[code]?.label || code || "—";
}
export function statusOrder(code: string) {
  return AWB_STATUS_BY_CODE[code]?.order ?? 0;
}
export function isException(code: string) {
  return !!AWB_STATUS_BY_CODE[code]?.exception;
}
export function isDelivered(code: string) {
  return code === "DLV";
}

// Recompute a shipment's derived fields from its movement list: sort by event
// time (then lifecycle order), pick the current (non-exception) status, and flag
// delivery. Pure — returns a new object.
export function summarizeMovements(movements: AwbMovement[] | null | undefined) {
  const list = Array.isArray(movements) ? [...movements] : [];
  list.sort((a, b) => (a.at || "").localeCompare(b.at || "") || statusOrder(a.code) - statusOrder(b.code));
  const progressed = list.filter((m) => !isException(m.code));
  const last = progressed[progressed.length - 1] || list[list.length - 1] || null;
  return {
    movements: list,
    currentStatus: last?.code || "",
    currentStatusAt: last?.at || "",
    delivered: list.some((m) => m.code === "DLV"),
  };
}
