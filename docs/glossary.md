# The nompany glossary

**Every word the product says, in one place — English and Arabic settled together.**

This exists because twelve screens are about to be rewritten and translated, and
without it each one invents its own word for "quotation". It is the vocabulary the
dictionary keys are built from, and the reference a reviewer checks the Arabic against.

**Sections 1–7 are extracted from the source, not written from memory.** Every English
term in them is a literal in `platform/db/keys.ts`, `platform/access/catalogue.ts` or a
department's own constants, so they cannot drift from what the product says without the
difference being visible. **Sections 8–9 are proposed**, and marked where they start.

**Arabic status, 22/08/2026.** Twelve anchors came from Abdullah directly and are marked
**✓**. The rest are drafted here to his instruction — *stay direct* — and are marked
**·**. §10 lists the eleven I want a second opinion on before extraction; everything
else can be treated as settled.

---

## How to read this

| Column | What it is |
|---|---|
| **Key** | Where the string lives once extracted — `sales.status.lead` |
| **English** | What the product says today, verbatim from the source |
| **Arabic** | ✓ confirmed by Abdullah · drafted, direct rendering |
| **Note** | Only where the word is a trap |

**Two rules that outrank any individual choice:**

1. **A term is translated once and used everywhere.** "Quotation" is «عرض سعر» in
   Technical, in Sales, on the task board and on the printed document. That is the whole
   reason this document exists.
2. **Domain Arabic, not transliteration.** Accounts receivable is «الذمم المدينة». Where
   the industry word and the literal translation differ, the industry word wins — an
   accountant should recognise their own screen.

**Direct, not decorative.** Per instruction: «التذاكر», not «طلبات العملاء الواردة». The
shortest true word.

**Digits.** Western (`ar-SA-u-nu-latn`), set once in `fmtDate`/`fmtMoney`, chosen per
user in account settings. «١٢٣» never appears; a reference reads `INV-0042` in both.

**Never translated.** Reference prefixes (`INV-`, `Q-`, `RFQ-`, `ITM-`), currency codes
(`SAR`, `USD`), AWB status codes (`RCS`, `DLV`), permission keys. These are identifiers,
and an identifier that changes language is a different identifier.

---

## 1. The product and its surfaces

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `brand` | nompany | نومباني | ✓ | The name. Never declined, never re-spelled |
| `surface.studio` | Studio | استوديو العمل | ✓ | See §10.1 — you wrote it twice, two spellings |
| `surface.account` | Account | الحساب الشخصي | ✓ | The person's, across every studio |
| `surface.console` | Console | لوحة التحكم | · | nompany's own `/super` |
| `entity.studio` | Studio | استوديو العمل | ✓ | Same word as the surface, confirmed |
| `entity.collaborator` | Collaborator | مشارك | ✓ | A person INSIDE one studio |
| `entity.user` | User | مستخدم | ✓ | The account. One user, many collaborators |

---

## 2. The twelve departments

Verbatim from `SECTION_DEFS`. The sidebar — the most-read words in the product.

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `dept.main` | Main | الرئيسية | ✓ | |
| `dept.sales` | Sales | المبيعات | ✓ | |
| `dept.technical` | Technical | الفني | · | **You left this blank** — see §10.2 |
| `dept.projects` | Projects | المشاريع | ✓ | |
| `dept.inventory` | Inventory | المخزون | · | **You left this blank** — see §10.2 |
| `dept.hr` | Human Resources | الموارد البشرية | ✓ | |
| `dept.finance` | Finance | المالية | ✓ | |
| `dept.operations` | Operations | العمليات | ✓ | |
| `dept.quality` | Quality | الجودة | ✓ | |
| `dept.tasks` | Tasks | المهمات | ✓ | |
| `dept.people` | People & requests | المشتركين والطلبات | ✓ | "People" alone to non-admins |
| `dept.access` | Access | حرية الوصول | ✓ | |

