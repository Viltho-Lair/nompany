# The nompany glossary

**Every word the product says, in one place — English settled first, Arabic beside it.**

This exists because twelve screens are about to be rewritten and translated, and
without it each one invents its own word for "quotation". It is the vocabulary the
dictionary keys are built from, and it is the reference a reviewer checks the Arabic
against.

**Sections 1–7 are extracted from the source, not written from memory.** Every English
term in them is a literal in `platform/db/keys.ts`, `platform/access/catalogue.ts` or a
department's own constants, so they cannot drift from what the product says without the
difference being visible.

**Sections 8–9 are proposed**, and marked as such where they start. §8's interface words
are drawn from what the screens use; its refusal wording is not — see the note there,
because what the survey found is worth reading before anybody translates anything.

---

## How to read this, and what is being asked

| Column | What it is |
|---|---|
| **Key** | Where the string will live once extracted — `sales.status.lead` |
| **English** | What the product says today, verbatim from the source |
| **Arabic** | **Empty. This is the part that needs deciding.** |
| **Note** | Only where the word is a trap |

**Two rules for the Arabic**, and they matter more than the individual choices:

1. **A term is translated once and used everywhere.** If "quotation" is «عرض سعر» in
   Technical it is «عرض سعر» in Sales, in the task board and on the printed document.
   That is the whole reason this document exists.
2. **Domain Arabic, not transliteration.** Accounts receivable is «الذمم المدينة», not
   «أكاونتس ريسيفابل». Where the industry word and the literal translation differ, the
   industry word wins — an accountant should recognise their own screen.

**Digits.** Decided separately: Western digits (`ar-SA-u-nu-latn`), set once in
`fmtDate`/`fmtMoney`, chosen per user in account settings. So «١٢٣» never appears; a
reference reads `INV-0042` in both languages.

**What NOT to translate.** Reference prefixes (`INV-`, `Q-`, `RFQ-`, `ITM-`), currency
codes (`SAR`, `USD`), AWB status codes (`RCS`, `DLV`), and permission keys. These are
identifiers, and an identifier that changes language is a different identifier.

---

## 1. The product and its surfaces

| Key | English | Arabic | Note |
|---|---|---|---|
| `brand` | nompany | | Never translated, never declined. It is the name. |
| `surface.studio` | Studio | | A company's own workspace. Not "استوديو" — that reads as a photography studio. Likely «مساحة العمل» or the company's own word. |
| `surface.account` | Account | | The person's, across every studio |
| `surface.console` | Console | | nompany's own `/super` |
| `entity.studio` | Studio | | The tenant itself |
| `entity.collaborator` | Collaborator | | A person INSIDE one studio. Not "user" — see §7 |
| `entity.user` | User | | The account. One user, many collaborators |

---

## 2. The twelve departments

Verbatim from `SECTION_DEFS`. These are the sidebar, so they are the most-read words
in the product.

| Key | English | Arabic | Note |
|---|---|---|---|
| `dept.main` | Main | | The home dashboard |
| `dept.sales` | Sales | | |
| `dept.technical` | Technical | | |
| `dept.projects` | Projects | | |
| `dept.inventory` | Inventory | | |
| `dept.hr` | Human Resources | | |
| `dept.finance` | Finance | | |
| `dept.operations` | Operations | | |
| `dept.quality` | Quality | | |
| `dept.tasks` | Tasks | | |
| `dept.people` | People & requests | | Shown as "People" to non-admins |
| `dept.access` | Access | | Roles and permissions |

### Sub-sections

| Key | English | Arabic | Note |
|---|---|---|---|
| `section.sales.tickets` | Tickets | | A sales enquiry, not a support ticket |
| `section.sales.clients` | Clients | | Companies, not people |
| `section.sales.live` | Live view | | A read-only board that updates itself |
| `section.technical.quotations` | Quotations | | |
| `section.technical.rfq` | RFQ | | Keep the initialism; expand once on first use |
| `section.projects.list` | Project list | | |
| `section.projects.sla` | SLA | | Keep the initialism |
| `section.projects.overtimes` | Overtimes | | Hours beyond the plan |
| `section.inventory.stock` | Stock Management | | |
| `section.inventory.vendors` | Vendors | | Suppliers |
| `section.inventory.items` | Registered Items | | The catalogue, not the quantity |
| `section.inventory.sheets` | Project Sheets | | |
| `section.inventory.awb` | AWB Tracking | | Air waybill |
| `section.hr.employees` | Employees | | |
| `section.finance.cash` | Cash | | Becomes "Receivables" in Wave 4 |
| `section.operations.tracking` | Tracking | | Permits, shifts, locations |
| `section.quality.documents` | Documents | | Controlled documents |
| `section.settings` | Settings | | Every department has one |
| `section.studioSettings` | Studio settings | | The tenant's own |

