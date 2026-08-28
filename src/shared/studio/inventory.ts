import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// INVENTORY — items, stock, vendors, sheets, orders, deliveries and waybills.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  accessInventoryStudio: string;
  add: string;
  addAirline: string;
  addItem: string;
  addType: string;
  addVendor: string;
  adjust: string;
  airline3DigitPrefix: string;
  airlineCodeNumber: string;
  airlineName: string;
  airlineRegistry: string;
  awbNumber: string;
  awbTracking: string;
  belowReorder: string;
  belowReorderItems: string;
  belowReorderLevel: string;
  cancel: string;
  carrier: string;
  catalogueEntryWhatThing: string;
  chooseImageFile: string;
  close: string;
  commaNewlineSeparated: string;
  committedOrderedPartlyReceived: string;
  consignment: string;
  contact: string;
  couldnUploadImage: string;
  currency: string;
  customsCharges: string;
  dashboardIsnYoursSee: string;
  delete: string;
  eGStockTake: string;
  edit: string;
  email: string;
  everyReceiptIssueAdjustment: string;
  flight: string;
  for: string;
  hand: string;
  handAgainstLevelShould: string;
  handQuantityValuedUnit: string;
  handWouldBecome: string;
  iataCode: string;
  image: string;
  imagesMust500Kb: string;
  item: string;
  itemTypes: string;
  itemVendorSerial: string;
  latestLedger: string;
  loadingInventory: string;
  loadingItems: string;
  low: string;
  name: string;
  nameSkuModelVendor: string;
  noAirlinesYetWaybill: string;
  noItemsMatchSearch: string;
  noPurchaseOrdersYet: string;
  noServiceActionsYet: string;
  noStockMovementsYet: string;
  noStockMovementsYet2: string;
  noStockValueYet: string;
  noVendorsYet: string;
  noneYet: string;
  notMovedYet: string;
  note: string;
  notes: string;
  nothingAir: string;
  nothingBelowReorderLevel: string;
  nothingMatchesSearch: string;
  nothingOrderedYet: string;
  nothingOutstandingOrder: string;
  nothingRecordedYet: string;
  nothingRegisteredYet: string;
  nothingStockYet: string;
  open: string;
  openCarrierOwnTracking: string;
  openProject: string;
  openPurchaseOrders: string;
  orderStatusBreakdown: string;
  outstandingOrder: string;
  outstandingOrderValue: string;
  pasteWaybillNumberAbove: string;
  phone: string;
  prefix3Digits: string;
  prefix8Digits: string;
  prefixNameIata: string;
  projectSheets: string;
  projectSheets2: string;
  purchaseOrdersStatus: string;
  quantity: string;
  reason: string;
  recentMovements: string;
  recentStockMovements: string;
  recordMilestone: string;
  registerItemsFirstThen: string;
  registerThingsBuyQuantities: string;
  registeredItems: string;
  registeredItems2: string;
  remove: string;
  reorderLevel: string;
  route: string;
  scope: string;
  search: string;
  sections: string;
  serial: string;
  serials: string;
  shippingCharges: string;
  spendVendor: string;
  station: string;
  status: string;
  stockManagement: string;
  stockValue: string;
  stockValueVendor: string;
  stopTracking: string;
  studio: string;
  studioKeepsModuleDashboards: string;
  supplies: string;
  theyDisagreeStockMoved: string;
  timeline: string;
  trackingUrlTemplate: string;
  type: string;
  unitCost: string;
  valueStillExpectedArrive: string;
  vendor: string;
  vendors: string;
  vendorsWhoBuyItems: string;
  viewOnly: string;
  weeks: string;
  whatVendorSuppliesHow: string;
  when: string;
  whereEveryOrderStands: string;
  whichUnitsHeldHand: string;
  whoBuyWhatThey: string;
};