### Sub-sections

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `section.sales.tickets` | Tickets | التذاكر | · | A sales enquiry, not a support ticket |
| `section.sales.clients` | Clients | العملاء | · | Companies, not people |
| `section.sales.live` | Live view | العرض المباشر | · | |
| `section.technical.quotations` | Quotations | عروض الأسعار | · | |
| `section.technical.rfq` | RFQ | RFQ | · | Initialism kept; «طلب عرض سعر» on first use |
| `section.projects.list` | Project list | قائمة المشاريع | · | |
| `section.projects.sla` | SLA | SLA | · | Initialism kept; «اتفاقية مستوى الخدمة» |
| `section.projects.overtimes` | Overtimes | الساعات الإضافية | · | |
| `section.inventory.stock` | Stock Management | إدارة المخزون | · | |
| `section.inventory.vendors` | Vendors | الموردون | · | |
| `section.inventory.items` | Registered Items | الأصناف المسجلة | · | The catalogue, not the quantity |
| `section.inventory.sheets` | Project Sheets | جداول المشاريع | · | |
| `section.inventory.awb` | AWB Tracking | تتبع بوالص الشحن | · | |
| `section.hr.employees` | Employees | الموظفون | · | |
| `section.finance.cash` | Cash | النقدية | · | Becomes "Receivables" in Wave 4 |
| `section.operations.tracking` | Tracking | التتبع | · | |
| `section.quality.documents` | Documents | الوثائق | · | Controlled documents |
| `section.settings` | Settings | الإعدادات | · | Every department has one |
| `section.studioSettings` | Studio settings | إعدادات استوديو العمل | · | |

---

## 3. The records

The nouns. Every one is a thing somebody creates, opens and talks about.

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `record.ticket` | Ticket | تذكرة | · | |
| `record.client` | Client | عميل | · | |
| `record.contact` | Contact | جهة اتصال | · | A person at a client |
| `record.site` | Site | موقع العميل | · | See §10.3 — collides with `record.location` |
| `record.service` | Service | خدمة | · | |
| `record.rfq` | RFQ | طلب عرض سعر | · | |
| `record.quotation` | Quotation | عرض سعر | · | |
| `record.revision` | Revision | إصدار | · | See §10.4 — NOT «مراجعة», which is *review* |
| `record.project` | Project | مشروع | · | |
| `record.milestone` | Milestone | مرحلة | · | |
| `record.sla` | SLA | اتفاقية مستوى الخدمة | · | |
| `record.visit` | Visit | زيارة | · | |
| `record.overtime` | Overtime | ساعات إضافية | · | |
| `record.item` | Registered item | صنف مسجل | · | |
| `record.vendor` | Vendor | مورّد | · | Confirmed: vendor, not supplier |
| `record.movement` | Stock movement | حركة مخزون | · | |
| `record.order` | Purchase order | أمر شراء | · | |
| `record.delivery` | Delivery note | سند تسليم | · | |
| `record.sheet` | Project sheet | جدول المشروع | · | |
| `record.serial` | Serial number | الرقم التسلسلي | · | |
| `record.shipment` | Shipment | شحنة | · | |
| `record.airline` | Airline | شركة طيران | · | |
| `record.employee` | Employee | موظف | · | |
| `record.certification` | Certification | شهادة | · | |
| `record.vacation` | Vacation | إجازة | · | |
| `record.invoice` | Invoice | فاتورة | · | What a client owes us |
| `record.payment` | Payment | دفعة | · | |
| `record.expense` | Expense | مصروف | · | |
| `record.location` | Location | موقع | · | Where work happens. See §10.3 |
| `record.permit` | Permit | تصريح | · | |
| `record.shift` | Shift | وردية | · | |
| `record.position` | Position | الموقع الجغرافي | · | Whereabouts, not a job title |
| `record.document` | Controlled document | وثيقة محكومة | · | The ISO term |
| `record.task` | Task | مهمة | · | |
| `record.role` | Role | دور | · | |
| `record.notification` | Notification | إشعار | · | |
| `record.joinRequest` | Join request | طلب انضمام | · | |

### Wave 4's new records (Finance 1b)

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `record.bill` | Bill | فاتورة مورّد | · | See §10.5 — both are «فاتورة» unqualified |
| `record.account` | Account | حساب | ✓ | Finance's. The person's is «الحساب الشخصي» |
| `record.journalEntry` | Journal entry | قيد يومية | · | |
| `record.asset` | Fixed asset | أصل ثابت | · | |

