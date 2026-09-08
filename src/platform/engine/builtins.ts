// THE TYPES EVERY STUDIO GETS, seeded at creation.
//
// PHASE 1 SHIPPED ONE, deliberately — the engine's value proven by a type that
// is real rather than by a demonstration. PHASE 2 IS THESE TWO, and they are
// here to answer a question one type could not: whether the DECLARATION is
// general, or whether it was quietly shaped around transmittals.
//
// It was not, and the two below are the evidence rather than the claim. A
// transmittal is a three-status line with four plain fields. An RFI needs a
// SELECT — ball-in-court is which party owes the next move, which is a closed
// list and not free text — and a submittal needs a SIX-status ladder that
// BRANCHES, where a review can approve, approve with comments, or send the
// thing back. Neither needed a new field kind, a new verb or a line of engine
// code: they are rows.
//
// `origin: "builtin"` is what stops a studio editing them. Tenant-declared types
// come in phase 3 and are not this.
import { repo } from "@/platform/db/repo";
import { getSectionByKey } from "@/platform/db/sections";
import { engineSectionKey } from "@/platform/access";
import { plantTypeSection } from "./sections";
import type { RecordType } from "./schema";

export const BUILTIN_TYPES = [
  {
    key: "transmittal",
    label: "Transmittals",
    parentSectionKey: "engineering-docs",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "recipient", label: "Recipient", kind: "text" },
      { key: "issuedOn", label: "Issued", kind: "date" },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["title", "recipient", "issuedOn"],
    statuses: ["Draft", "Issued", "Acknowledged"],
    transitions: [
      { from: "Draft", to: "Issued" },
      { from: "Issued", to: "Acknowledged" },
    ],
    version: 1,
  },
  {
    // BALL-IN-COURT IS A PARTY, NOT A PERSON, which is why it is a select and
    // not the `collaborator` kind. The question an RFI register answers is
    // "whose move is it" — ours, the client's, the consultant's — and that
    // survives the individual who happens to be handling it this week. It also
    // renders as a real dropdown, where `collaborator` is an honest text box in
    // phase 1 with no picker behind it.
    key: "rfi",
    label: "RFIs",
    parentSectionKey: "engineering-docs",
    fields: [
      { key: "subject", label: "Subject", kind: "text", required: true },
      { key: "question", label: "Question", kind: "longtext", required: true },
      {
        key: "ballInCourt", label: "Ball in court", kind: "select",
        options: ["Us", "Client", "Consultant", "Contractor", "Subcontractor"],
      },
      {
        key: "discipline", label: "Discipline", kind: "select",
        options: ["Architectural", "Structural", "Mechanical", "Electrical", "Civil", "Other"],
      },
      { key: "raisedOn", label: "Raised", kind: "date" },
      { key: "neededBy", label: "Needed by", kind: "date" },
      { key: "answer", label: "Answer", kind: "longtext" },
    ],
    columns: ["subject", "ballInCourt", "neededBy"],
    // ANSWERED IS NOT CLOSED. An answer arrives and somebody still has to accept
    // it — closing on the answer would lose the step where the asker agrees the
    // question was actually addressed.
    statuses: ["Open", "Answered", "Closed"],
    transitions: [
      { from: "Open", to: "Answered" },
      { from: "Answered", to: "Closed" },
      // WITHDRAWN WITHOUT AN ANSWER IS REAL: the question stopped mattering, or
      // it was asked twice. Refusing it would leave the register full of open
      // RFIs nobody is waiting on.
      { from: "Open", to: "Closed" },
      // AND AN ANSWER CAN BE REJECTED, which is the move a register without it
      // forces people to make by raising a second RFI that loses the thread.
      { from: "Answered", to: "Open" },
    ],
    version: 1,
  },
  {
    key: "submittal",
    label: "Submittals",
    parentSectionKey: "engineering-docs",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "specSection", label: "Specification section", kind: "text" },
      {
        key: "kind", label: "Kind", kind: "select",
        options: ["Product data", "Shop drawing", "Sample", "Method statement", "Calculation"],
      },
      { key: "submittedBy", label: "Submitted by", kind: "text" },
      { key: "submittedOn", label: "Submitted", kind: "date" },
      { key: "dueOn", label: "Response due", kind: "date" },
      { key: "comments", label: "Review comments", kind: "longtext" },
    ],
    columns: ["title", "kind", "dueOn"],
    // THE REAL LADDER, AND IT BRANCHES — which is the half of the engine one
    // type never exercised. A review has three outcomes, not one: approved,
    // approved with comments to carry into the work, or sent back. Collapsing
    // "Approved as noted" into "Approved" would lose the comments' standing, and
    // collapsing "Revise and resubmit" into a rejection would lose that the
    // thing is coming back.
    statuses: [
      "Draft", "Submitted", "Under review",
      "Approved", "Approved as noted", "Revise and resubmit",
    ],
    transitions: [
      { from: "Draft", to: "Submitted" },
      { from: "Submitted", to: "Under review" },
      { from: "Under review", to: "Approved" },
      { from: "Under review", to: "Approved as noted" },
      { from: "Under review", to: "Revise and resubmit" },
      // AND BACK ROUND. A resubmission is the same submittal again, not a new
      // one: starting a fresh record each time is how a spec section ends up
      // with four submittals and no way to see it took four goes.
      { from: "Revise and resubmit", to: "Submitted" },
    ],
    version: 1,
  },
  {
    // VERIFIED IS NOT CLOSED. Agreeing a corrective action and proving it
    // worked are two events, and a register that collapses them cannot answer
    // the only question an auditor asks: did the fix hold. The short path
    // Investigating -> Closed is the finding that turns out not to be one.
    key: "ncr",
    label: "NCRs and CAPAs",
    parentSectionKey: "quality-hse",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "description", label: "What was found", kind: "longtext", required: true },
      { key: "severity", label: "Severity", kind: "select", options: ["Minor", "Major", "Critical"] },
      { key: "raisedOn", label: "Raised", kind: "date" },
      { key: "rootCause", label: "Root cause", kind: "longtext" },
      { key: "correctiveAction", label: "Corrective action", kind: "longtext" },
      { key: "dueBy", label: "Action due", kind: "date" },
    ],
    columns: ["title", "severity", "dueBy"],
    statuses: ["Open", "Investigating", "Action agreed", "Verified", "Closed"],
    transitions: [
      { from: "Open", to: "Investigating" },
      { from: "Investigating", to: "Action agreed" },
      { from: "Action agreed", to: "Verified" },
      { from: "Verified", to: "Closed" },
      { from: "Investigating", to: "Closed" },
    ],
    version: 1,
  },
  {
    key: "audit",
    label: "Audits",
    parentSectionKey: "quality-hse",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "scope", label: "Scope", kind: "longtext" },
      { key: "auditor", label: "Auditor", kind: "text" },
      { key: "standard", label: "Standard", kind: "select", options: ["ISO 9001", "ISO 14001", "ISO 45001", "Internal", "Client", "Other"] },
      { key: "plannedOn", label: "Planned", kind: "date" },
      { key: "findings", label: "Findings", kind: "longtext" },
    ],
    columns: ["title", "standard", "plannedOn"],
    statuses: ["Planned", "In progress", "Reported", "Closed"],
    transitions: [
      { from: "Planned", to: "In progress" },
      { from: "In progress", to: "Reported" },
      { from: "Reported", to: "Closed" },
      { from: "Planned", to: "Closed" },
    ],
    version: 1,
  },
  {
    // `daysLost` IS A NUMBER AND THEREFORE NULLABLE, which is what makes an
    // LTIFR possible later: nought days lost and nobody having said yet are
    // different facts, and a rate computed over the second as though it were
    // the first understates exactly what the rate exists to expose.
    key: "incident",
    label: "HSE incidents",
    parentSectionKey: "quality-hse",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "happenedOn", label: "Date", kind: "date", required: true },
      { key: "kind", label: "Kind", kind: "select", options: ["Near miss", "First aid", "Medical treatment", "Lost time", "Environmental", "Property damage"] },
      { key: "daysLost", label: "Days lost", kind: "number" },
      { key: "description", label: "What happened", kind: "longtext", required: true },
      { key: "immediateAction", label: "Immediate action", kind: "longtext" },
    ],
    columns: ["title", "kind", "happenedOn"],
    statuses: ["Reported", "Investigating", "Closed"],
    transitions: [
      { from: "Reported", to: "Investigating" },
      { from: "Investigating", to: "Closed" },
    ],
    version: 1,
  },
  {
    // A PERMIT IS CANCELLED, NEVER DELETED. It is the record that work was
    // authorised on a particular day, and the day something goes wrong is the
    // day somebody asks to see it.
    key: "permit",
    label: "Permits to work",
    parentSectionKey: "quality-hse",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "kind", label: "Kind", kind: "select", options: ["Hot work", "Confined space", "Working at height", "Excavation", "Electrical", "Lifting"] },
      { key: "location", label: "Location", kind: "text" },
      { key: "validFrom", label: "Valid from", kind: "date" },
      { key: "validTo", label: "Valid to", kind: "date" },
      { key: "precautions", label: "Precautions", kind: "longtext" },
    ],
    columns: ["title", "kind", "validTo"],
    statuses: ["Requested", "Issued", "Closed", "Cancelled"],
    transitions: [
      { from: "Requested", to: "Issued" },
      { from: "Issued", to: "Closed" },
      { from: "Requested", to: "Cancelled" },
      { from: "Issued", to: "Cancelled" },
    ],
    version: 1,
  },
  {
    key: "toolbox",
    label: "Toolbox talks",
    parentSectionKey: "quality-hse",
    fields: [
      { key: "topic", label: "Topic", kind: "text", required: true },
      { key: "heldOn", label: "Held", kind: "date" },
      { key: "presenter", label: "Presenter", kind: "text" },
      { key: "attendees", label: "Attendees", kind: "number" },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["topic", "heldOn", "attendees"],
    statuses: ["Planned", "Held"],
    transitions: [
      { from: "Planned", to: "Held" },
    ],
    version: 1,
  },
  {
    // THE HIRE RATE LIVES ON THE ASSET because it is what the studio charges
    // ITSELF to put this machine on a job. Nothing consumes it yet — charging
    // a deal for utilisation is its own slice — and it is stored now so the
    // register does not have to be rebuilt when that lands.
    key: "equipment",
    label: "Equipment register",
    parentSectionKey: "assets",
    fields: [
      { key: "name", label: "Name", kind: "text", required: true },
      { key: "assetTag", label: "Asset tag", kind: "text" },
      { key: "category", label: "Category", kind: "select", options: ["Plant", "Vehicle", "Tool", "IT", "Instrument", "Other"] },
      { key: "serial", label: "Serial", kind: "text" },
      { key: "acquiredOn", label: "Acquired", kind: "date" },
      { key: "hireRate", label: "Internal hire rate", kind: "money" },
      { key: "location", label: "Location", kind: "text" },
    ],
    columns: ["name", "assetTag", "category"],
    statuses: ["In service", "Under repair", "Idle", "Disposed"],
    transitions: [
      { from: "In service", to: "Under repair" },
      { from: "Under repair", to: "In service" },
      { from: "In service", to: "Idle" },
      { from: "Idle", to: "In service" },
      { from: "Idle", to: "Disposed" },
      { from: "Under repair", to: "Disposed" },
    ],
    version: 1,
  },
  {
    key: "maintenance",
    label: "Maintenance",
    parentSectionKey: "assets",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "assetTag", label: "Asset tag", kind: "text" },
      { key: "kind", label: "Kind", kind: "select", options: ["Preventive", "Corrective", "Inspection"] },
      { key: "dueOn", label: "Due", kind: "date" },
      { key: "completedOn", label: "Completed", kind: "date" },
      { key: "cost", label: "Cost", kind: "money" },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["title", "kind", "dueOn"],
    statuses: ["Due", "In progress", "Done", "Skipped"],
    transitions: [
      { from: "Due", to: "In progress" },
      { from: "In progress", to: "Done" },
      { from: "Due", to: "Skipped" },
    ],
    version: 1,
  },
  {
    // EXPIRED RETURNS TO VALID because an instrument is RECALIBRATED rather
    // than replaced: the certificate number changes and the instrument does
    // not, so a fresh row each time would lose the history that proves it has
    // been in calibration all along.
    key: "calibration",
    label: "Calibration",
    parentSectionKey: "assets",
    fields: [
      { key: "instrument", label: "Instrument", kind: "text", required: true },
      { key: "assetTag", label: "Asset tag", kind: "text" },
      { key: "certificate", label: "Certificate", kind: "text" },
      { key: "calibratedOn", label: "Calibrated", kind: "date" },
      { key: "dueOn", label: "Next due", kind: "date" },
      { key: "issuedBy", label: "Calibrated by", kind: "text" },
    ],
    columns: ["instrument", "certificate", "dueOn"],
    statuses: ["Valid", "Due", "Expired", "Withdrawn"],
    transitions: [
      { from: "Valid", to: "Due" },
      { from: "Due", to: "Valid" },
      { from: "Due", to: "Expired" },
      { from: "Expired", to: "Valid" },
      { from: "Valid", to: "Withdrawn" },
    ],
    version: 1,
  },
  {
    // ON SITE GOES BACK TO SCHEDULED, which is the move a service register
    // without field experience leaves out: an engineer attends, cannot finish
    // for want of a part, and the job is neither completed nor cancelled. With
    // no way back it gets closed falsely, and the second visit is invisible.
    key: "job",
    label: "Service orders",
    parentSectionKey: "field-service",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "customer", label: "Customer", kind: "text" },
      { key: "site", label: "Site", kind: "text" },
      { key: "priority", label: "Priority", kind: "select", options: ["Low", "Normal", "High", "Emergency"] },
      { key: "reportedOn", label: "Reported", kind: "date" },
      { key: "dueBy", label: "Due by", kind: "date" },
      { key: "fault", label: "Reported fault", kind: "longtext", required: true },
      { key: "workDone", label: "Work done", kind: "longtext" },
    ],
    columns: ["title", "priority", "dueBy"],
    statuses: ["Logged", "Scheduled", "On site", "Completed", "Cancelled"],
    transitions: [
      { from: "Logged", to: "Scheduled" },
      { from: "Scheduled", to: "On site" },
      { from: "On site", to: "Completed" },
      { from: "Logged", to: "Cancelled" },
      { from: "Scheduled", to: "Cancelled" },
      { from: "On site", to: "Scheduled" },
    ],
    version: 1,
  },
  {
    // EXPIRED RETURNS TO ACTIVE because a maintenance contract is RENEWED, and
    // the customer, the site and the visit history are the same agreement. A
    // fresh record each year would scatter one relationship across five rows.
    key: "contract",
    label: "Maintenance contracts",
    parentSectionKey: "field-service",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "customer", label: "Customer", kind: "text" },
      { key: "cover", label: "Cover", kind: "select", options: ["Parts and labour", "Labour only", "Inspection only", "Full cover"] },
      { key: "startsOn", label: "Starts", kind: "date" },
      { key: "endsOn", label: "Ends", kind: "date" },
      { key: "visitsPerYear", label: "Visits per year", kind: "number" },
      { key: "value", label: "Annual value", kind: "money" },
    ],
    columns: ["title", "cover", "endsOn"],
    statuses: ["Draft", "Active", "Expired", "Cancelled"],
    transitions: [
      { from: "Draft", to: "Active" },
      { from: "Active", to: "Expired" },
      { from: "Expired", to: "Active" },
      { from: "Active", to: "Cancelled" },
    ],
    version: 1,
  },
  {
    // A PLAN IS A SCHEDULE, NOT A JOB. It says what should happen and how
    // often; each occurrence is a service order. Nothing generates those yet —
    // named in the functionality file rather than implied by the register.
    key: "planned",
    label: "Preventive maintenance plans",
    parentSectionKey: "field-service",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "asset", label: "Asset or site", kind: "text" },
      { key: "frequency", label: "Frequency", kind: "select", options: ["Weekly", "Monthly", "Quarterly", "Half-yearly", "Yearly"] },
      { key: "nextDue", label: "Next due", kind: "date" },
      { key: "lastDone", label: "Last done", kind: "date" },
      { key: "tasks", label: "Tasks", kind: "longtext" },
    ],
    columns: ["title", "frequency", "nextDue"],
    statuses: ["Active", "Paused", "Retired"],
    transitions: [
      { from: "Active", to: "Paused" },
      { from: "Paused", to: "Active" },
      { from: "Active", to: "Retired" },
    ],
    version: 1,
  },
  {
    key: "installed",
    label: "Installed base",
    parentSectionKey: "field-service",
    fields: [
      { key: "description", label: "Equipment", kind: "text", required: true },
      { key: "customer", label: "Customer", kind: "text" },
      { key: "site", label: "Site", kind: "text" },
      { key: "serial", label: "Serial", kind: "text" },
      { key: "installedOn", label: "Installed", kind: "date" },
      { key: "warrantyEndsOn", label: "Warranty ends", kind: "date" },
    ],
    columns: ["description", "customer", "warrantyEndsOn"],
    statuses: ["Installed", "Under warranty", "Out of warranty", "Removed"],
    transitions: [
      { from: "Installed", to: "Under warranty" },
      { from: "Under warranty", to: "Out of warranty" },
      { from: "Installed", to: "Out of warranty" },
      { from: "Out of warranty", to: "Removed" },
      { from: "Under warranty", to: "Removed" },
    ],
    version: 1,
  },
  {
    // A FAILED DELIVERY GOES BACK TO PLANNED, because the goods still have to
    // arrive — nobody was in, and that is a re-attempt rather than an ending.
    // `receivedBy` is the proof of delivery this section is named for; it is a
    // typed name and NOT a signature, which needs the mobile field view.
    key: "delivery",
    label: "Deliveries and POD",
    parentSectionKey: "logistics",
    fields: [
      { key: "reference", label: "Customer reference", kind: "text" },
      { key: "customer", label: "Customer", kind: "text" },
      { key: "address", label: "Delivery address", kind: "longtext" },
      { key: "promisedOn", label: "Promised", kind: "date" },
      { key: "deliveredOn", label: "Delivered", kind: "date" },
      { key: "receivedBy", label: "Received by", kind: "text" },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["reference", "customer", "promisedOn"],
    statuses: ["Planned", "Out for delivery", "Delivered", "Failed", "Returned"],
    transitions: [
      { from: "Planned", to: "Out for delivery" },
      { from: "Out for delivery", to: "Delivered" },
      { from: "Out for delivery", to: "Failed" },
      { from: "Failed", to: "Planned" },
      { from: "Delivered", to: "Returned" },
    ],
    version: 1,
  },
  {
    key: "trip",
    label: "Trips and routing",
    parentSectionKey: "logistics",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "driver", label: "Driver", kind: "text" },
      { key: "vehicle", label: "Vehicle", kind: "text" },
      { key: "departsOn", label: "Departs", kind: "date" },
      { key: "origin", label: "Origin", kind: "text" },
      { key: "destination", label: "Destination", kind: "text" },
      { key: "distanceKm", label: "Distance (km)", kind: "number" },
    ],
    columns: ["title", "driver", "departsOn"],
    statuses: ["Planned", "In progress", "Completed", "Cancelled"],
    transitions: [
      { from: "Planned", to: "In progress" },
      { from: "In progress", to: "Completed" },
      { from: "Planned", to: "Cancelled" },
    ],
    version: 1,
  },
  {
    // THE TWO EXPIRY DATES ARE THE COMPLIANCE HALF of this register, and they
    // are stored rather than computed: nothing warns before one lapses yet, so
    // a vehicle with expired insurance still reads In service. That is in the
    // functionality file's "Not built yet", not implied away here.
    key: "vehicle",
    label: "Fleet register",
    parentSectionKey: "logistics",
    fields: [
      { key: "plate", label: "Registration", kind: "text", required: true },
      { key: "kind", label: "Kind", kind: "select", options: ["Van", "Truck", "Pickup", "Car", "Trailer", "Plant"] },
      { key: "make", label: "Make and model", kind: "text" },
      { key: "insuranceEndsOn", label: "Insurance ends", kind: "date" },
      { key: "inspectionEndsOn", label: "Inspection ends", kind: "date" },
      { key: "odometerKm", label: "Odometer (km)", kind: "number" },
    ],
    columns: ["plate", "kind", "insuranceEndsOn"],
    statuses: ["In service", "Off road", "Sold"],
    transitions: [
      { from: "In service", to: "Off road" },
      { from: "Off road", to: "In service" },
      { from: "In service", to: "Sold" },
      { from: "Off road", to: "Sold" },
    ],
    version: 1,
  },
  {
    // IN PROGRESS GOES BACK TO RELEASED, the same move a service order has
    // and for the same reason: work starts, stalls for a part or a machine,
    // and is neither finished nor abandoned. Without the way back it gets
    // completed falsely, and the rest of the run is invisible.
    key: "workorder",
    label: "Work orders",
    parentSectionKey: "manufacturing",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "product", label: "Product", kind: "text" },
      { key: "quantity", label: "Quantity", kind: "number" },
      { key: "dueOn", label: "Due", kind: "date" },
      { key: "station", label: "Work station", kind: "text" },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["title", "quantity", "dueOn"],
    statuses: ["Planned", "Released", "In progress", "Completed", "Cancelled"],
    transitions: [
      { from: "Planned", to: "Released" },
      { from: "Released", to: "In progress" },
      { from: "In progress", to: "Completed" },
      { from: "Planned", to: "Cancelled" },
      { from: "Released", to: "Cancelled" },
      { from: "In progress", to: "Released" },
    ],
    version: 1,
  },
  {
    // COMPONENTS ARE ONE LONG TEXT FIELD AND THAT IS THE TRUTH, not a gap
    // covered over. A real BOM is a line table against Registered Items with
    // quantities that explode into a work order's material demand; the engine
    // has no line-table field kind, so this records what a person typed and
    // nothing consumes it. Said in the functionality file rather than implied
    // away by a field that looks structured and is not.
    //
    // SUPERSEDED IS ONE-WAY. A released BOM that has built something is what
    // was built against; reopening it would rewrite history that a warranty
    // claim or a recall is read from. The next revision is the next row.
    key: "bom",
    label: "Bills of materials",
    parentSectionKey: "manufacturing",
    fields: [
      { key: "product", label: "Product", kind: "text", required: true },
      { key: "revision", label: "Revision", kind: "text" },
      { key: "unit", label: "Unit", kind: "text" },
      { key: "components", label: "Components", kind: "longtext", required: true },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["product", "revision", "unit"],
    statuses: ["Draft", "Released", "Superseded"],
    transitions: [
      { from: "Draft", to: "Released" },
      { from: "Released", to: "Superseded" },
    ],
    version: 1,
  },
  {
    key: "station",
    label: "Work stations",
    parentSectionKey: "manufacturing",
    fields: [
      { key: "name", label: "Name", kind: "text", required: true },
      { key: "kind", label: "Kind", kind: "select", options: ["Machine", "Cell", "Line", "Bench", "Outsourced"] },
      { key: "capacityPerDay", label: "Capacity per day", kind: "number" },
      { key: "location", label: "Location", kind: "text" },
    ],
    columns: ["name", "kind", "capacityPerDay"],
    statuses: ["Available", "Down", "Retired"],
    transitions: [
      { from: "Available", to: "Down" },
      { from: "Down", to: "Available" },
      { from: "Available", to: "Retired" },
      { from: "Down", to: "Retired" },
    ],
    version: 1,
  },
  {
    // QUARANTINED SITS BETWEEN COMPLETE AND RELEASED because a batch that has
    // been made is not a batch that may be sold: something is held pending a
    // test, and it ends in release or in scrap. A register with only the happy
    // path forces the person holding a suspect batch to lie about its state.
    key: "batch",
    label: "Production batches",
    parentSectionKey: "manufacturing",
    fields: [
      { key: "reference", label: "Batch", kind: "text", required: true },
      { key: "product", label: "Product", kind: "text" },
      { key: "quantity", label: "Quantity made", kind: "number" },
      { key: "madeOn", label: "Made", kind: "date" },
      { key: "expiresOn", label: "Expires", kind: "date" },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["reference", "product", "madeOn"],
    statuses: ["Open", "Complete", "Quarantined", "Released", "Scrapped"],
    transitions: [
      { from: "Open", to: "Complete" },
      { from: "Complete", to: "Quarantined" },
      { from: "Complete", to: "Released" },
      { from: "Quarantined", to: "Released" },
      { from: "Quarantined", to: "Scrapped" },
      { from: "Open", to: "Scrapped" },
    ],
    version: 1,
  },
  {
    // REJECTED AND WITHDRAWN ARE BOTH ENDINGS AND THEY ARE NOT THE SAME.
    // One is the company's decision and one is the candidate's, and a
    // register that records only "closed" cannot tell a studio it keeps
    // losing people at the offer stage. Reachable from every open stage,
    // because both really do happen at any point.
    //
    // HIRED CREATES NO EMPLOYEE. Nothing here writes into HR's employee
    // register — that is a real handover with a real record behind it, and
    // it is named in the functionality file rather than implied away.
    key: "candidate",
    label: "Recruitment",
    parentSectionKey: "hr",
    fields: [
      { key: "name", label: "Candidate", kind: "text", required: true },
      { key: "role", label: "Applying for", kind: "text" },
      { key: "source", label: "Source", kind: "select", options: ["Referral", "Agency", "Job board", "Direct", "Internal"] },
      { key: "appliedOn", label: "Applied", kind: "date" },
      { key: "email", label: "Email", kind: "text" },
      { key: "phone", label: "Phone", kind: "text" },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["name", "role", "appliedOn"],
    statuses: ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected", "Withdrawn"],
    transitions: [
      { from: "Applied", to: "Screening" },
      { from: "Screening", to: "Interview" },
      { from: "Interview", to: "Offer" },
      { from: "Offer", to: "Hired" },
      { from: "Applied", to: "Rejected" },
      { from: "Screening", to: "Rejected" },
      { from: "Interview", to: "Rejected" },
      { from: "Offer", to: "Rejected" },
      { from: "Applied", to: "Withdrawn" },
      { from: "Screening", to: "Withdrawn" },
      { from: "Interview", to: "Withdrawn" },
      { from: "Offer", to: "Withdrawn" },
    ],
    version: 1,
  },
  {
    // MANAGER REVIEW GOES BACK TO SELF-ASSESSMENT, because a review handed
    // back for the employee to answer is the normal case rather than an
    // exception. Without the way back it gets shared unfinished.
    //
    // `rating` IS NULLABLE AND STAYS THAT WAY. An unrated review and a
    // review rated "meets expectations" are different facts, and defaulting
    // the first to the second is how an appraisal cycle reports itself
    // complete while half of it has not been done.
    key: "appraisal",
    label: "Performance reviews",
    parentSectionKey: "hr",
    fields: [
      { key: "employee", label: "Employee", kind: "text", required: true },
      { key: "period", label: "Period", kind: "text" },
      { key: "reviewer", label: "Reviewer", kind: "text" },
      { key: "dueOn", label: "Due", kind: "date" },
      { key: "rating", label: "Rating", kind: "select", options: ["Below expectations", "Meets expectations", "Exceeds expectations", "Outstanding"] },
      { key: "strengths", label: "Strengths", kind: "longtext" },
      { key: "development", label: "Development areas", kind: "longtext" },
      { key: "goals", label: "Goals for next period", kind: "longtext" },
    ],
    columns: ["employee", "period", "dueOn"],
    statuses: ["Draft", "Self-assessment", "Manager review", "Shared", "Closed"],
    transitions: [
      { from: "Draft", to: "Self-assessment" },
      { from: "Self-assessment", to: "Manager review" },
      { from: "Manager review", to: "Shared" },
      { from: "Shared", to: "Closed" },
      { from: "Manager review", to: "Self-assessment" },
    ],
    version: 1,
  },
  {
    // EXPIRED RETURNS TO COMPLETED, the calibration register's move for the
    // calibration register's reason: a safety ticket is RENEWED, the person
    // and the course are the same, and a fresh row each time loses the
    // history that proves they have been qualified throughout.
    //
    // NOTHING WARNS BEFORE `expiresOn` LAPSES. The date is stored and no
    // job reads it, so a lapsed ticket still reads Completed until somebody
    // moves it. In the functionality file's "Not built yet", not implied
    // away by a field that looks like a control and is not.
    key: "course",
    label: "Training and skills",
    parentSectionKey: "hr",
    fields: [
      { key: "title", label: "Course", kind: "text", required: true },
      { key: "employee", label: "Employee", kind: "text" },
      { key: "provider", label: "Provider", kind: "text" },
      { key: "kind", label: "Kind", kind: "select", options: ["Induction", "Safety", "Technical", "Compliance", "Soft skills"] },
      { key: "completedOn", label: "Completed", kind: "date" },
      { key: "expiresOn", label: "Expires", kind: "date" },
      { key: "certificate", label: "Certificate", kind: "text" },
    ],
    columns: ["title", "employee", "expiresOn"],
    statuses: ["Planned", "Booked", "Completed", "Expired", "Cancelled"],
    transitions: [
      { from: "Planned", to: "Booked" },
      { from: "Booked", to: "Completed" },
      { from: "Completed", to: "Expired" },
      { from: "Expired", to: "Completed" },
      { from: "Planned", to: "Cancelled" },
      { from: "Booked", to: "Cancelled" },
    ],
    version: 1,
  },
  {
    // REVIEW GOES BACK TO COUNTING, because a variance nobody believes is
    // recounted rather than adjusted — which is the whole control a
    // stocktake exists to be.
    //
    // AND `Adjusted` MOVES NO STOCK. This register records that a count
    // happened and what it found; the adjustment itself is Inventory's own
    // write and is NOT wired to this. Saying so here rather than letting a
    // status called Adjusted imply a movement that never happened.
    key: "stocktake",
    label: "Stocktakes",
    parentSectionKey: "inventory",
    fields: [
      { key: "reference", label: "Count", kind: "text", required: true },
      { key: "location", label: "Location", kind: "text" },
      { key: "countedOn", label: "Counted", kind: "date" },
      { key: "countedBy", label: "Counted by", kind: "text" },
      { key: "findings", label: "Variances found", kind: "longtext" },
      { key: "notes", label: "Notes", kind: "longtext" },
    ],
    columns: ["reference", "location", "countedOn"],
    statuses: ["Planned", "Counting", "Review", "Adjusted", "Cancelled"],
    transitions: [
      { from: "Planned", to: "Counting" },
      { from: "Counting", to: "Review" },
      { from: "Review", to: "Adjusted" },
      { from: "Review", to: "Counting" },
      { from: "Planned", to: "Cancelled" },
      { from: "Counting", to: "Cancelled" },
    ],
    version: 1,
  },
  {
    // A PLAN, NOT A RECORD. An ITP says what will be inspected and at which
    // hold points; what was actually found is a test report, which is the
    // register below. Collapsing the two is how a studio ends up unable to
    // answer the only question an auditor asks: not what you intended to
    // check, but what you checked and what it said.
    //
    // ISSUED GOES BACK TO DRAFT, because an ITP returned with comments is
    // the normal case. Approved does not: past that point it is superseded
    // by a new revision, the controlled-document rule.
    key: "itp",
    label: "Inspection and test plans",
    parentSectionKey: "quality-hse",
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "project", label: "Project", kind: "text" },
      { key: "discipline", label: "Discipline", kind: "select", options: ["Civil", "Structural", "Mechanical", "Electrical", "Instrumentation", "Architectural", "Other"] },
      { key: "revision", label: "Revision", kind: "text" },
      { key: "holdPoints", label: "Hold and witness points", kind: "longtext", required: true },
      { key: "acceptance", label: "Acceptance criteria", kind: "longtext" },
    ],
    columns: ["title", "discipline", "revision"],
    statuses: ["Draft", "Issued", "Approved", "Superseded"],
    transitions: [
      { from: "Draft", to: "Issued" },
      { from: "Issued", to: "Approved" },
      { from: "Issued", to: "Draft" },
      { from: "Approved", to: "Superseded" },
    ],
    version: 1,
  },
  {
    // `result` AND THE STATUS ARE DIFFERENT FACTS and both are kept. The
    // result is what the test said; the status is how far the paperwork has
    // got. A failed test that has been witnessed and rejected is a complete
    // record; a failed test nobody has signed off is an open problem, and a
    // register carrying only one of the two cannot tell them apart.
    //
    // REJECTED RETURNS TO OPEN, because the work is redone and re-tested
    // against the same reference. NOTHING RAISES AN NCR FROM A FAILURE —
    // that link is in the functionality file's "Not built yet", not
    // implied away by the two registers sitting beside each other.
    key: "testreport",
    label: "Inspection and test records",
    parentSectionKey: "quality-hse",
    fields: [
      { key: "reference", label: "Reference", kind: "text", required: true },
      { key: "itp", label: "Against ITP", kind: "text" },
      { key: "location", label: "Location or element", kind: "text" },
      { key: "inspectedOn", label: "Inspected", kind: "date" },
      { key: "inspector", label: "Inspector", kind: "text" },
      { key: "result", label: "Result", kind: "select", options: ["Pass", "Fail", "Pass with comment"] },
      { key: "findings", label: "Findings", kind: "longtext" },
    ],
    columns: ["reference", "inspectedOn", "result"],
    statuses: ["Open", "Witnessed", "Accepted", "Rejected"],
    transitions: [
      { from: "Open", to: "Witnessed" },
      { from: "Witnessed", to: "Accepted" },
      { from: "Witnessed", to: "Rejected" },
      { from: "Rejected", to: "Open" },
    ],
    version: 1,
  },
  {
    // `Expiring` IS A STATUS SOMEBODY SETS, not one anything computes.
    // Nothing reads `expiresOn` and no job moves a row, so a certificate
    // that lapsed last month still reads Valid until a person notices. That
    // is the same gap the vehicle and training registers carry and it is
    // stated in all three rather than left to be discovered — a status that
    // looks like a warning and is not is worse than no status at all.
    //
    // EXPIRED RETURNS TO VALID: a certificate is RENEWED, and the holder,
    // the issuer and the history are the same. A fresh row each cycle loses
    // the very continuity a certificate is evidence of.
    key: "certification",
    label: "Certifications",
    parentSectionKey: "quality-hse",
    fields: [
      { key: "title", label: "Certificate", kind: "text", required: true },
      { key: "holder", label: "Held by", kind: "text" },
      { key: "kind", label: "Kind", kind: "select", options: ["Company", "Person", "Equipment", "Product", "Site"] },
      { key: "issuer", label: "Issued by", kind: "text" },
      { key: "issuedOn", label: "Issued", kind: "date" },
      { key: "expiresOn", label: "Expires", kind: "date" },
      { key: "reference", label: "Certificate number", kind: "text" },
    ],
    columns: ["title", "holder", "expiresOn"],
    statuses: ["Valid", "Expiring", "Expired", "Withdrawn"],
    transitions: [
      { from: "Valid", to: "Expiring" },
      { from: "Expiring", to: "Valid" },
      { from: "Expiring", to: "Expired" },
      { from: "Expired", to: "Valid" },
      { from: "Valid", to: "Withdrawn" },
      { from: "Expired", to: "Withdrawn" },
    ],
    version: 1,
  },
] as const;