const en: Strings = {
  ...commonEn,
  accessInventoryStudio: "You don't have access to Inventory in this studio.",
  add: "Add",
  addAirline: "Add airline",
  addItem: "Add item",
  addType: "Add type",
  addVendor: "Add vendor",
  adjust: "Adjust",
  airline3DigitPrefix: "The airline's 3-digit prefix",
  airlineCodeNumber: "Airline code + number",
  airlineName: "Airline name",
  airlineRegistry: "Airline registry",
  awbNumber: "AWB number",
  awbTracking: "AWB Tracking",
  belowReorder: "Below reorder",
  belowReorderItems: "Below-reorder items",
  belowReorderLevel: "Below reorder level",
  cancel: "Cancel",
  carrier: "Carrier",
  catalogueEntryWhatThing: "The catalogue entry — what this thing is and who supplies it. Quantities live in Stock Management.",
  chooseImageFile: "Choose an image file.",
  close: "Close",
  commaNewlineSeparated: "Comma or newline separated",
  committedOrderedPartlyReceived: "Committed on ordered, partly-received and received POs",
  consignment: "Consignment",
  contact: "Contact",
  couldnUploadImage: "We couldn't upload that image.",
  currency: "Currency",
  customsCharges: "Customs charges",
  dashboardIsnYoursSee: "The dashboard isn't yours to see",
  delete: "Delete",
  eGStockTake: "e.g. stock-take correction",
  edit: "Edit",
  email: "Email",
  everyReceiptIssueAdjustment: "Every receipt, issue and adjustment lands here — this ledger is where on-hand quantities come from.",
  flight: "Flight",
  for: "For",
  hand: "On hand",
  handAgainstLevelShould: "On hand against the level it should sit at",
  handQuantityValuedUnit: "On-hand quantity valued at unit cost",
  handWouldBecome: "On hand would become",
  iataCode: "IATA code",
  image: "Image",
  imagesMust500Kb: "Images must be 500 KB or smaller.",
  item: "Item",
  itemTypes: "Item types",
  itemVendorSerial: "Item, vendor or serial",
  latestLedger: "The latest of the ledger",
  loadingInventory: "Loading Inventory…",
  loadingItems: "Loading items",
  low: "Low",
  name: "Name",
  nameSkuModelVendor: "Name, SKU, model or vendor",
  noAirlinesYetWaybill: "No airlines yet. A waybill still tracks without one — it just shows the bare prefix.",
  noItemsMatchSearch: "No items match that search.",
  noPurchaseOrdersYet: "No purchase orders yet.",
  noServiceActionsYet: "No service actions yet — add them in Studio Settings.",
  noStockMovementsYet: "No stock movements yet",
  noStockMovementsYet2: "No stock movements yet.",
  noStockValueYet: "No stock value yet.",
  noVendorsYet: "No vendors yet",
  noneYet: "None yet.",
  notMovedYet: "Not moved yet",
  note: "Note",
  notes: "Notes",
  nothingAir: "Nothing in the air",
  nothingBelowReorderLevel: "Nothing below reorder level.",
  nothingMatchesSearch: "Nothing matches that search.",
  nothingOrderedYet: "Nothing ordered yet.",
  nothingOutstandingOrder: "Nothing outstanding on order.",
  nothingRecordedYet: "Nothing recorded yet.",
  nothingRegisteredYet: "Nothing registered yet",
  nothingStockYet: "Nothing in stock yet",
  open: "Open",
  openCarrierOwnTracking: "Open the carrier's own tracking page",
  openProject: "Open the project",
  openPurchaseOrders: "Open purchase orders",
  orderStatusBreakdown: "Order status breakdown",
  outstandingOrder: "Outstanding on order",
  outstandingOrderValue: "Outstanding order value",
  pasteWaybillNumberAbove: "Paste a waybill number above to start following a shipment. Its milestones build up as they are recorded.",
  phone: "Phone",
  prefix3Digits: "Prefix (3 digits)",
  prefix8Digits: "Prefix + 8 digits",
  prefixNameIata: "Prefix, name or IATA",
  projectSheets: "to project sheets",
  projectSheets2: "Project Sheets",
  purchaseOrdersStatus: "Purchase orders by status",
  quantity: "Quantity",
  reason: "Reason",
  recentMovements: "Recent movements",
  recentStockMovements: "Recent stock movements",
  recordMilestone: "Record a milestone",
  registerItemsFirstThen: "Register items first, then receive an order against them — that is what brings stock in.",
  registerThingsBuyQuantities: "Register the things you buy. Quantities come from receiving orders and issuing deliveries.",
  registeredItems: "Registered items",
  registeredItems2: "Registered Items",
  remove: "Remove",
  reorderLevel: "Reorder level",
  route: "Route",
  scope: "Scope",
  search: "Search",
  sections: "Sections",
  serial: "Serial(s)",
  serials: "Serials",
  shippingCharges: "Shipping charges",
  spendVendor: "Spend by vendor",
  station: "Station",
  status: "Status",
  stockManagement: "Stock Management",
  stockValue: "Stock value",
  stockValueVendor: "Stock value by vendor",
  stopTracking: "Stop tracking",
  studio: "Studio",
  studioKeepsModuleDashboards: "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  supplies: "Supplies",
  theyDisagreeStockMoved: "They disagree — stock has moved without its serial being noted.",
  timeline: "Timeline",
  trackingUrlTemplate: "Tracking URL template",
  type: "Type",
  unitCost: "Unit cost",
  valueStillExpectedArrive: "Value still expected to arrive, by order",
  vendor: "Vendor",
  vendors: "Vendors",
  vendorsWhoBuyItems: "Vendors are who you buy from. Items and orders point at them.",
  viewOnly: "View only",
  weeks: "Weeks",
  whatVendorSuppliesHow: "What this vendor supplies, and how long each kind takes. An item picking a type takes the estimate with it.",
  when: "When",
  whereEveryOrderStands: "Where every order stands",
  whichUnitsHeldHand: "Which units are held. On-hand still comes from the ledger; this records the individual pieces behind it.",
  whoBuyWhatThey: "Who you buy from, and what they supply — the item types here are what an item picks its delivery estimate from.",
};