---

## 4. The four Finance pillars

The terms an accountant will judge the product by.

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `finance.ar` | Accounts receivable | الذمم المدينة | · | The industry term, not a literal rendering |
| `finance.ap` | Accounts payable | الذمم الدائنة | · | |
| `finance.gl` | General ledger | دفتر الأستاذ العام | · | |
| `finance.fa` | Fixed assets | الأصول الثابتة | · | **"PPE" is NOT used here** — see §10.6 |
| `finance.chartOfAccounts` | Chart of accounts | دليل الحسابات | · | |
| `finance.aging` | Aging | أعمار الديون | · | Of a debt, not of a person |
| `finance.outstanding` | Outstanding | المستحق | · | Owed and not yet paid |
| `finance.overdue` | Overdue | المتأخر | · | Past its due date |
| `finance.collected` | Collected | المحصّل | · | |
| `finance.dso` | DSO | DSO | · | Kept; «متوسط فترة التحصيل» on first use |
| `finance.depreciation` | Depreciation | الإهلاك | · | |
| `finance.trialBalance` | Trial balance | ميزان المراجعة | · | |
| `finance.debit` | Debit | مدين | · | |
| `finance.credit` | Credit | دائن | · | |
| `finance.vat` | VAT | ضريبة القيمة المضافة | · | Field label may stay "VAT" |
| `finance.subtotal` | Subtotal | المجموع الفرعي | · | |
| `finance.total` | Total | الإجمالي | · | |
| `finance.margin` | Margin | هامش الربح | · | |
| `finance.terms` | Payment terms | شروط الدفع | · | net-30 and so on |

---

## 5. Statuses

Every one a literal in the source. **A status is sorted and filtered by, so it must be
short.**

### Sales ticket — `TICKET_STATUSES`

| Key | English | Arabic | |
|---|---|---|---|
| `sales.status.lead` | Lead | عميل محتمل | · |
| `sales.status.opportunity` | Opportunity | فرصة | · |
| `sales.status.commit` | Commit | التزام | · |
| `sales.status.closedWon` | Closed Won | مغلق — ربح | · |
| `sales.status.closedLost` | Closed Lost | مغلق — خسارة | · |
| `sales.status.cancelledByClient` | Cancelled by Client | ألغاه العميل | · |
| `sales.status.dropped` | Dropped | متروك | · |
| `sales.status.onHold` | On-Hold | معلّق | · |

### Urgency — `TICKET_URGENCIES`

| Key | English | Arabic | |
|---|---|---|---|
| `urgency.low` | Low | منخفض | · |
| `urgency.normal` | Normal | عادي | · |
| `urgency.high` | High | مرتفع | · |
| `urgency.critical` | Critical | حرج | · |

### RFQ — `RFQ_STATUSES`

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `rfq.status.new` | New | جديد | · | |
| `rfq.status.inReview` | In-review | قيد المراجعة | · | Technical is working it |
| `rfq.status.converted` | Converted | مُحوَّل | · | It became a quotation |
| `rfq.status.rejected` | Rejected | مرفوض | · | Technical turned it down |

### Quotation — `QUOTATION_STATUSES`

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `quotation.status.new` | New | جديد | · | |
| `quotation.status.draft` | Draft | مسودة | · | Being written |
| `quotation.status.completed` | Completed | مكتمل | · | Finished, not yet sent |
| `quotation.status.sent` | Sent | مُرسل | · | With the client |
| `quotation.status.approved` | Approved | معتمد | · | |
| `quotation.status.rejected` | Rejected | مرفوض | · | |

### Project — `PROJECT_STAGES`

| Key | English | Arabic | |
|---|---|---|---|
| `project.stage.received` | Received | مستلم | · |
| `project.stage.inProgress` | In Progress | قيد التنفيذ | · |
| `project.stage.onHold` | On Hold | معلّق | · |
| `project.stage.completed` | Completed | مكتمل | · |

### Project requirements — `REQUIREMENT_WEIGHTS`

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `project.req.delivery` | Delivery | التوريد | · | See §10.7 — «التسليم» is taken by Handover |
| `project.req.installation` | Installation | التركيب | · | |
| `project.req.programming` | Programming | البرمجة | · | |
| `project.req.handover` | Handover | التسليم | · | |