---

## 3. The records

The nouns. Every one is a thing somebody creates, opens and talks about.

| Key | English | Arabic | Note |
|---|---|---|---|
| `record.ticket` | Ticket | | A sales enquiry from a client |
| `record.client` | Client | | |
| `record.contact` | Contact | | A person at a client |
| `record.site` | Site | | A client's location |
| `record.service` | Service | | What the studio sells |
| `record.rfq` | RFQ | | Sales asking Technical to price something |
| `record.quotation` | Quotation | | The priced document sent to a client |
| `record.revision` | Revision | | A numbered version — of a quotation or a document |
| `record.project` | Project | | What a won quotation becomes |
| `record.milestone` | Milestone | | A stage inside a project |
| `record.sla` | SLA | | A service commitment on a project |
| `record.visit` | Visit | | One scheduled call under an SLA |
| `record.overtime` | Overtime | | |
| `record.item` | Registered item | | A catalogue entry |
| `record.vendor` | Vendor | | |
| `record.movement` | Stock movement | | In, out, or an adjustment |
| `record.order` | Purchase order | | What we commit to buy |
| `record.delivery` | Delivery note | | Goods handed over |
| `record.sheet` | Project sheet | | Inventory's columns on a quotation's rows |
| `record.serial` | Serial number | | One physical unit |
| `record.shipment` | Shipment | | An AWB consignment |
| `record.airline` | Airline | | |
| `record.employee` | Employee | | |
| `record.certification` | Certification | | |
| `record.vacation` | Vacation | | Leave. See §5 for the types |
| `record.invoice` | Invoice | | What a client owes us |
| `record.payment` | Payment | | Money received |
| `record.expense` | Expense | | Money spent |
| `record.location` | Location | | Where work happens |
| `record.permit` | Permit | | |
| `record.shift` | Shift | | |
| `record.position` | Position | | Someone's whereabouts, not a job title |
| `record.document` | Controlled document | | Quality's |
| `record.task` | Task | | |
| `record.role` | Role | | A named set of permissions |
| `record.notification` | Notification | | |
| `record.joinRequest` | Join request | | |

### Wave 4's new records (Finance 1b)

| Key | English | Arabic | Note |
|---|---|---|---|
| `record.bill` | Bill | | What WE owe a vendor. The AP counterpart of an invoice |
| `record.account` | Account | | A chart-of-accounts line. Collides with `entity.user` in English; Arabic can distinguish them, and should |
| `record.journalEntry` | Journal entry | | |
| `record.asset` | Fixed asset | | |

---

## 4. The four Finance pillars

The terms most likely to be got wrong, and the ones an accountant will judge the
product by.

| Key | English | Arabic | Note |
|---|---|---|---|
| `finance.ar` | Accounts receivable | | «الذمم المدينة» — the industry term, not a literal rendering |
| `finance.ap` | Accounts payable | | «الذمم الدائنة» |
| `finance.gl` | General ledger | | «دفتر الأستاذ العام» |
| `finance.fa` | Fixed assets | | Also "PPE" in English; pick ONE and use it everywhere |
| `finance.aging` | Aging | | Of a debt, not of a person. «أعمار الديون» |
| `finance.outstanding` | Outstanding | | Owed and not yet paid |
| `finance.overdue` | Overdue | | Past its due date |
| `finance.collected` | Collected | | Received against invoices |
| `finance.dso` | Days sales outstanding | | Keep "DSO" in both, expand on first use |
| `finance.depreciation` | Depreciation | | |
| `finance.trialBalance` | Trial balance | | |
| `finance.debit` | Debit | | |
| `finance.credit` | Credit | | |
| `finance.vat` | VAT | | «ضريبة القيمة المضافة»; the field label can stay "VAT" |
| `finance.subtotal` | Subtotal | | |
| `finance.total` | Total | | |
| `finance.margin` | Margin | | |
| `finance.terms` | Payment terms | | net-30 and so on |

---

## 5. Statuses

Every one is a literal in the source today. **A status is a word a person sorts and
filters by, so the Arabic must be short.**

### Sales ticket — `TICKET_STATUSES`

| Key | English | Arabic |
|---|---|---|
| `sales.status.lead` | Lead | |
| `sales.status.opportunity` | Opportunity | |
| `sales.status.commit` | Commit | |
| `sales.status.closedWon` | Closed Won | |
| `sales.status.closedLost` | Closed Lost | |
| `sales.status.cancelledByClient` | Cancelled by Client | |
| `sales.status.dropped` | Dropped | |
| `sales.status.onHold` | On-Hold | |