const Types = repo<RecordType>("recordTypes");

/**
 * SEEDED, AND NEVER OVERWRITING. A studio that already has a type keeps it —
 * the same courtesy `nextPool` extends to service actions and the departments
 * register extends to a trade's chart.
 *
 * THE SECTION IS PLANTED FIRST and the type row written second. A type whose
 * section does not exist would serve records into a sub-section that falls back
 * to its root, where nothing reads them.
 *
 * A TYPE WHOSE PARENT SECTION IS ABSENT IS SKIPPED WHOLE, not planted at the
 * root: `plantTypeSection` answers null for exactly that case, and writing the
 * type row anyway would leave a type serving records into a section that does
 * not exist — the tender register's mistake, one layer up.
 *
 * The declaration is spread into fresh arrays because `BUILTIN_TYPES` is `as
 * const`: what is stored is a mutable copy of the seed, so a studio's row is
 * its own from the moment it is written rather than a view onto a frozen
 * literal shared by every tenant in the process.
 */
export async function seedBuiltinTypes(studioId: string): Promise<void> {
  const settings = await getSectionByKey(studioId, "administration-settings");
  if (!settings) return;
  const scope = { studio: { id: studioId }, section: settings };
  const existing = await Types.find(scope);

  for (const decl of BUILTIN_TYPES) {
    if (existing.some((t) => t.key === decl.key)) continue;
    const section = await plantTypeSection(studioId, decl);
    if (!section) continue;
    const at = new Date().toISOString();
    await Types.create(scope, {
      ...decl,
      fields: decl.fields.map((f) => ({ ...f })),
      columns: [...decl.columns],
      statuses: [...decl.statuses],
      transitions: decl.transitions.map((t) => ({ ...t })),
      sectionKey: engineSectionKey(decl.key),
      origin: "builtin",
      createdAt: at,
      updatedAt: at,
    });
  }
}