### Purchase order and delivery

| Key | English | Arabic | |
|---|---|---|---|
| `order.status.draft` | Draft | مسودة | · |
| `order.status.ordered` | Ordered | تم الطلب | · |
| `order.status.partlyReceived` | Partly received | مستلم جزئياً | · |
| `order.status.received` | Received | مستلم | · |
| `order.status.cancelled` | Cancelled | ملغي | · |
| `delivery.status.issued` | Issued | صادر | · |

### Stock movement — `MOVEMENT_KINDS`

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `stock.kind.in` | In | وارد | · | Stock arriving |
| `stock.kind.out` | Out | صادر | · | Stock leaving |
| `stock.kind.adjust` | Adjust | تسوية | · | A correction |

### Invoice — `INVOICE_STATUSES`

| Key | English | Arabic | |
|---|---|---|---|
| `invoice.status.draft` | Draft | مسودة | · |
| `invoice.status.sent` | Sent | مُرسلة | · |
| `invoice.status.paid` | Paid | مدفوعة | · |
| `invoice.status.cancelled` | Cancelled | ملغاة | · |

### Payment methods and expense categories

| Key | English | Arabic | |
|---|---|---|---|
| `payment.method.bankTransfer` | Bank transfer | تحويل بنكي | · |
| `payment.method.cash` | Cash | نقداً | · |
| `payment.method.card` | Card | بطاقة | · |
| `payment.method.cheque` | Cheque | شيك | · |
| `payment.method.other` | Other | أخرى | · |
| `expense.cat.materials` | Materials | مواد | · |
| `expense.cat.subcontractor` | Subcontractor | مقاول باطن | · |
| `expense.cat.transport` | Transport | نقل | · |
| `expense.cat.travel` | Travel | سفر | · |
| `expense.cat.salaries` | Salaries | رواتب | · |
| `expense.cat.rent` | Rent | إيجار | · |
| `expense.cat.utilities` | Utilities | مرافق | · |
| `expense.cat.software` | Software | برمجيات | · |
| `expense.cat.equipment` | Equipment | معدات | · |
| `expense.cat.fees` | Fees | رسوم | · |

### Leave — `LEAVE_TYPES`, `LEAVE_STATUSES`

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `leave.type.annual` | Annual | سنوية | · | |
| `leave.type.sick` | Sick | مرضية | · | |
| `leave.type.unpaid` | Unpaid | بدون راتب | · | |
| `leave.type.parental` | Parental | والدية | · | See §10.8 |
| `leave.type.compassionate` | Compassionate | اضطرارية | · | Bereavement |
| `leave.status.pending` | Pending | قيد الانتظار | · | |
| `leave.status.approved` | Approved | موافق عليها | · | |
| `leave.status.declined` | Declined | مرفوضة | · | |

### Operations — `LOCATION_KINDS`, `PERMIT_TYPES`

| Key | English | Arabic | |
|---|---|---|---|
| `location.kind.site` | Site | موقع | · |
| `location.kind.office` | Office | مكتب | · |
| `location.kind.warehouse` | Warehouse | مستودع | · |
| `location.kind.clientPremises` | Client premises | مقر العميل | · |
| `permit.type.work` | Work permit | تصريح عمل | · |
| `permit.type.hotWork` | Hot work | أعمال ساخنة | · |
| `permit.type.height` | Height work | عمل على ارتفاع | · |
| `permit.type.confinedSpace` | Confined space | أماكن مغلقة | · |
| `permit.type.electrical` | Electrical | كهربائي | · |
| `permit.type.vehicleAccess` | Vehicle access | دخول مركبات | · |
| `permit.state.valid` | Valid | ساري | · |
| `permit.state.notYetValid` | Not yet valid | لم يسرِ بعد | · |
| `permit.state.expiring` | Expiring | قارب على الانتهاء | · |
| `permit.state.expired` | Expired | منتهي | · |

### Quality document — `STATUS_LABELS` and `REV_LABELS`