### Urgency — `TICKET_URGENCIES`

| Key | English | Arabic |
|---|---|---|
| `urgency.low` | Low | |
| `urgency.normal` | Normal | |
| `urgency.high` | High | |
| `urgency.critical` | Critical | |

### RFQ — `RFQ_STATUSES`

| Key | English | Arabic | Note |
|---|---|---|---|
| `rfq.status.new` | New | | |
| `rfq.status.inReview` | In-review | | Technical is working it |
| `rfq.status.converted` | Converted | | It became a quotation |
| `rfq.status.rejected` | Rejected | | Technical turned it down |

### Quotation — `QUOTATION_STATUSES`

| Key | English | Arabic | Note |
|---|---|---|---|
| `quotation.status.new` | New | | |
| `quotation.status.draft` | Draft | | Being written |
| `quotation.status.completed` | Completed | | Finished, not yet sent |
| `quotation.status.sent` | Sent | | With the client |
| `quotation.status.approved` | Approved | | |
| `quotation.status.rejected` | Rejected | | |

### Project — `PROJECT_STAGES`

| Key | English | Arabic |
|---|---|---|
| `project.stage.received` | Received | |
| `project.stage.inProgress` | In Progress | |
| `project.stage.onHold` | On Hold | |
| `project.stage.completed` | Completed | |

### Project requirements — `REQUIREMENT_WEIGHTS`

| Key | English | Arabic |
|---|---|---|
| `project.req.delivery` | Delivery | |
| `project.req.installation` | Installation | |
| `project.req.programming` | Programming | |
| `project.req.handover` | Handover | |

### Purchase order / delivery

| Key | English | Arabic |
|---|---|---|
| `order.status.draft` | Draft | |
| `order.status.ordered` | Ordered | |
| `order.status.partlyReceived` | Partly received | |
| `order.status.received` | Received | |
| `order.status.cancelled` | Cancelled | |
| `delivery.status.issued` | Issued | |

### Stock movement — `MOVEMENT_KINDS`

| Key | English | Arabic | Note |
|---|---|---|---|
| `stock.kind.in` | In | | Stock arriving |
| `stock.kind.out` | Out | | Stock leaving |
| `stock.kind.adjust` | Adjust | | A correction |

### Invoice — `INVOICE_STATUSES`

| Key | English | Arabic |
|---|---|---|
| `invoice.status.draft` | Draft | |
| `invoice.status.sent` | Sent | |
| `invoice.status.paid` | Paid | |
| `invoice.status.cancelled` | Cancelled | |

### Payment methods, expense categories

| Key | English | Arabic |
|---|---|---|
| `payment.method.bankTransfer` | Bank transfer | |
| `payment.method.cash` | Cash | |
| `payment.method.card` | Card | |
| `payment.method.cheque` | Cheque | |
| `payment.method.other` | Other | |
| `expense.cat.materials` | Materials | |
| `expense.cat.subcontractor` | Subcontractor | |
| `expense.cat.transport` | Transport | |
| `expense.cat.travel` | Travel | |
| `expense.cat.salaries` | Salaries | |
| `expense.cat.rent` | Rent | |
| `expense.cat.utilities` | Utilities | |
| `expense.cat.software` | Software | |
| `expense.cat.equipment` | Equipment | |
| `expense.cat.fees` | Fees | |

### Leave — `LEAVE_TYPES`, `LEAVE_STATUSES`

| Key | English | Arabic | Note |
|---|---|---|---|
| `leave.type.annual` | Annual | | |
| `leave.type.sick` | Sick | | |
| `leave.type.unpaid` | Unpaid | | |
| `leave.type.parental` | Parental | | |
| `leave.type.compassionate` | Compassionate | | Bereavement leave |
| `leave.status.pending` | Pending | | |
| `leave.status.approved` | Approved | | |
| `leave.status.declined` | Declined | | |

### Operations — `LOCATION_KINDS`, `PERMIT_TYPES`

| Key | English | Arabic |
|---|---|---|
| `location.kind.site` | Site | |
| `location.kind.office` | Office | |
| `location.kind.warehouse` | Warehouse | |
| `location.kind.clientPremises` | Client premises | |
| `permit.type.work` | Work permit | |
| `permit.type.hotWork` | Hot work | |
| `permit.type.height` | Height work | |
| `permit.type.confinedSpace` | Confined space | |
| `permit.type.electrical` | Electrical | |
| `permit.type.vehicleAccess` | Vehicle access | |
| `permit.state.valid` | Valid | |
| `permit.state.notYetValid` | Not yet valid | |
| `permit.state.expiring` | Expiring | |
| `permit.state.expired` | Expired | |

