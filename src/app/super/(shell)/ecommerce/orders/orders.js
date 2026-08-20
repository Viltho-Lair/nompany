// The Orders screen's shape and fixture data. No React, so both the server page
// and the route's loading.js can read it without pulling the client screen in.

export const ORDERS_COLUMNS = [
  { field: "id", headerName: "Order", width: 130, skeleton: "number" },
  { field: "customer", headerName: "Customer", flex: 2, minWidth: 220, skeleton: "avatar" },
  { field: "items", headerName: "Items", width: 90, skeleton: "number" },
  { field: "total", headerName: "Total", width: 110, skeleton: "number" },
  { field: "payment", headerName: "Payment", width: 140 },
  { field: "status", headerName: "Status", width: 130, skeleton: "pill" },
  { field: "date", headerName: "Date", width: 140, skeleton: "number" },
];

export const ORDERS_PAGE_SIZE = 10;

export const STATUS_TABS = ["All", "Processing", "Shipped", "Delivered", "Cancelled", "Refunded"];

// The fulfilment stages, in order. The timeline is DERIVED from an order's
// status against this list rather than stored per order, so a status and its
// timeline cannot disagree — which is what happened in the template, where every
// order showed five completed ticks including the cancelled one.
export const STAGES = ["Order placed", "Payment confirmed", "Packed", "Shipped", "Delivered"];

const REACHED = {
  Processing: 1,   // paid, not yet packed
  Shipped: 3,
  Delivered: 4,
  Cancelled: 1,    // it was paid, then it stopped
  Refunded: 1,
};

export const stageIndex = (status) => (REACHED[status] ?? 0);

const TONE = {
  Delivered: "success",
  Shipped: "info",
  Processing: "warning",
  Cancelled: "danger",
  Refunded: "muted",
};

export const statusTone = (status) => TONE[status] || "muted";

// Totals are NUMBERS, not "$248.00" strings. A string sorts lexically, so the
// grid would put $89.90 above $612.40 and be quietly wrong; formatting is the
// cell's job and comparison is the value's.
export const ORDERS = [
  {
    id: "ORD-7741", customer: "Hala Ibrahim", email: "hala@example.com", items: 3, total: 248.0,
    payment: "Card", status: "Delivered", date: "28 Mar 2026",
    stamps: ["28 Mar · 09:12", "28 Mar · 09:13", "28 Mar · 14:40", "29 Mar · 08:05", "31 Mar · 11:22"],
    address: ["Al Olaya District, King Fahd Rd", "Riyadh 12214, Saudi Arabia"],
  },
  {
    id: "ORD-7740", customer: "Faisal Al-Harbi", email: "faisal@example.com", items: 1, total: 89.9,
    payment: "Card", status: "Shipped", date: "28 Mar 2026",
    stamps: ["28 Mar · 10:04", "28 Mar · 10:05", "28 Mar · 16:20", "29 Mar · 07:40"],
    address: ["Al Khobar Corniche", "Al Khobar 34413, Saudi Arabia"],
  },
  {
    id: "ORD-7739", customer: "Maya Tarek", email: "maya@example.com", items: 5, total: 612.4,
    payment: "Bank transfer", status: "Processing", date: "27 Mar 2026",
    stamps: ["27 Mar · 13:55", "27 Mar · 15:02"],
    address: ["Jeddah Corniche, Al Shatea", "Jeddah 23511, Saudi Arabia"],
  },
  {
    id: "ORD-7738", customer: "Bilal Rahman", email: "bilal@example.com", items: 2, total: 154.0,
    payment: "Card", status: "Cancelled", date: "27 Mar 2026",
    stamps: ["27 Mar · 08:31", "27 Mar · 08:32"],
    address: ["Prince Sultan Rd", "Riyadh 12331, Saudi Arabia"],
  },
  {
    id: "ORD-7737", customer: "Noor Al-Sayed", email: "noor@example.com", items: 4, total: 398.2,
    payment: "Card", status: "Delivered", date: "26 Mar 2026",
    stamps: ["24 Mar · 11:10", "24 Mar · 11:11", "24 Mar · 17:45", "25 Mar · 09:00", "26 Mar · 13:05"],
    address: ["Al Nakheel District", "Dammam 32241, Saudi Arabia"],
  },
  {
    id: "ORD-7736", customer: "Omar Nasser", email: "omar@example.com", items: 1, total: 180.0,
    payment: "Wallet", status: "Refunded", date: "25 Mar 2026",
    stamps: ["22 Mar · 19:40", "22 Mar · 19:41"],
    address: ["Al Malqa District", "Riyadh 13521, Saudi Arabia"],
  },
  {
    id: "ORD-7735", customer: "Sara Al-Otaibi", email: "sara@example.com", items: 6, total: 742.6,
    payment: "Card", status: "Delivered", date: "25 Mar 2026",
    stamps: ["23 Mar · 07:22", "23 Mar · 07:23", "23 Mar · 12:10", "24 Mar · 08:15", "25 Mar · 10:48"],
    address: ["Madinah Rd, Al Rawdah", "Jeddah 23434, Saudi Arabia"],
  },
];