const ar: Strings = {
  ...commonAr,
  accessInventoryStudio: /* TR */ "You don't have access to Inventory in this studio.",
  add: /* TR */ "Add",
  addAirline: /* TR */ "Add airline",
  addItem: /* TR */ "Add item",
  addType: /* TR */ "Add type",
  addVendor: /* TR */ "Add vendor",
  adjust: /* TR */ "Adjust",
  airline3DigitPrefix: /* TR */ "The airline's 3-digit prefix",
  airlineCodeNumber: /* TR */ "Airline code + number",
  airlineName: /* TR */ "Airline name",
  airlineRegistry: /* TR */ "Airline registry",
  awbNumber: /* TR */ "AWB number",
  awbTracking: /* TR */ "AWB Tracking",
  belowReorder: /* TR */ "Below reorder",
  belowReorderItems: /* TR */ "Below-reorder items",
  belowReorderLevel: /* TR */ "Below reorder level",
  cancel: /* TR */ "Cancel",
  carrier: /* TR */ "Carrier",
  catalogueEntryWhatThing: /* TR */ "The catalogue entry — what this thing is and who supplies it. Quantities live in Stock Management.",
  chooseImageFile: /* TR */ "Choose an image file.",
  close: /* TR */ "Close",
  commaNewlineSeparated: /* TR */ "Comma or newline separated",
  committedOrderedPartlyReceived: /* TR */ "Committed on ordered, partly-received and received POs",
  consignment: /* TR */ "Consignment",
  contact: /* TR */ "Contact",
  couldnUploadImage: /* TR */ "We couldn't upload that image.",
  currency: /* TR */ "Currency",
  customsCharges: /* TR */ "Customs charges",
  dashboardIsnYoursSee: /* TR */ "The dashboard isn't yours to see",
  delete: /* TR */ "Delete",
  eGStockTake: /* TR */ "e.g. stock-take correction",
  edit: /* TR */ "Edit",
  email: /* TR */ "Email",
  everyReceiptIssueAdjustment: /* TR */ "Every receipt, issue and adjustment lands here — this ledger is where on-hand quantities come from.",
  flight: /* TR */ "Flight",
  for: /* TR */ "For",
  hand: /* TR */ "On hand",
  handAgainstLevelShould: /* TR */ "On hand against the level it should sit at",
  handQuantityValuedUnit: /* TR */ "On-hand quantity valued at unit cost",
  handWouldBecome: /* TR */ "On hand would become",
  iataCode: /* TR */ "IATA code",
  image: /* TR */ "Image",
  imagesMust500Kb: /* TR */ "Images must be 500 KB or smaller.",
  item: /* TR */ "Item",
  itemTypes: /* TR */ "Item types",
  itemVendorSerial: /* TR */ "Item, vendor or serial",
  latestLedger: /* TR */ "The latest of the ledger",
  loadingInventory: /* TR */ "Loading Inventory…",
  loadingItems: /* TR */ "Loading items",
  low: /* TR */ "Low",
  name: /* TR */ "Name",
  nameSkuModelVendor: /* TR */ "Name, SKU, model or vendor",
  noAirlinesYetWaybill: /* TR */ "No airlines yet. A waybill still tracks without one — it just shows the bare prefix.",
  noItemsMatchSearch: /* TR */ "No items match that search.",
  noPurchaseOrdersYet: /* TR */ "No purchase orders yet.",
  noServiceActionsYet: /* TR */ "No service actions yet — add them in Studio Settings.",
  noStockMovementsYet: /* TR */ "No stock movements yet",
  noStockMovementsYet2: /* TR */ "No stock movements yet.",
  noStockValueYet: /* TR */ "No stock value yet.",
  noVendorsYet: /* TR */ "No vendors yet",
  noneYet: /* TR */ "None yet.",
  notMovedYet: /* TR */ "Not moved yet",
  note: /* TR */ "Note",
  notes: /* TR */ "Notes",
  nothingAir: /* TR */ "Nothing in the air",
  nothingBelowReorderLevel: /* TR */ "Nothing below reorder level.",
  nothingMatchesSearch: /* TR */ "Nothing matches that search.",
  nothingOrderedYet: /* TR */ "Nothing ordered yet.",
  nothingOutstandingOrder: /* TR */ "Nothing outstanding on order.",
  nothingRecordedYet: /* TR */ "Nothing recorded yet.",
  nothingRegisteredYet: /* TR */ "Nothing registered yet",
  nothingStockYet: /* TR */ "Nothing in stock yet",
  open: /* TR */ "Open",
  openCarrierOwnTracking: /* TR */ "Open the carrier's own tracking page",
  openProject: /* TR */ "Open the project",
  openPurchaseOrders: /* TR */ "Open purchase orders",
  orderStatusBreakdown: /* TR */ "Order status breakdown",
  outstandingOrder: /* TR */ "Outstanding on order",
  outstandingOrderValue: /* TR */ "Outstanding order value",
  pasteWaybillNumberAbove: /* TR */ "Paste a waybill number above to start following a shipment. Its milestones build up as they are recorded.",
  phone: /* TR */ "Phone",
  prefix3Digits: /* TR */ "Prefix (3 digits)",
  prefix8Digits: /* TR */ "Prefix + 8 digits",
  prefixNameIata: /* TR */ "Prefix, name or IATA",
  projectSheets: /* TR */ "to project sheets",
  projectSheets2: /* TR */ "Project Sheets",
  purchaseOrdersStatus: /* TR */ "Purchase orders by status",
  quantity: /* TR */ "Quantity",
  reason: /* TR */ "Reason",
  recentMovements: /* TR */ "Recent movements",
  recentStockMovements: /* TR */ "Recent stock movements",
  recordMilestone: /* TR */ "Record a milestone",
  registerItemsFirstThen: /* TR */ "Register items first, then receive an order against them — that is what brings stock in.",
  registerThingsBuyQuantities: /* TR */ "Register the things you buy. Quantities come from receiving orders and issuing deliveries.",
  registeredItems: /* TR */ "Registered items",
  registeredItems2: /* TR */ "Registered Items",
  remove: /* TR */ "Remove",
  reorderLevel: /* TR */ "Reorder level",
  route: /* TR */ "Route",
  scope: /* TR */ "Scope",
  search: /* TR */ "Search",
  sections: /* TR */ "Sections",
  serial: /* TR */ "Serial(s)",
  serials: /* TR */ "Serials",
  shippingCharges: /* TR */ "Shipping charges",
  spendVendor: /* TR */ "Spend by vendor",
  station: /* TR */ "Station",
  status: /* TR */ "Status",
  stockManagement: /* TR */ "Stock Management",
  stockValue: /* TR */ "Stock value",
  stockValueVendor: /* TR */ "Stock value by vendor",
  stopTracking: /* TR */ "Stop tracking",
  studio: /* TR */ "Studio",
  studioKeepsModuleDashboards: /* TR */ "This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar.",
  supplies: /* TR */ "Supplies",
  theyDisagreeStockMoved: /* TR */ "They disagree — stock has moved without its serial being noted.",
  timeline: /* TR */ "Timeline",
  trackingUrlTemplate: /* TR */ "Tracking URL template",
  type: /* TR */ "Type",
  unitCost: /* TR */ "Unit cost",
  valueStillExpectedArrive: /* TR */ "Value still expected to arrive, by order",
  vendor: /* TR */ "Vendor",
  vendors: /* TR */ "Vendors",
  vendorsWhoBuyItems: /* TR */ "Vendors are who you buy from. Items and orders point at them.",
  viewOnly: /* TR */ "View only",
  weeks: /* TR */ "Weeks",
  whatVendorSuppliesHow: /* TR */ "What this vendor supplies, and how long each kind takes. An item picking a type takes the estimate with it.",
  when: /* TR */ "When",
  whereEveryOrderStands: /* TR */ "Where every order stands",
  whichUnitsHeldHand: /* TR */ "Which units are held. On-hand still comes from the ledger; this records the individual pieces behind it.",
  whoBuyWhatThey: /* TR */ "Who you buy from, and what they supply — the item types here are what an item picks its delivery estimate from.",
};

const inventory = { en, ar };

export function inventoryDict(locale: string): Strings {
  return inventory[locale as Locale] || inventory[defaultLocale];
}