### Quality document — `STATUS_LABELS` and `REV_LABELS`

The two are different vocabularies on purpose: a **document** has a status, a
**revision** has a state, and the second is finer. Do not merge them in Arabic.

| Key | English | Arabic | Note |
|---|---|---|---|
| `doc.status.draft` | Draft | | Nobody has issued it |
| `doc.status.inReview` | In review | | |
| `doc.status.approved` | Approved | | |
| `doc.status.effective` | Effective | | The company works to it |
| `doc.status.obsolete` | Obsolete | | Withdrawn |
| `rev.state.draft` | Draft | | |
| `rev.state.review` | Waiting for review | | |
| `rev.state.approval` | Waiting for approval | | |
| `rev.state.approved` | Approved, not yet issued | | |
| `rev.state.effective` | Effective | | |
| `rev.state.superseded` | Superseded | | A later revision replaced it |
| `rev.state.rejected` | Sent back | | Not "rejected" — it returns to the author |

---

## 6. The task board

| Key | English | Arabic | Note |
|---|---|---|---|
| `task.type.approval` | Quotation approval | | |
| `task.type.po` | PO approval | | |
| `task.type.materialPo` | Material PO | | |
| `task.type.delivery` | Delivery request | | |
| `task.type.deliveryReturn` | Delivery return | | |
| `task.type.idUpdate` | ID update | | |
| `task.type.permitRequest` | Permit request | | |
| `task.authority.mng` | Management | | |
| `task.authority.fin` | Finance | | |
| `task.authority.sales` | Sales | | |
| `task.authority.log` | Logistics | | |
| `task.authority.hr` | Human Resources | | |
| `task.authority.permit` | Permit team | | |
| `task.awaitingMe` | Awaiting you | | Decisions genuinely waiting on this person |
| `task.stuck` | Stuck | | Routed to an authority nobody holds — it can never complete |
| `task.orphaned` | Nobody appointed | | Why a task is stuck |

---

## 7. Access — the words that must not blur

The product's sharpest distinctions. Getting these wrong in Arabic makes the
permission screens unreadable.

| Key | English | Arabic | Note |
|---|---|---|---|
| `access.role` | Role | | A job. A named set of permissions |
| `access.permission` | Permission | | One right over one area |
| `access.grant` | Grant | | The act of giving one |
| `access.override` | Override | | An exception on one person, over their roles |
| `access.allow` | Allow | | |
| `access.deny` | Deny | | Applied LAST, so it always wins |
| `access.scope` | Scope | | How far a right reaches — own, department, everything |
| `access.owner` | Owner | | The one who created the studio. Not a role |
| `access.admin` | Admin | | The wildcard role |
| `access.member` | Member | | Anyone else |
| `access.escalation` | Escalation | | Handing out more than you hold. Always refused |
| `access.readOnly` | View only | | |

### Verbs — `catalogue.ts`

| Key | English | Arabic | Note |
|---|---|---|---|
| `verb.view` | View | | |
| `verb.create` | Create | | |
| `verb.edit` | Edit | | |
| `verb.delete` | Delete | | |
| `verb.approve` | Approve | | |
| `verb.review` | Sign as reviewer | | Reviewer and approver are two people — invariant 7 |
| `verb.approveSign` | Sign as approver | | |
| `verb.publish` | Issue a revision | | "Issue", not "publish" — nothing leaves the company |
| `verb.obsolete` | Withdraw a document | | |
| `verb.convert` | Convert to quotation | | |
| `verb.lock` | Lock permanently | | |
| `verb.unlock` | Unlock | | |
| `verb.salary` | See pay and salary | | A right of its own |

---

## 8. The interface — *proposed*

Words on every screen, in every department. The controls below are what the screens
already say; the refusals underneath are not, and the difference is the point.

| Key | English | Arabic | Note |
|---|---|---|---|
| `ui.save` | Save | | |
| `ui.cancel` | Cancel | | Not the same as `sales.status.cancelled` |
| `ui.close` | Close | | |
| `ui.search` | Search | | |
| `ui.filter` | Filter | | |
| `ui.export` | Export | | |
| `ui.print` | Print | | |
| `ui.download` | Download | | |
| `ui.add` | Add | | |
| `ui.remove` | Remove | | Take off a list |
| `ui.delete` | Delete | | Destroy. Arabic must distinguish these two |
| `ui.confirm` | Confirm | | |
| `ui.reference` | Reference | | Every record has one |
| `ui.createdAt` | Created | | |
| `ui.updatedAt` | Updated | | |
| `ui.dueDate` | Due | | |
| `ui.status` | Status | | |
| `ui.notes` | Notes | | |
| `ui.attachment` | Attachment | | |
| `ui.nothingYet` | Nothing yet | | The empty state |
| `ui.loading` | Loading… | | |
| `ui.viewOnly` | View only | | |
| `ui.required` | Required | | |
| `ui.optional` | Optional | | |