Two vocabularies on purpose: a **document** has a status, a **revision** has a state,
and the second is finer. They must stay distinct in Arabic.

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `doc.status.draft` | Draft | مسودة | · | |
| `doc.status.inReview` | In review | قيد المراجعة | · | |
| `doc.status.approved` | Approved | معتمد | · | |
| `doc.status.effective` | Effective | نافذ | · | The company works to it |
| `doc.status.obsolete` | Obsolete | ملغى | · | Withdrawn |
| `rev.state.draft` | Draft | مسودة | · | |
| `rev.state.review` | Waiting for review | بانتظار المراجعة | · | |
| `rev.state.approval` | Waiting for approval | بانتظار الاعتماد | · | |
| `rev.state.approved` | Approved, not yet issued | معتمد ولم يصدر بعد | · | |
| `rev.state.effective` | Effective | نافذ | · | |
| `rev.state.superseded` | Superseded | مستبدل | · | A later revision replaced it |
| `rev.state.rejected` | Sent back | أعيد للتعديل | · | Not "rejected" — it returns to its author |

---

## 6. The task board

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `task.type.approval` | Quotation approval | اعتماد عرض سعر | · | |
| `task.type.po` | PO approval | اعتماد أمر شراء | · | |
| `task.type.materialPo` | Material PO | أمر شراء مواد | · | |
| `task.type.delivery` | Delivery request | طلب تسليم | · | |
| `task.type.deliveryReturn` | Delivery return | إرجاع تسليم | · | |
| `task.type.idUpdate` | ID update | تحديث هوية | · | |
| `task.type.permitRequest` | Permit request | طلب تصريح | · | |
| `task.authority.mng` | Management | الإدارة | · | |
| `task.authority.fin` | Finance | المالية | · | |
| `task.authority.sales` | Sales | المبيعات | · | |
| `task.authority.log` | Logistics | الخدمات اللوجستية | · | |
| `task.authority.hr` | Human Resources | الموارد البشرية | · | |
| `task.authority.permit` | Permit team | فريق التصاريح | · | |
| `task.awaitingMe` | Awaiting you | بانتظارك | · | Decisions genuinely waiting on this person |
| `task.stuck` | Stuck | متوقفة | · | Routed to an authority nobody holds |
| `task.orphaned` | Nobody appointed | لا أحد معيّن | · | Why a task is stuck |

---

## 7. Access — the words that must not blur

The product's sharpest distinctions. Blurring these makes the permission screens
unreadable.

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `access.role` | Role | دور | · | A job. A named set of permissions |
| `access.permission` | Permission | صلاحية | · | One right over one area |
| `access.grant` | Grant | منح | · | The act of giving one |
| `access.override` | Override | استثناء | · | An exception on one person, over their roles |
| `access.allow` | Allow | سماح | · | |
| `access.deny` | Deny | منع | · | Applied LAST, so it always wins |
| `access.scope` | Scope | نطاق | · | How far a right reaches |
| `access.owner` | Owner | المالك | · | Created the studio. Not a role |
| `access.admin` | Admin | مسؤول | · | The wildcard role |
| `access.member` | Member | عضو | · | Anyone else |
| `access.escalation` | Escalation | تجاوز الصلاحيات | · | Handing out more than you hold. Always refused |
| `access.readOnly` | View only | عرض فقط | · | |

### Verbs — `catalogue.ts`

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `verb.view` | View | عرض | · | |
| `verb.create` | Create | إنشاء | · | |
| `verb.edit` | Edit | تعديل | · | |
| `verb.delete` | Delete | حذف | · | |
| `verb.approve` | Approve | اعتماد | · | |
| `verb.review` | Sign as reviewer | التوقيع كمراجع | · | Reviewer and approver are two people |
| `verb.approveSign` | Sign as approver | التوقيع كمعتمد | · | |
| `verb.publish` | Issue a revision | إصدار نسخة | · | "Issue", not "publish" — nothing leaves the company |
| `verb.obsolete` | Withdraw a document | سحب وثيقة | · | |
| `verb.convert` | Convert to quotation | تحويل إلى عرض سعر | · | |
| `verb.lock` | Lock permanently | قفل نهائي | · | |
| `verb.unlock` | Unlock | إلغاء القفل | · | |
| `verb.salary` | See pay and salary | عرض الأجور والرواتب | · | A right of its own |

---

## 8. The interface — *proposed*

Words on every screen, in every department. The controls below are what the screens
already say; the refusals underneath are not, and the difference is the point.

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `ui.save` | Save | حفظ | · | |
| `ui.cancel` | Cancel | إلغاء | · | The action. Not `invoice.status.cancelled` |
| `ui.close` | Close | إغلاق | · | |
| `ui.search` | Search | بحث | · | |
| `ui.filter` | Filter | تصفية | · | |
| `ui.export` | Export | تصدير | · | |
| `ui.print` | Print | طباعة | · | |
| `ui.download` | Download | تنزيل | · | |
| `ui.add` | Add | إضافة | · | |
| `ui.remove` | Remove | إزالة | · | Take off a list |
| `ui.delete` | Delete | حذف | · | Destroy. The two must stay distinct |
| `ui.confirm` | Confirm | تأكيد | · | |
| `ui.reference` | Reference | المرجع | · | Every record has one |
| `ui.createdAt` | Created | أُنشئ | · | |
| `ui.updatedAt` | Updated | حُدّث | · | |
| `ui.dueDate` | Due | الاستحقاق | · | |
| `ui.status` | Status | الحالة | · | |
| `ui.notes` | Notes | ملاحظات | · | |
| `ui.attachment` | Attachment | مرفق | · | |
| `ui.nothingYet` | Nothing yet | لا يوجد بعد | · | The empty state |
| `ui.loading` | Loading… | جارٍ التحميل… | · | |
| `ui.viewOnly` | View only | عرض فقط | · | |
| `ui.required` | Required | مطلوب | · | |
| `ui.optional` | Optional | اختياري | · | |

### Refusals — and a finding that came out of counting them

**PROPOSED WORDING, not extracted, because there mostly is none.** Counted while
building this: the services return **124 distinct error codes**, and exactly **three
screens** in the whole studio have a `message()` that turns any of them into a sentence.
Finance is one and words fourteen. Everywhere else a refusal reaches the person as a bare
code, or as whatever generic line the screen happens to carry.

So the refusal vocabulary is not a translation problem yet — it is a **writing** problem,
and translating it before it is written would be translating placeholder text. The
English below is proposed for the commonest codes; it belongs with `ui-ux-overhaul.md`
§7's toast layer rather than with this glossary. **The Arabic is deliberately left until
the English is settled.**

| Key | Code | Proposed English | Arabic | Note |
|---|---|---|---|---|
| `error.notfound` | `notfound` ×104 | Not found | | Also spelled `not-found` in four places — one should go |
| `error.name` | `name` ×17 | A name is needed | | |
| `error.duplicate` | `duplicate` ×17 | That name is already taken | | |
| `error.forbidden` | `forbidden` ×12 | You do not have this right | | Should name WHICH — `explain()` already produces the sentence |
| `error.missing` | `missing` ×7 | Something required is missing | | Vague today; should name the field |
| `error.inUse` | `in-use` ×7 | This is still in use and cannot be removed | | |
| `error.readOnly` | `read-only` | You can see this but not change it | | |
| `error.escalation` | `escalation` | You cannot grant what you do not hold | | |
| `error.sameSigner` | `same-signer` | The reviewer and the approver must be two people | | Invariant 7 |
| `error.rateLimited` | `rate-limited` | Too many attempts — try again shortly | | |

Two things to fix while the words are being settled: **`notfound` and `not-found` are
both in use** for one meaning, and **`missing` never says what is missing**. Both are
cheap now and expensive after translation.

---

## 9. Wave 4's new words — *proposed*

None of these is in the product yet. Listed so they are translated once, with everything
else, rather than invented per screen.

| Key | English | Arabic | | Note |
|---|---|---|---|---|
| `analytics.level.basic` | Basic | أساسي | · | See §10.9 — same near-collision as in English |
| `analytics.level.simple` | Simple | مبسّط | · | |
| `analytics.level.moderate` | Moderate | متوسط | · | |
| `analytics.level.advanced` | Advanced | متقدم | · | |
| `analytics.locked` | Not included in your plan | غير مشمول في باقتك | · | Says what it WOULD show; never a fake number |
| `dashboard.kpi` | KPI | مؤشر الأداء | · | |
| `dashboard.trend` | Trend | الاتجاه | · | |
| `dashboard.breakdown` | Breakdown | التفصيل | · | |
| `nova.name` | Nova | نوفا | · | The assistant's name |
| `nova.ask` | Ask Nova | اسأل نوفا | · | |
| `nova.raise` | Raise a request | تقديم طلب | · | |
| `nova.confirm` | This is what I will create | هذا ما سيتم إنشاؤه | · | Shown before every write |