### Refusals — and a finding that came out of counting them

**PROPOSED WORDING, not extracted, because there mostly is none.** Counted while
building this: the services return **124 distinct error codes**, and exactly **three
screens** in the whole studio have a `message()` function that turns any of them into a
sentence. Finance is one of them and words fourteen. Everywhere else a refusal reaches
the person as a bare code, or as whatever generic line the screen happens to carry.

So the refusal vocabulary is not a translation problem yet — it is a **writing** problem,
and translating it before it is written would be translating placeholder text. The
English below is proposed for the commonest codes; it needs settling before Arabic, and
it belongs with `ui-ux-overhaul.md` §7's toast layer rather than with this glossary.

The ten that matter most, by how often they are returned:

| Key | Code | Proposed English | Arabic | Note |
|---|---|---|---|---|
| `error.notfound` | `notfound` ×104 | Not found | | By far the commonest. Also spelled `not-found` in four places — one of them should go |
| `error.name` | `name` ×17 | A name is needed | | |
| `error.duplicate` | `duplicate` ×17 | That name is already taken | | |
| `error.forbidden` | `forbidden` ×12 | You do not have this right | | Should name WHICH right — `explain()` already produces the sentence |
| `error.missing` | `missing` ×7 | Something required is missing | | Vague today; should name the field |
| `error.inUse` | `in-use` ×7 | This is still in use and cannot be removed | | |
| `error.readOnly` | `read-only` | You can see this but not change it | | |
| `error.escalation` | `escalation` | You cannot grant what you do not hold | | |
| `error.sameSigner` | `same-signer` | The reviewer and the approver must be two people | | Invariant 7 |
| `error.rateLimited` | `rate-limited` | Too many attempts — try again shortly | | |

Two things worth fixing while the words are being settled: **`notfound` and `not-found`
are both in use** for the same meaning, and **`missing` says nothing about what is
missing**. Both are cheap now and expensive after translation.

---

## 9. Wave 4's new words — *proposed*

None of these is in the product yet. Listed so they are translated once, with everything else,
rather than invented per screen.

| Key | English | Arabic | Note |
|---|---|---|---|
| `analytics.level.basic` | Basic | | The four paid analysis rungs |
| `analytics.level.simple` | Simple | | |
| `analytics.level.moderate` | Moderate | | |
| `analytics.level.advanced` | Advanced | | |
| `analytics.locked` | Not included in your plan | | Says what it WOULD show; never a fake number |
| `dashboard.kpi` | KPI | | |
| `dashboard.trend` | Trend | | |
| `dashboard.breakdown` | Breakdown | | |
| `nova.name` | Nova | | The assistant's name. Not translated |
| `nova.ask` | Ask Nova | | |
| `nova.raise` | Raise a request | | |
| `nova.confirm` | This is what I will create | | Shown before every write |

---

## 10. What I need from you

1. **The Arabic column**, or a decision that I draft it and you review. Either works —
   the second is faster and I would flag the twenty or so I am least sure of.
2. **Four decisions where English itself is ambiguous:**
   - "Fixed assets" or "PPE"? Both are used in the brief; pick one.
   - `record.account` (chart-of-accounts) vs `entity.user` — both are "account" in
     English. English needs disambiguating before Arabic can.
   - "Studio" — is it translated at all, or kept as a product term like "nompany"?
   - "Vendor" vs "Supplier" — the code says vendor throughout; confirm.
3. **Anything missing.** Sections 1–7 are drawn from the source, so they cover what the
   product says today. They do not cover what somebody at a desk says out loud and
   expects to find — if a word you use daily is absent, that absence is the finding.

4. **Whether the refusals are in scope now or later.** 124 codes, 3 screens wording any
   of them. My reading is that writing them is its own piece of work and belongs with
   the toast layer, not ahead of the extraction — but if you would rather they were
   settled in one pass with everything else, say so and I will draft all 124.

**Nothing is extracted until this is settled.** Roughly a hundred and thirty terms
here become several thousand strings across twelve screens, and the order matters:
agreeing the words first is the difference between translating once and twice.