---

## 10. Eleven I want a second opinion on

Everything above can be treated as settled. These eleven are where a wrong choice is
expensive to undo, because it would be wrong on every screen at once.

**10.1 — «استوديو» or «استديو»?** You wrote it both ways: *"studio استوديو العمل"* and
later *"Studio is استديو العمل"*. I have used **استوديو العمل** throughout, the fuller
spelling. One word, one spelling, everywhere — which is it?

**10.2 — Technical and Inventory.** You left both blank in the department list. I have
drafted **الفني** and **المخزون**. «الفني» is the usual org-chart word for a technical
department; «التقني» would read as *technological*. «المخزون» is the stock itself;
«المستودع» would be the warehouse, which is a `location.kind` here and would clash.

**10.3 — Site vs Location.** Both are «موقع» unqualified. A **Site** is a client's
premises (Sales); a **Location** is where work happens (Operations). I have used
**موقع العميل** for Site and **موقع** for Location. The alternative is «المكان» for one
of them, which reads weaker.

**10.4 — Revision vs Review.** «مراجعة» means *review*, so a document's **revision**
cannot also be «مراجعة» — the states would read "waiting for the review of the review".
I have used **إصدار** for revision. Note this collides gently with `verb.publish`
(«إصدار نسخة»), which is the act of issuing one — arguably correct, since issuing a
revision is exactly what it is.

**10.5 — Invoice vs Bill.** Both are «فاتورة». Wave 4's AP module makes the distinction
load-bearing: an **invoice** is what a client owes us, a **bill** is what we owe a
vendor. I have used **فاتورة** and **فاتورة مورّد**. The cleaner alternative is
«فاتورة مبيعات» / «فاتورة مشتريات» — longer, but symmetrical and unambiguous. Your call.

**10.6 — PPE, and I think we found a real ambiguity.** You wrote *"PPE is a must with
sales"*. In the original brief PPE meant **Property, Plant & Equipment** — the accounting
term beside Fixed Assets. But "a must with sales" reads as **Personal Protective
Equipment**, which is a thing you *sell*, not a thing you depreciate. If both meanings
live in your business, "PPE" must never appear in Finance. I have used **الأصول الثابتة**
for the accounting concept and left "PPE" free for the sales meaning. Confirm, because if
I have this backwards it is wrong in two departments at once.

**10.7 — Delivery vs Handover.** Both want «التسليم». I have used **التوريد** for
Delivery (the supply of goods) and **التسليم** for Handover (the final handover of the
project). If Delivery should be «التسليم», then Handover needs «التسليم النهائي».

**10.8 — Parental leave.** «والدية» is the literal and correct term but is uncommon in
Saudi HR practice, where «إجازة أمومة» / «إجازة أبوة» are split by parent. If your leave
policy splits them, the *English* list needs splitting first.

**10.9 — Basic vs Simple.** You renamed these from "standard/basic" precisely because two
rungs read as one. **أساسي** and **مبسّط** have the same problem in Arabic. Options:
«مبدئي / أساسي / متوسط / متقدم», or number them.

**10.10 — Access: «حرية الوصول».** Your word, and I have kept it. Noting only that it
reads closer to *freedom of access* than to *access control* — and the screen behind it
is where access is restricted. «الصلاحيات» is the usual term. Yours if you want it.

**10.11 — Console.** Not in your list. I have used **لوحة التحكم**, which is standard,
but it is nompany's own internal surface and may not need translating at all — no tenant
ever sees it.

---

## What happens next

Once §10 is settled, the extraction runs: roughly 130 terms here become several thousand
strings across twelve screens, and every one of them refers back to this table. Nothing
is extracted before then, because agreeing the words first is the difference between
translating once and translating twice.
