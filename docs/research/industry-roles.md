# Industry roles — market research

*Research only. Nothing here is implemented; no code, permission key or seeded
role changes because of this file. It is the input to the decision that comes
next.*

Compiled 05/09/2026.

---

## 1. What the system actually offers today

### 1.1 The list on `/administration-settings`

The dropdown on the Studio settings screen (`StudioSettings.js`, label
`tr.industry`) is fed by `data.options.fields`, which the service-actions route
sets to `FIELDS_OF_WORK` — the keys of `FIELD_ACTION_MATRIX` in
`src/shared/fieldsOfWork.ts`. **Twenty-five fields, plus `Other`** (free text,
80 chars). It is a fixed platform standard: a studio stores which field it
chose, and the choice seeds its service-action pool.

| # | Field of work (verbatim) | Seeded service actions |
|---|---|---|
| 1 | Agriculture, Forestry & Fishing | 9 |
| 2 | Mining & Quarrying | 12 |
| 3 | Manufacturing | 12 |
| 4 | Industrial Automation & Robotics | 13 |
| 5 | Automotive & Aerospace Manufacturing | 9 |
| 6 | Energy & Utilities (Electricity, Gas) | 14 |
| 7 | Oil, Gas & Petrochemicals (EPC) | 13 |
| 8 | Water Supply, Sewerage & Waste Management | 11 |
| 9 | Construction & Contracting | 12 |
| 10 | Wholesale & Retail Trade | 6 |
| 11 | Transportation, Logistics & Storage | 6 |
| 12 | Hospitality & Food Services | 5 |
| 13 | Information Technology & Software | 12 |
| 14 | Telecommunications | 12 |
| 15 | Media, Publishing & Creative Production | 5 |
| 16 | Financial Services & Insurance | 4 |
| 17 | Real Estate & Property Development | 7 |
| 18 | Professional, Scientific & Technical Services | 4 |
| 19 | Management Consulting | 3 |
| 20 | Administrative & Support Services | 5 |
| 21 | Public Administration & Defense | 4 |
| 22 | Education & Training | 4 |
| 23 | Healthcare & Social Services | 8 |
| 24 | Arts, Entertainment & Events | 9 |
| 25 | Personal & Other Services | 4 |

### 1.2 THREE INDUSTRY LISTS EXIST, AND THEY DISAGREE

Found while locating the list. Recorded because it decides which vocabulary a
role library would key off, and a role library keyed to the wrong one is a
library that reaches no studio.

| List | File | Count | Read by |
|---|---|---|---|
| `FIELDS_OF_WORK` | `src/shared/fieldsOfWork.ts` | 25 | **`/administration-settings`** — the studio's stored `fieldOfWork`, and the service-action pool |
| `INDUSTRIES` | `src/platform/engagement/industries.ts` | 25 | The engagement layer — picks a deal's default flow template (A–G) |
| `INDUSTRIES` | `src/lib/industries.ts` | 41 | The public onboarding questionnaire — stored on the company as `survey.field` |

The first two are the same twenty-five fields with **four labels that do not
match verbatim**, so a string join between them silently misses:

- `Energy & Utilities (Electricity, Gas)` vs `Energy & Utilities`
- `Water Supply, Sewerage & Waste Management` vs `Water Supply, Sewerage & Waste Mgmt`
- `Media, Publishing & Creative Production` vs `Media, Publishing & Creative`
- `Professional, Scientific & Technical Services` vs `Professional, Scientific & Technical`

The engagement list has stable `key` slugs (`construction-and-contracting`);
`fieldsOfWork` has none — its key **is** the display string. The third list is
a different taxonomy altogether (41 marketing-flavoured labels: "Audio Visual &
Systems Integration", "Architecture & Interior Design", "Non-Profit & NGO"),
and nothing reconciles a signup answer with the settings dropdown.

**Consequence for anything built on this research:** key a role library to the
engagement `key` slug, and fix the four labels first — or the library is
addressed by a string a rename orphans.

### 1.3 What "role" means in the product right now

`src/modules/people/roles.ts` is explicit, and the distinction matters for
every list below:

> A role is NOT a department and not a position. Those are org-chart facts: two
> people in Sales can be an engineer and a manager and must not have the same
> access. Access shape is its own axis, so it gets its own concept.

A studio seeds with **five** roles — Admin (wildcard), Manager, Team Lead,
Member, Viewer — and nothing else. The HR employee record has **no job title,
no position and no department field**; `roleNames` on it resolves from the
permission role. So the product today has an *access* vocabulary and **no
occupational vocabulary at all**.

Everything below is occupational vocabulary. Whether it becomes seeded
permission roles, an HR position taxonomy, or both, is the decision after this.

### 1.4 Reading the flow templates alongside

Each field defaults a deal to one of seven flow templates
(`src/platform/engagement/templates.ts`). The template says which records the
work produces, which is the best available check on whether a role list is
complete — a field whose template runs `contract → project → sheet → job →
timesheet → inspection` needs somebody named for each of those, and a gap in
the role list usually shows up as a stage nobody owns.

| Template | Name | Stages |
|---|---|---|
| A | Contracting / Project | ticket, rfq, quotation, contract, project, sheet, order, delivery, job, timesheet, change_order, inspection, invoice, payment |
| B | Make-to-Order Manufacturing | ticket, quotation, contract, job, sheet, order, delivery, inspection, shipment, invoice, payment |
| C | Trading / Distribution | ticket, quotation, contract, order, shipment, delivery, invoice, payment |
| D | Field Service & Installation | ticket, quotation, job, sheet, delivery, timesheet, inspection, invoice, payment |
| E | Professional Services | ticket, quotation, contract, project, task, timesheet, expense, invoice, payment |
| F | Logistics Job File | ticket, quotation, shipment, delivery, bill, invoice, payment |
| G | Recurring Contract | contract, job, timesheet, delivery, inspection, invoice, payment, change_order |

---

## 2. Method, and how to read the lists

**Source of the taxonomy:** ISIC Rev. 4 for the field boundaries (which is what
`fieldsOfWork.ts` says it transcribes), then occupational structure per field
drawn from ISCO-08 skill levels, O*NET occupation families, and the standard
org shapes of mid-size and large firms in each trade — with a deliberate lean
toward **GCC / MENA contracting-and-trading company structures**, because that
is the shape of company the product is addressed to (PRO officers, camp bosses,
mobilisation managers and clearance officers appear here for that reason, and
would not in a US-only list).

**Every industry section has the same eight tiers:**

1. **Top administration** — board and C-suite, in that field's own titles
2. **Second line** — functional directors and heads
3. **Middle management** — the people who run a department's day
4. **Supervisory / front line** — the first level that assigns work by name
5. **Professional & technical** — degreed or chartered specialists
6. **Skilled & operational** — trades, operators, crew
7. **Regulated / certified** — roles a licence or a certificate creates
8. **Industry-specific support** — back office this field has and others do not

**The universal spine (§3) is listed once and applies to all twenty-five.**
Roles repeat across industries wherever they genuinely repeat — that was asked
for and it is also true — but retyping thirty back-office rows twenty-five
times would bury the ~40 roles per field that are actually distinguishing. Each
industry section therefore lists its operating line **in full**, plus any spine
role that takes a different title or a materially different job in that field.

**A note on seniority words.** Director / Manager / Lead / Engineer / Officer /
Technician / Operator are used consistently across all lists in that order of
seniority. Where a field's market genuinely uses a different word for the same
rung (Principal, Partner, Foreman, Chargehand, Charge Nurse, Captain), the
market word is used and the rung is obvious from its position in the tier.

---

## 3. The universal spine — every industry has these

Listed once. Assume all twenty-five fields carry them unless the field's own
section says the title differs.

### 3.1 Governance and top administration

- Chairman of the Board
- Vice Chairman
- Board Member / Non-Executive Director
- Independent Director
- Company Secretary / Board Secretary
- Shareholder Representative
- Managing Director (MD)
- Chief Executive Officer (CEO)
- Deputy CEO / Executive Vice President
- General Manager (GM)
- Deputy General Manager
- Chief Operating Officer (COO)
- Chief Financial Officer (CFO)
- Chief Commercial Officer (CCO)
- Chief Technology Officer (CTO)
- Chief Information Officer (CIO)
- Chief Human Resources Officer (CHRO) / HR Director
- Chief Legal Officer / General Counsel
- Chief Risk & Compliance Officer
- Chief Strategy Officer
- Chief Sustainability / ESG Officer
- Regional Director / Country Manager
- Branch Manager
- Business Unit Head / Division Manager
- Executive Assistant to the CEO
- Chief of Staff

### 3.2 Finance and accounting

- Finance Director
- Finance Manager
- Financial Controller
- Chief Accountant
- Management Accountant / FP&A Analyst
- Cost Accountant / Cost Controller
- Project Accountant
- Accounts Payable Accountant
- Accounts Receivable Accountant
- Credit Controller
- Treasury Officer / Cash Manager
- Tax Accountant / Tax Manager
- Internal Auditor
- Audit Manager
- Bookkeeper
- Accounts Assistant / Accounts Clerk
- Cashier
- Billing Officer / Invoicing Clerk
- Payroll Accountant

### 3.3 Human resources

- HR Director
- HR Manager
- HR Business Partner
- Talent Acquisition Manager / Recruiter
- Compensation & Benefits Specialist
- Payroll Officer
- Learning & Development Manager
- Training Coordinator
- Employee Relations Officer
- HR Coordinator / HR Assistant
- Personnel Officer
- Government Relations Officer (PRO) — GCC
- Time & Attendance Clerk
- Mobilisation / Onboarding Coordinator

### 3.4 Procurement, supply chain and stores

- Supply Chain Director
- Procurement Manager
- Category Manager / Senior Buyer
- Buyer / Purchasing Officer
- Sourcing Specialist / Vendor Development Officer
- Subcontracts Administrator
- Expeditor
- Logistics Coordinator
- Import / Export Officer
- Customs Clearance Officer
- Warehouse Manager
- Store Keeper / Storeman
- Inventory Controller
- Materials Controller
- Goods Receiving Clerk

### 3.5 Commercial, sales and marketing

- Commercial Director
- Sales Director
- Sales Manager
- Regional Sales Manager
- Business Development Manager
- Key Account Manager
- Account Executive / Sales Executive
- Sales Engineer / Technical Sales
- Inside Sales / Telesales Officer
- Bid Manager / Proposals Manager
- Tendering Manager
- Estimator / Cost Estimator
- Contracts Manager
- Contracts Administrator
- Pricing Analyst
- Marketing Manager
- Digital Marketing Specialist
- Brand & Communications Manager
- Market Research Analyst
- Customer Service Manager
- Customer Service Representative
- Customer Success Manager
- Sales Coordinator / Sales Administrator

### 3.6 IT and data

- IT Manager
- Systems Administrator
- Network Administrator
- Database Administrator
- ERP Administrator / Application Support Analyst
- IT Support Technician / Helpdesk Officer
- Information Security Officer
- Data Analyst / BI Analyst
- Data Engineer

### 3.7 Quality, HSE and compliance

- QA/QC Manager
- Quality Assurance Engineer
- Quality Control Inspector
- Quality Auditor
- Document Controller
- HSE Manager
- Safety Officer / HSE Officer
- Environmental Officer
- Occupational Health Nurse
- Fire & Safety Officer
- Compliance Officer
- Risk Manager
- Business Continuity Coordinator

### 3.8 Legal and administration

- Legal Manager
- Corporate Counsel
- Contracts Counsel
- Claims Specialist
- Paralegal / Legal Assistant
- Insurance Coordinator
- Office Manager
- Administrative Assistant
- Receptionist / Front Desk Officer
- Secretary
- Data Entry Clerk
- Driver
- Office Boy / Facilities Attendant
- Security Officer
- Translator / Interpreter
- Archivist / Records Officer

---

## 4. Roles by field of work

---

### 1. Agriculture, Forestry & Fishing

*Flow: B (Make-to-Order) primary, G (Recurring Contract) secondary — produce-to-order, seasonal service contracts.*
*Seeded actions: Survey & Assessment · Procurement & Sourcing · Assembly · Installation · Delivery & Transportation · Warehousing & Storage · Testing & Inspection · Operation · Maintenance & Repair.*

**Top administration**
- Chairman / Owner (family or cooperative estate ownership is the norm)
- Managing Director / General Manager
- Chief Agronomy Officer / Technical Director
- Estate Director / Head of Farms
- Cooperative Chairman / Board of the Cooperative
- Director of Fisheries Operations
- Director of Forestry Operations

**Second line**
- Farm Operations Manager
- Head of Agronomy
- Head of Livestock
- Head of Aquaculture
- Head of Forestry / Chief Forester
- Head of Packhouse & Post-Harvest
- Head of Irrigation & Water Resources
- Supply Chain & Cold Chain Manager
- Food Safety & Certification Manager

**Middle management**
- Farm Manager
- Assistant Farm Manager
- Greenhouse Manager
- Orchard Manager
- Dairy Manager
- Poultry Farm Manager
- Feedlot Manager
- Hatchery Manager
- Fish Farm / Aquaculture Manager
- Fleet Manager (fishing vessels)
- Nursery Manager
- Packhouse Manager
- Grain Store / Silo Manager
- Cold Store Manager
- Contract Farming Manager (outgrower schemes)

**Supervisory / front line**
- Field Supervisor / Crop Supervisor
- Harvest Supervisor
- Irrigation Supervisor
- Livestock Supervisor / Herdsman
- Milking Parlour Supervisor
- Packhouse Line Supervisor
- Forestry Crew Leader / Logging Foreman
- Fishing Vessel Skipper / Captain
- Deck Boss / Bosun
- Labour Gang Foreman / Charge Hand
- Camp Supervisor (seasonal labour camps)

**Professional & technical**
- Agronomist
- Soil Scientist
- Plant Pathologist
- Entomologist / Pest Management Specialist
- Horticulturist
- Agricultural Engineer
- Irrigation Engineer
- Hydrologist
- Veterinarian
- Animal Nutritionist
- Breeding Specialist / Geneticist
- Aquaculture Biologist
- Fisheries Scientist / Stock Assessment Analyst
- Forester / Silviculturist
- Forest Inventory Analyst
- Precision Agriculture / Agri-Tech Specialist
- Drone & Remote Sensing Operator
- GIS Analyst
- Farm Data Analyst / Yield Analyst
- Post-Harvest Technologist
- Food Technologist
- Laboratory Technician (soil, water, milk, feed)

**Skilled & operational**
- Tractor Operator
- Combine Harvester Operator
- Sprayer Operator
- Irrigation Technician
- Farm Mechanic / Agricultural Equipment Technician
- Greenhouse Technician
- Grafting & Propagation Technician
- Beekeeper
- Shepherd / Stockman
- Milker
- Poultry Attendant
- Feed Mill Operator
- Slaughterhouse Operative
- Grader & Sorter
- Packer
- Cold Store Operative
- Forklift Operator
- Chainsaw Operator / Feller
- Skidder & Forwarder Operator
- Sawmill Operator
- Tree Planter
- Deckhand / Fisherman
- Net Mender
- Fish Processor / Filleter
- Hatchery Technician
- Dive Team Member (cage aquaculture)
- Seasonal Farm Labourer
- Watchman / Field Guard

**Regulated / certified**
- Licensed Pesticide Applicator
- Registered Veterinarian
- Official Veterinary Inspector
- Food Safety Officer (HACCP)
- GlobalG.A.P. / Organic Certification Coordinator
- Phytosanitary Inspector
- Skipper with Certificate of Competency
- Marine Engineer (vessel)
- Forest Stewardship (FSC) Compliance Officer
- Water Abstraction Licence Holder

**Industry-specific support**
- Farm Records Clerk / Weighbridge Clerk
- Crop Insurance Coordinator
- Subsidy & Grants Officer
- Commodity Trader / Grain Merchant
- Agricultural Extension Officer
- Cooperative Membership Officer
- Traceability Coordinator
- Seasonal Labour Coordinator

---

### 2. Mining & Quarrying

*Flow: B primary, A (Contracting / Project) secondary — supply contracts, mine development projects.*
*Seeded actions: Consulting & Advisory · Survey & Assessment · Design & Engineering · Procurement & Sourcing · Construction & Civil Works · Demolition & Dismantling · Installation · Delivery & Transportation · Testing & Inspection · Operation · Maintenance & Repair · Decommissioning & Disposal.*

**Top administration**
- Chairman / Board of Directors
- Chief Executive Officer
- Chief Operating Officer — Mining
- Chief Geologist / Exploration Director
- Chief Mining Engineer
- Technical Services Director
- Director of Health, Safety, Environment & Community (HSEC)
- Director of Mineral Resources & Reserves
- Country / Concession Director

**Second line**
- Head of Exploration
- Head of Mine Planning
- Head of Mining Operations
- Head of Processing / Metallurgy
- Head of Mine Engineering & Maintenance
- Head of Tailings & Waste Management
- Head of Mine Closure & Rehabilitation
- Head of Community Relations & Land Access
- Head of Logistics & Product Marketing

**Middle management**
- Mine Manager (statutory)
- Quarry Manager (statutory)
- Underground Manager
- Open Pit Manager
- Processing Plant Manager
- Crushing & Screening Manager
- Maintenance Manager
- Mine Planning Manager
- Drill & Blast Manager
- Geotechnical Manager
- Survey Manager
- Ventilation Manager (underground)
- Dewatering Manager
- Fleet / Mobile Equipment Manager
- Mine Contracts Manager

**Supervisory / front line**
- Shift Boss / Mine Captain
- Pit Supervisor
- Underground Section Supervisor
- Blasting Supervisor / Shotfirer in Charge
- Plant Shift Supervisor
- Crusher Supervisor
- Maintenance Supervisor
- Workshop Foreman
- Stores Supervisor
- Weighbridge Supervisor
- Camp Boss

**Professional & technical**
- Exploration Geologist
- Mine Geologist
- Resource Geologist / Modeller
- Geophysicist
- Geochemist
- Hydrogeologist
- Geotechnical Engineer
- Rock Mechanics Engineer
- Mining Engineer
- Mine Planning Engineer (short / long range)
- Drill & Blast Engineer
- Ventilation Engineer
- Mineral Processing Engineer / Metallurgist
- Process Control Engineer
- Tailings Engineer
- Mine Surveyor
- Environmental Scientist
- Mine Closure Planner
- Reliability Engineer
- Mining Cost Engineer
- Assay Laboratory Chemist
- Sampling Technician

**Skilled & operational**
- Haul Truck Operator
- Excavator / Shovel Operator
- Dozer Operator
- Grader Operator
- Loader Operator
- Drill Rig Operator
- Blaster / Shotfirer
- Charge-Up Crew
- Jumbo Operator (underground)
- LHD / Loader Operator (underground)
- Shaft Man / Cage Operator
- Rock Breaker Operator
- Crusher Operator
- Mill Operator
- Flotation Operator
- Conveyor Attendant
- Dewatering Pump Attendant
- Heavy Equipment Mechanic
- Auto Electrician
- Boilermaker / Fabricator
- Welder
- Millwright
- Instrumentation Technician
- Electrician (mining)
- Tyre Fitter
- Lube Technician
- Stores Man
- Weighbridge Clerk
- Mine Rescue Team Member

**Regulated / certified**
- Statutory Mine Manager (certificate of competency)
- Certified Blaster / Explosives Licence Holder
- Explosives Magazine Keeper
- Ventilation Officer (statutory)
- Mine Surveyor (registered)
- Radiation Protection Officer (where applicable)
- Mines Inspector Liaison
- Tailings Storage Facility Engineer of Record
- Mine Rescue Captain
- Competent Person for Reserve Reporting (JORC / NI 43-101 / SAMREC)

**Industry-specific support**
- Concession & Licensing Officer
- Royalty & Government Reporting Analyst
- Community Liaison Officer
- Resettlement & Land Compensation Officer
- Mineral Product Marketing Coordinator
- Shipment & Assay Reconciliation Clerk
- Explosives Stores Controller
- Camp & Catering Coordinator

---

### 3. Manufacturing

*Flow: B primary, D (Field Service & Installation) secondary — make-to-order, after-sales install and service.*
*Seeded actions: Design & Engineering · Procurement & Sourcing · Fabrication / Manufacturing · Assembly · Programming & Configuration · Installation · Delivery & Transportation · Warehousing & Storage · Testing & Inspection · Commissioning · Maintenance & Repair · Upgrading & Retrofit.*

**Top administration**
- Chairman / Board
- Chief Executive Officer
- Chief Operating Officer
- Chief Manufacturing Officer / VP Manufacturing
- Chief Technical Officer / VP Engineering
- Chief Supply Chain Officer
- Chief Quality Officer
- Plant Director / Works Director
- Group Operations Director

**Second line**
- Head of Production
- Head of Manufacturing Engineering
- Head of Product Development / R&D
- Head of Quality
- Head of Supply Chain & Logistics
- Head of Maintenance & Reliability
- Head of Continuous Improvement / Lean
- Head of EHS
- Head of After-Sales & Service

**Middle management**
- Plant Manager
- Production Manager
- Manufacturing Manager
- Operations Manager
- Industrial Engineering Manager
- Tooling Manager
- Maintenance Manager
- Materials Manager
- Production Planning Manager (S&OP)
- Warehouse & Distribution Manager
- Quality Manager
- New Product Introduction (NPI) Manager
- Cost & Standards Manager

**Supervisory / front line**
- Shift Supervisor / Shift Leader
- Production Supervisor
- Line Leader
- Cell Leader
- Assembly Supervisor
- Machine Shop Foreman
- Welding Foreman
- Paint Shop Supervisor
- Packing & Dispatch Supervisor
- Maintenance Supervisor
- Tool Room Supervisor
- Warehouse Supervisor
- Team Leader / Chargehand

**Professional & technical**
- Design Engineer
- Product Engineer
- Mechanical Engineer
- Electrical Engineer
- Manufacturing / Process Engineer
- Industrial Engineer (time & motion, layout)
- Tooling & Fixture Engineer
- CAD / CAM Engineer
- CNC Programmer
- Automation Engineer
- Materials Engineer / Metallurgist
- Packaging Engineer
- Reliability Engineer
- Maintenance Engineer
- Test Engineer
- Quality Engineer
- Supplier Quality Engineer
- Continuous Improvement Engineer / Six Sigma Black Belt
- Production Planner / Scheduler
- Master Scheduler
- Inventory Analyst
- Cost Estimator (manufacturing)
- Applications Engineer (after-sales)
- Service Engineer / Commissioning Engineer
- Technical Author / Manuals Writer

**Skilled & operational**
- Machinist / CNC Operator
- Turner
- Miller
- Grinder Operator
- Press Operator / Press Brake Operator
- Laser / Plasma Cutting Operator
- Welder (MIG / TIG / arc)
- Fabricator / Sheet Metal Worker
- Fitter
- Assembler
- Wireman / Panel Wirer
- Painter / Powder Coater
- Heat Treatment Operator
- Foundry Operator / Moulder
- Injection Moulding Operator
- Extrusion Operator
- Machine Setter
- Tool & Die Maker
- Maintenance Technician (mechanical / electrical)
- Instrumentation Technician
- Calibration Technician
- Forklift Operator
- Material Handler
- Packer
- Store Keeper
- Quality Inspector / Gauge Inspector
- CMM Operator
- Production Operative / General Worker

**Regulated / certified**
- Certified Welding Inspector (CWI / CSWIP)
- NDT Technician (Level I / II / III)
- Pressure Vessel Inspector
- Lifting Equipment Inspector
- Calibration Authority / Metrology Officer
- ISO 9001 Lead Auditor
- ISO 14001 / 45001 Coordinator
- CE / UKCA Conformity Officer
- Machine Safety (LOTO) Authorised Person

**Industry-specific support**
- Production Control Clerk
- Bill of Materials (BOM) Administrator
- Engineering Change (ECN) Coordinator
- Warranty Administrator
- Spare Parts Coordinator
- Shop Floor Data / MES Administrator
- Dispatch Clerk
- Scrap & Rework Controller

---

### 4. Industrial Automation & Robotics

*Flow: A (Contracting / Project) primary, D secondary — integration projects, then service and calibration.*
*Seeded actions: Consulting & Advisory · Design & Engineering · Procurement & Sourcing · Fabrication / Manufacturing · Assembly · Programming & Configuration · Installation · Integration · Testing & Inspection · Commissioning · Training · Maintenance & Repair · Upgrading & Retrofit.*

**Top administration**
- Managing Director
- Chief Technology Officer
- Engineering Director
- Director of Systems Integration
- Director of Service & Lifecycle
- Commercial Director / VP Sales
- Head of Digital / Industry 4.0

**Second line**
- Head of Controls Engineering
- Head of Robotics
- Head of Software & SCADA
- Head of Panel Building / Manufacturing
- Head of Site Installation & Commissioning
- Head of Customer Service & Support
- Head of Functional Safety
- Head of Applications & Pre-Sales

**Middle management**
- Project Manager (automation)
- Programme Manager
- Engineering Manager
- Controls Manager
- Robotics Cell Manager
- Panel Shop Manager
- Commissioning Manager
- Service Manager
- Applications Manager
- Training Manager

**Supervisory / front line**
- Lead Controls Engineer
- Lead Robotics Engineer
- Site Supervisor / Installation Supervisor
- Panel Shop Foreman
- Commissioning Team Leader
- Service Team Leader
- Test Bay Supervisor

**Professional & technical**
- Automation Engineer
- Controls Engineer
- PLC Programmer
- HMI / SCADA Engineer
- DCS Engineer
- Robotics Engineer
- Robot Programmer (ABB / KUKA / Fanuc / Universal)
- Motion Control Engineer
- Machine Vision Engineer
- Instrumentation & Control (I&C) Engineer
- Electrical Design Engineer
- Mechanical Design Engineer (jigs, EOAT, conveyors)
- Systems Integration Engineer
- Industrial Network Engineer (Profinet / EtherCAT / OPC UA)
- MES / Historian Engineer
- Functional Safety Engineer (TÜV certified)
- Simulation / Digital Twin Engineer
- Process Engineer
- Validation Engineer (pharma / food automation)
- Applications Engineer / Pre-Sales Engineer
- Solutions Architect
- Cybersecurity Engineer (OT / ICS)
- Data & Analytics Engineer (IIoT)
- Field Service Engineer
- Calibration Engineer
- Technical Trainer

**Skilled & operational**
- Panel Wireman / Control Panel Builder
- Electrical Technician
- Mechanical Fitter / Millwright
- Robot Installation Technician
- Instrument Technician
- Cable & Tray Installer
- Machine Assembler
- Test Technician
- Field Service Technician
- Spare Parts Technician
- CAD Draughtsman
- Workshop Storeman

**Regulated / certified**
- Functional Safety Engineer (IEC 61508 / 61511)
- Machinery Safety Assessor (ISO 13849 / CE marking)
- Certified Robot Integrator
- Authorised Electrician (site licence)
- ATEX / Hazardous Area Competent Person
- Calibration Laboratory Signatory (ISO 17025)
- OT Cybersecurity Assessor (IEC 62443)

**Industry-specific support**
- Bid & Technical Proposals Engineer
- FAT / SAT Coordinator
- Documentation & As-Built Controller
- Software Version / Configuration Controller
- Spare Parts & Obsolescence Planner
- Service Contract Administrator
- Remote Support Desk Operator

---

### 5. Automotive & Aerospace Manufacturing

*Flow: B primary, no secondary.*
*Seeded actions: Design & Engineering · Procurement & Sourcing · Fabrication / Manufacturing · Assembly · Programming & Configuration · Delivery & Transportation · Warehousing & Storage · Testing & Inspection · Maintenance & Repair.*

**Top administration**
- Chairman / Board
- Chief Executive Officer
- Chief Operating Officer
- Chief Engineer / VP Engineering
- VP Manufacturing / Plant Director
- VP Programmes
- Chief Quality Officer
- VP Purchasing & Supplier Management
- Airworthiness Accountable Manager (aerospace, regulator-named)
- Director of Certification & Airworthiness

**Second line**
- Head of Programme Management
- Head of Vehicle / Aircraft Engineering
- Head of Powertrain / Propulsion
- Head of Body & Structures
- Head of Electrical & Electronics
- Head of Manufacturing Engineering
- Head of Final Assembly
- Head of Supply Chain & Logistics
- Head of Quality & Product Safety
- Head of Aftermarket / MRO

**Middle management**
- Programme Manager (per platform)
- Chief Engineer (vehicle line / aircraft type)
- Production Manager
- Assembly Line Manager
- Body Shop Manager
- Paint Shop Manager
- Press Shop Manager
- Powertrain Plant Manager
- Composites Shop Manager (aerospace)
- Tooling & Jigs Manager
- Logistics & Line-Feed Manager
- Supplier Quality Manager
- Homologation / Type Approval Manager
- MRO Base Maintenance Manager

**Supervisory / front line**
- Line Supervisor
- Shift Leader
- Team Leader (assembly station)
- Trim & Final Supervisor
- Paint Line Supervisor
- Structures Assembly Supervisor
- Hangar Supervisor / Crew Chief
- Quality Gate Supervisor
- Logistics Supervisor / Sequencing Lead
- Tool Room Foreman

**Professional & technical**
- Design Engineer (body, chassis, interior, structures)
- Powertrain / Propulsion Engineer
- Aerodynamics Engineer
- Stress / Structural Analysis Engineer
- CAE / FEA Analyst
- CFD Analyst
- Materials & Composites Engineer
- Systems Engineer
- Avionics Engineer
- Vehicle Electronics / ECU Engineer
- Embedded Software Engineer
- ADAS / Autonomy Engineer
- NVH Engineer
- Durability & Test Engineer
- Manufacturing Engineer
- Process Planning Engineer
- Tooling Engineer / Jig & Fixture Designer
- Industrial Engineer (line balancing, takt)
- Robotics & Automation Engineer
- Weld Engineer
- Paint Process Engineer
- Quality Engineer (APQP / PPAP)
- Supplier Quality Engineer
- Reliability & Warranty Engineer
- Certification Engineer (aerospace)
- Configuration Management Engineer
- Airworthiness Engineer
- Flight Test Engineer
- Prototype / Build Engineer
- Homologation Engineer

**Skilled & operational**
- Assembly Operative
- Line Operator
- Press Operator
- Robot Cell Attendant
- Spot Welder / Robot Weld Technician
- Paint Sprayer
- Trim Fitter
- Engine Builder / Powertrain Assembler
- Composites Laminator
- Autoclave Operator
- Sheet Metal Worker (aerostructures)
- Riveter / Structures Fitter
- Aircraft Fitter / Mechanic
- Avionics Technician
- Harness & Loom Builder
- Machinist / CNC Operator
- Tool Maker
- Maintenance Technician
- Calibration Technician
- Quality Inspector
- CMM / Laser Tracker Operator
- NDT Technician
- Material Handler / Line Feeder
- Forklift & Tug Driver
- Prototype Technician
- Test Driver / Ground Test Technician

**Regulated / certified**
- EASA / FAA Part 21 Design Organisation Signatory
- EASA / FAA Part 145 Certifying Staff (B1 / B2 licensed engineer)
- Part 147 Approved Training Instructor
- Airworthiness Review Signatory
- IATF 16949 Lead Auditor (automotive)
- AS9100 Lead Auditor (aerospace)
- NADCAP Special Process Approver
- NDT Level III
- Certified Welding Inspector
- Type Approval / Homologation Signatory
- Export Control (ITAR / EAR) Compliance Officer

**Industry-specific support**
- Programme Planner / Master Scheduler
- Change Control (ECN / MOD) Coordinator
- Build Records & Traceability Clerk
- Warranty & Recall Coordinator
- Spare Parts / AOG Desk Officer
- Technical Publications Author
- Supplier Development Coordinator
- Customs & Export Control Clerk

---

### 6. Energy & Utilities (Electricity, Gas)

*Flow: A primary, G secondary — EPC build, then O&M contracts. The widest action set of all twenty-five (14).*
*Seeded actions: Consulting & Advisory · Survey & Assessment · Design & Engineering · Procurement & Sourcing · Construction & Civil Works · Installation · Integration · Testing & Inspection · Commissioning · Training · Operation · Maintenance & Repair · Upgrading & Retrofit · Decommissioning & Disposal.*

**Top administration**
- Chairman / Board of Directors
- Chief Executive Officer
- Chief Operating Officer
- Chief Technical Officer / Director of Engineering
- Director of Generation
- Director of Transmission & Distribution
- Director of Network Operations
- Director of Regulation & Tariffs
- Director of Energy Trading
- Chief Safety Officer
- Director of Renewables / New Energy

**Second line**
- Head of Power Generation
- Head of Substations
- Head of Overhead Lines
- Head of Underground Cables
- Head of Metering & Revenue Protection
- Head of Grid Control / System Operations
- Head of Asset Management
- Head of Outage & Maintenance Planning
- Head of Customer Connections
- Head of Gas Networks
- Head of Distributed Generation & Storage
- Head of Energy Efficiency / Demand Response

**Middle management**
- Power Plant Manager
- Station Manager
- Substation Manager
- Network Operations Manager
- Control Room Manager
- Maintenance Manager
- Outage Manager
- Project Manager (EPC)
- Construction Manager
- Commissioning Manager
- O&M Contract Manager
- Metering Manager
- Emergency Response Manager
- Grid Connection Manager

**Supervisory / front line**
- Shift Charge Engineer
- Control Room Supervisor
- Substation Supervisor
- Line Crew Foreman
- Cable Jointing Supervisor
- Meter Reading Supervisor
- Maintenance Supervisor
- Switching Coordinator
- Site Supervisor (construction)
- Permit Coordinator / Permit Issuer

**Professional & technical**
- Electrical Engineer (HV / MV / LV)
- Power Systems Engineer
- Protection & Control Engineer
- SCADA / EMS Engineer
- Substation Design Engineer
- Transmission Line Engineer
- Cable Engineer
- Civil Engineer (foundations, trenching)
- Mechanical Engineer (turbines, boilers)
- Turbine Engineer
- Boiler Engineer
- Gas Turbine Performance Engineer
- Renewable Energy Engineer (solar / wind)
- PV Systems Designer
- Battery Storage Engineer
- Grid Integration Engineer
- Load Forecasting Analyst
- Energy Trader / Scheduler
- Power Quality Engineer
- Reliability / Asset Management Engineer
- Condition Monitoring Engineer
- Metering Engineer
- Smart Grid / AMI Engineer
- Commissioning Engineer
- Testing Engineer (relay testing, HV testing)
- Environmental Engineer
- Regulatory Affairs Analyst
- Tariff Analyst
- Planning Engineer (network planning)
- GIS Analyst (network records)

**Skilled & operational**
- Control Room Operator
- Plant Operator / Unit Operator
- Turbine Operator
- Boiler Operator
- Switchgear Operator / Authorised Switcher
- Substation Technician
- Relay Technician
- Linesman / Overhead Lineworker
- Cable Jointer
- Electrician (HV / LV)
- Instrumentation Technician
- Mechanical Fitter
- Welder (pipework)
- Meter Technician / Meter Reader
- Gas Fitter
- Gas Network Technician
- Emergency Response Technician
- Crane & Winch Operator
- Rigger
- Vegetation Management / Line Clearance Crew
- Trenching & Civils Operative
- Solar Panel Installer
- Wind Turbine Technician
- Battery System Technician
- Storeman (network materials)

**Regulated / certified**
- Authorised Person (HV switching)
- Senior Authorised Person / Competent Person
- Permit to Work Issuer
- Licensed Electrical Engineer (utility licence)
- Gas Safe / Gas Competency Certificate Holder
- Working at Height / Rescue Certified Lineworker
- Confined Space Entrant / Attendant
- Grid Code Compliance Officer
- Nuclear / Dam Safety Officer (where applicable)
- Environmental Permit Holder

**Industry-specific support**
- Outage Planner / Scheduler
- Network Records & GIS Clerk
- Customer Connections Coordinator
- Wayleave & Land Rights Officer
- Revenue Protection Officer (theft investigation)
- Billing & Metering Data Analyst
- Call Centre / Fault Reporting Agent
- Spares & Strategic Stock Controller
- Regulatory Reporting Officer

---

### 7. Oil, Gas & Petrochemicals (EPC)

*Flow: A primary, G secondary — EPC, turnarounds as recurring.*
*Seeded actions: Consulting & Advisory · Survey & Assessment · Design & Engineering · Procurement & Sourcing · Fabrication / Manufacturing · Construction & Civil Works · Installation · Integration · Testing & Inspection · Commissioning · Training · Maintenance & Repair · Decommissioning & Disposal.*

**Top administration**
- Chairman / Board
- Chief Executive Officer
- Chief Operating Officer
- Chief Engineer / Engineering Director
- Projects Director
- Operations Director (upstream / downstream)
- HSSE Director
- Director of Subsurface (upstream)
- Commercial & Contracts Director
- Country Manager / JV Representative

**Second line**
- Head of Process Engineering
- Head of Piping & Layout
- Head of Mechanical / Static Equipment
- Head of Rotating Equipment
- Head of Electrical & Instrumentation
- Head of Civil & Structural
- Head of Construction
- Head of Commissioning & Start-Up
- Head of Turnarounds & Shutdowns
- Head of Inspection & Integrity
- Head of Drilling (upstream)
- Head of Production Operations
- Head of Project Controls
- Head of Supply Chain & Logistics

**Middle management**
- Project Manager (EPC)
- Engineering Manager
- Construction Manager
- Site Manager
- Commissioning Manager
- Turnaround Manager
- Package Manager
- Interface Manager
- Contracts Manager
- Procurement Manager
- Cost Control Manager
- Planning Manager
- QA/QC Manager
- HSE Manager
- Rig Manager / Drilling Superintendent
- Terminal Manager
- Refinery Operations Manager
- Plant Manager

**Supervisory / front line**
- Field Superintendent
- Area Superintendent
- Piping Supervisor
- Mechanical Supervisor
- E&I Supervisor
- Civil Supervisor
- Scaffolding Supervisor
- Welding Foreman
- Shutdown Supervisor
- Panel Operator Supervisor / Shift Superintendent
- Toolpusher (drilling)
- Driller
- Warehouse Supervisor
- Permit Coordinator

**Professional & technical**
- Process Engineer
- Process Safety Engineer
- HAZOP Facilitator
- Piping Engineer
- Pipeline Engineer
- Stress Analysis Engineer
- Mechanical Engineer (static equipment)
- Rotating Equipment Engineer
- Materials & Corrosion Engineer
- Instrumentation Engineer
- Control Systems Engineer (DCS / SIS / F&G)
- Electrical Engineer
- Civil / Structural Engineer
- Subsea Engineer
- Flow Assurance Engineer
- Reservoir Engineer
- Petroleum / Production Engineer
- Drilling Engineer
- Well Integrity Engineer
- Completions Engineer
- Mud Engineer
- Geologist / Wellsite Geologist
- Geophysicist
- Petrophysicist
- Commissioning Engineer
- Start-Up Engineer
- Inspection Engineer
- Integrity / RBI Engineer
- Cathodic Protection Engineer
- Planning / Scheduling Engineer (Primavera)
- Cost Engineer / Quantity Surveyor
- Estimator
- Document Controller (project)
- Materials Engineer / MTO Coordinator
- Environmental Engineer
- Loss Prevention Engineer

**Skilled & operational**
- Panel Operator / Console Operator
- Field Operator / Outside Operator
- Process Technician
- Pipefitter
- Welder (6G, coded)
- Boilermaker
- Rigger
- Scaffolder
- Insulator / Lagger
- Painter / Blaster
- Mechanical Fitter
- Millwright
- Instrument Technician
- Electrician
- Valve Technician
- Rotating Equipment Technician
- Crane Operator
- Heavy Lift Rigger
- Roustabout / Roughneck
- Derrickman
- Floorman
- Mud Logger
- Wireline Operator
- Coiled Tubing Operator
- Pump / Compressor Attendant
- Tank Farm Operator
- Jetty / Loading Master Assistant
- Fire Watch / Hole Watch
- Materials Man / Storekeeper

**Regulated / certified**
- Loading Master (certified)
- Certified Welding Inspector (CSWIP / AWS)
- NDT Level II / III Technician
- API Inspector (510 / 570 / 653)
- IRATA / Rope Access Technician
- Confined Space Rescue Team
- Authorised Gas Tester
- Permit to Work Authority / Area Authority
- OPITO / BOSIET Certified Offshore Worker
- Helicopter Landing Officer
- Well Control Certified (IWCF / IADC)
- Radiation Safety Officer (radiography)
- Process Safety Competent Person (COMAH / SEVESO)

**Industry-specific support**
- Project Controls Analyst
- Progress Measurement Officer
- Interface & Vendor Document Coordinator
- Material Take-Off (MTO) Clerk
- Expediting Officer
- Free Issue Materials Controller
- Mobilisation & Visa Coordinator
- Camp & Catering Manager
- Marine Coordinator / Logistics Base Officer
- Local Content / In-Country Value Officer
- Claims & Variations Analyst

---

### 8. Water Supply, Sewerage & Waste Management

*Flow: A primary, G secondary — network projects, collection contracts.*
*Seeded actions: Survey & Assessment · Design & Engineering · Procurement & Sourcing · Construction & Civil Works · Installation · Delivery & Transportation · Testing & Inspection · Commissioning · Operation · Maintenance & Repair · Decommissioning & Disposal.*

**Top administration**
- Chairman / Board
- Chief Executive Officer / Managing Director
- Chief Operating Officer
- Technical Director
- Director of Water Operations
- Director of Wastewater Operations
- Director of Waste Services
- Director of Asset Management
- Director of Regulation & Compliance
- Director of Capital Delivery

**Second line**
- Head of Water Treatment
- Head of Wastewater Treatment
- Head of Networks (water mains / sewers)
- Head of Desalination
- Head of Pumping Stations
- Head of Water Quality
- Head of Leakage & Non-Revenue Water
- Head of Solid Waste Collection
- Head of Landfill & Disposal
- Head of Recycling & Material Recovery
- Head of Hazardous Waste
- Head of Capital Projects

**Middle management**
- Treatment Plant Manager
- Desalination Plant Manager
- Wastewater Plant Manager
- Network Operations Manager
- Pumping Station Manager
- Maintenance Manager
- Project Manager (pipelines, plants)
- Construction Manager
- Commissioning Manager
- Collection Operations Manager (waste rounds)
- Transfer Station Manager
- Landfill Manager
- MRF (Materials Recovery Facility) Manager
- Fleet Manager
- Contract Manager (municipal contracts)

**Supervisory / front line**
- Shift Supervisor (plant)
- Network Supervisor
- Leak Detection Supervisor
- Mains Repair Foreman
- Sewer Jetting Supervisor
- Collection Round Supervisor
- Landfill Site Supervisor
- Sorting Line Supervisor
- Maintenance Supervisor
- Laboratory Supervisor

**Professional & technical**
- Water Engineer
- Wastewater / Sanitary Engineer
- Process Engineer (treatment)
- Desalination Process Engineer (RO / MSF)
- Hydraulic Modeller
- Hydrologist / Hydrogeologist
- Civil Engineer (pipelines, structures)
- Structural Engineer (tanks, reservoirs)
- Mechanical Engineer (pumps, blowers)
- Electrical Engineer
- Instrumentation & SCADA Engineer
- Water Quality Scientist / Chemist
- Microbiologist
- Environmental Engineer
- Landfill Engineer / Geotechnical Engineer
- Leakage Analyst / NRW Specialist
- GIS Analyst (network asset records)
- Asset Management Engineer
- Planning Engineer
- Commissioning Engineer
- Waste Characterisation Analyst
- Recycling / Circular Economy Specialist
- Odour & Emissions Specialist

**Skilled & operational**
- Treatment Plant Operator
- Pump Station Operator
- SCADA Operator
- Chemical Dosing Technician
- Membrane Technician (RO)
- Chlorination Technician
- Mains Layer / Pipe Layer
- Leak Detection Technician
- Water Meter Fitter
- Sewer Jetting Operative
- CCTV Drainage Surveyor
- Confined Space Entry Team
- Mechanical Fitter
- Electrician
- Instrument Technician
- Laboratory Technician
- Sampling Officer
- Refuse Collection Driver
- Loader / Bin Crew
- Skip Truck Driver
- Vacuum Tanker Driver
- Street Sweeper Operator
- Landfill Compactor Operator
- Excavator Operator
- Weighbridge Operator
- Sorting Line Picker
- Baler Operator
- Hazardous Waste Handler
- Septic Tank Service Operative

**Regulated / certified**
- Licensed Water Treatment Operator (grade certified)
- Drinking Water Quality Signatory
- Confined Space Competent Person
- Waste Carrier Licence Holder
- Waste Transfer / Consignment Note Signatory
- Landfill Permit Holder (technically competent manager)
- Hazardous Waste (ADR) Driver
- Environmental Permit Compliance Officer
- Discharge Consent Officer
- Chlorine Handling Certified Operator

**Industry-specific support**
- Customer Billing & Meter Data Officer
- Trade Effluent Officer
- Connection Application Officer
- Wayleave & Easement Officer
- Public Health Liaison Officer
- Municipal Contract Reporting Officer
- Weighbridge & Tonnage Clerk
- Route Planner / Scheduler
- Community Awareness & Recycling Educator

---

### 9. Construction & Contracting

*Flow: A primary, no secondary — "the archetypal Template A user".*
*Seeded actions: Survey & Assessment · Design & Engineering · Procurement & Sourcing · Assembly · Construction & Civil Works · Demolition & Dismantling · Installation · Delivery & Transportation · Testing & Inspection · Commissioning · Maintenance & Repair · Upgrading & Retrofit.*

**Top administration**
- Chairman / Owner
- Chief Executive Officer / Managing Director
- Deputy Managing Director
- Chief Operating Officer
- Operations Director
- Technical Director
- Commercial Director
- Projects Director
- Contracts Director
- Finance Director
- HSE Director
- Business Development Director
- Regional / Country Manager

**Second line**
- Head of Civil Works
- Head of MEP
- Head of Fit-Out / Finishes
- Head of Infrastructure / Roads
- Head of Estimation & Tendering
- Head of Planning
- Head of Quantity Surveying
- Head of Procurement & Subcontracts
- Head of Plant & Equipment
- Head of Quality
- Head of Design Management
- Head of Claims

**Middle management**
- Project Manager
- Senior Project Manager
- Construction Manager
- Site Manager
- Deputy Project Manager
- Design Manager
- Planning Manager
- Commercial Manager
- Contracts Manager
- Senior Quantity Surveyor
- Procurement Manager
- Subcontracts Manager
- Plant Manager
- Logistics Manager
- QA/QC Manager
- HSE Manager
- Mobilisation Manager
- Facilities / Camp Manager

**Supervisory / front line**
- Site Engineer
- Senior Site Engineer
- Site Supervisor
- General Foreman
- Civil Foreman
- Steel Fixing Foreman
- Formwork / Shuttering Foreman
- Concrete Foreman
- Finishing Foreman
- MEP Supervisor
- Electrical Supervisor
- HVAC Supervisor
- Plumbing Supervisor
- Scaffolding Supervisor
- Chargehand
- Store Keeper (site)
- Time Keeper
- Safety Supervisor
- Survey Party Chief

**Professional & technical**
- Civil Engineer
- Structural Engineer
- Geotechnical Engineer
- Architect
- Interior Designer
- MEP Engineer
- Electrical Engineer
- Mechanical / HVAC Engineer
- Plumbing / Public Health Engineer
- Fire Protection Engineer
- Quantity Surveyor
- Cost Engineer
- Estimator
- Planning Engineer (Primavera / MS Project)
- Document Controller
- BIM Manager
- BIM Coordinator / Modeller
- CAD Draughtsman
- Land Surveyor
- Setting-Out Engineer
- Materials Engineer
- Concrete Technologist
- Soils / Lab Technician
- Quality Engineer
- HSE Engineer
- Environmental Officer
- Sustainability / LEED Consultant
- Value Engineering Specialist
- Claims Consultant / Delay Analyst
- Commissioning Manager / Engineer
- Handover & Snagging Coordinator

**Skilled & operational**
- Mason / Blockmason
- Steel Fixer
- Carpenter / Shuttering Carpenter
- Concrete Pump Operator
- Concrete Finisher
- Scaffolder
- Welder
- Structural Steel Erector
- Electrician
- Plumber
- HVAC Technician
- Duct Fabricator / Installer
- Fire Alarm Technician
- Painter
- Plasterer
- Tiler
- Glazier / Curtain Wall Installer
- Waterproofing Applicator
- Insulation Installer
- Gypsum / Drywall Installer
- Joinery Fitter
- Crane Operator (tower / mobile)
- Rigger / Banksman
- Excavator Operator
- Loader / Backhoe Operator
- Dozer & Grader Operator
- Roller Operator
- Piling Rig Operator
- Asphalt Paver Operator
- Dump Truck Driver
- Forklift / Telehandler Operator
- Helper / General Labourer
- Demolition Operative
- Site Cleaner
- Watchman

**Regulated / certified**
- Authority-Approved Engineer (municipality registration)
- Licensed Structural Engineer (design signatory)
- Third Party Inspection Engineer
- Certified Crane Operator
- Appointed Person (lifting operations)
- Lifting Equipment Inspector
- Scaffolding Inspector (competent person)
- NEBOSH / IOSH Certified Safety Officer
- Confined Space Competent Person
- First Aider
- Fire Warden
- Certified Welding Inspector
- NDT Technician
- LEED / Estidama / GSAS Accredited Professional
- Permit to Work Issuer

**Industry-specific support**
- Tender Coordinator / Bid Administrator
- BOQ Clerk / Taker-Off
- Subcontractor Payment Certifier
- Variation & Claims Clerk
- Progress Photographer / Reporting Officer
- Manpower Controller
- Plant Hire Coordinator
- Gate Pass / Site Access Officer
- Camp Boss
- Site Nurse / Clinic Attendant
- Government Approvals & NOC Officer

---

### 10. Wholesale & Retail Trade

*Flow: C (Trading / Distribution) primary, D secondary — trading, appliance installation as service.*
*Seeded actions: Procurement & Sourcing · Assembly · Installation · Delivery & Transportation · Warehousing & Storage · Maintenance & Repair.*

**Top administration**
- Chairman / Owner
- Chief Executive Officer / Managing Director
- Chief Operating Officer
- Chief Merchandising Officer
- Chief Commercial Officer
- Retail Director
- Wholesale / Distribution Director
- E-commerce Director
- Supply Chain Director
- Franchise Director
- Country / Territory Manager

**Second line**
- Head of Buying
- Head of Merchandising
- Head of Category Management
- Head of Retail Operations
- Head of Trade / Key Accounts
- Head of Distribution & Warehousing
- Head of E-commerce & Marketplace
- Head of Store Development
- Head of Loss Prevention
- Head of Customer Experience
- Head of After-Sales & Installation

**Middle management**
- Area / District Manager
- Store Manager
- Assistant Store Manager
- Branch Manager (wholesale depot)
- Showroom Manager
- Category Manager
- Buying Manager
- Merchandise Planner
- Pricing Manager
- Warehouse Manager
- Distribution Centre Manager
- Transport Manager
- E-commerce Operations Manager
- Visual Merchandising Manager
- Customer Service Manager
- Installation & Service Manager

**Supervisory / front line**
- Department Supervisor
- Shift Supervisor
- Floor Supervisor
- Checkout / Till Supervisor
- Stockroom Supervisor
- Warehouse Supervisor
- Picking & Packing Supervisor
- Dispatch Supervisor
- Delivery Crew Leader
- Call Centre Team Leader
- Installation Team Leader

**Professional & technical**
- Buyer / Assistant Buyer
- Sourcing Specialist
- Demand Planner
- Replenishment Analyst
- Inventory Analyst
- Space Planner / Planogrammer
- Pricing Analyst
- Retail Data Analyst
- Trade Marketing Specialist
- Digital Merchandiser
- Marketplace / Channel Manager
- CRM & Loyalty Specialist
- Store Design & Fit-Out Coordinator
- Product Compliance Officer
- Quality Assurance Officer (private label)
- Import Documentation Specialist
- Customs Broker Liaison

**Skilled & operational**
- Sales Associate / Shop Assistant
- Cashier
- Stock Replenisher / Shelf Stacker
- Visual Merchandiser
- Personal Shopper / Product Advisor
- Butcher / Baker / Fishmonger (grocery)
- Deli & Fresh Food Attendant
- Warehouse Operative
- Order Picker
- Packer
- Forklift Operator
- Reach Truck Operator
- Goods Inwards Clerk
- Returns Processor
- Delivery Driver
- Van Sales Representative (pre-sell / van-sell)
- Merchandiser (field)
- Installation Technician (appliances, furniture, AV)
- Assembly Technician
- Repair Technician / Service Centre Technician
- Spare Parts Clerk
- Security Guard / Loss Prevention Officer
- Cleaner

**Regulated / certified**
- Food Handler Certificate Holder
- Weights & Measures Compliance Officer
- Pharmacy Licence Holder (retail pharmacy)
- Alcohol / Tobacco Licence Holder
- Import Licence & Product Registration Officer
- Gas Appliance Installer (certified)
- Electrical Appliance Installer (licensed)

**Industry-specific support**
- Merchandise Allocation Clerk
- Store Rota / Scheduling Coordinator
- Promotions & Campaign Coordinator
- Price Ticketing Clerk
- Stock Count / Cycle Count Auditor
- Shrinkage Analyst
- Warranty Claims Clerk
- Franchise Support Officer
- Mystery Shopper Programme Coordinator

---

### 11. Transportation, Logistics & Storage

*Flow: F (Logistics Job File) primary, G secondary — job files, warehousing contracts.*
*Seeded actions: Survey & Assessment · Assembly · Demolition & Dismantling · Installation · Delivery & Transportation · Warehousing & Storage.*

**Top administration**
- Chairman / Owner
- Chief Executive Officer / Managing Director
- Chief Operating Officer
- Logistics Director
- Freight Forwarding Director
- Fleet Director
- Warehousing Director
- Commercial Director
- Director of Network & Hubs
- Country / Station Manager

**Second line**
- Head of Air Freight
- Head of Sea Freight
- Head of Land Transport / Trucking
- Head of Rail Operations
- Head of Customs & Compliance
- Head of Contract Logistics / 3PL
- Head of Warehousing
- Head of Last Mile / Courier
- Head of Projects & Heavy Lift
- Head of Cold Chain
- Head of Fleet Maintenance
- Head of Network Planning

**Middle management**
- Operations Manager
- Freight Operations Manager
- Air Freight Manager
- Ocean Freight Manager
- Transport Manager
- Fleet Manager
- Warehouse Manager
- Distribution Centre Manager
- Depot Manager
- Terminal Manager
- Port Operations Manager
- Customs Brokerage Manager
- Project Cargo Manager
- Courier Hub Manager
- Contract Logistics Account Manager
- Yard Manager

**Supervisory / front line**
- Shift Supervisor
- Traffic Supervisor / Dispatcher
- Warehouse Supervisor
- Inbound / Outbound Supervisor
- Loading Bay Supervisor
- Yard Supervisor
- Crane & Lifting Supervisor
- Courier Route Supervisor
- Customs Clearance Supervisor
- Fleet Workshop Foreman

**Professional & technical**
- Freight Forwarder
- Import Coordinator
- Export Coordinator
- Customs Broker / Declarant
- Documentation Officer (B/L, AWB, CoO)
- Pricing & Rates Analyst
- Tender / RFQ Analyst (logistics bids)
- Route Planner / Network Analyst
- Supply Chain Analyst
- WMS Analyst / Superuser
- TMS Analyst
- Load Planner
- Chartering Broker
- Ship Agent / Port Agent
- Heavy Lift / Project Cargo Engineer
- Lashing & Securing Engineer
- Dangerous Goods Safety Adviser
- Cold Chain Quality Officer
- Claims & Insurance Officer
- Trade Compliance Analyst
- Track & Trace / Control Tower Analyst

**Skilled & operational**
- HGV / Truck Driver
- Trailer Driver
- Tanker Driver
- Van / Courier Driver
- Rider (last mile)
- Forklift Operator
- Reach Truck / VNA Operator
- Crane Operator (port / yard)
- Reach Stacker Operator
- Terminal Tractor Driver
- Stevedore / Docker
- Lasher
- Warehouse Operative
- Order Picker
- Packer
- Container Stuffer / Destuffer
- Goods Receiving Clerk
- Dispatch Clerk
- Cargo Handler (air)
- Ramp Agent
- Load Master
- Rigger
- Fleet Mechanic
- Tyre Technician
- Refrigeration Technician (reefer)
- Fuel Attendant
- Security Guard / Seal Checker

**Regulated / certified**
- Licensed Customs Broker
- Dangerous Goods (IATA / IMDG / ADR) Certified Handler
- Dangerous Goods Safety Adviser (DGSA)
- Transport Manager CPC Holder
- Authorised Economic Operator (AEO) Compliance Officer
- Known Consignor / Regulated Agent Security Officer
- Certified Crane Operator
- Tachograph / Hours-of-Service Compliance Officer
- Food Hygiene Certified Cold Chain Operative
- Ship Security Officer (ISPS)

**Industry-specific support**
- Job File Coordinator
- Billing & Freight Audit Clerk
- Demurrage & Detention Analyst
- Vendor / Carrier Management Officer
- Fleet Licensing & Registration Clerk
- Fuel Card & Toll Administrator
- Driver Recruitment & Training Officer
- Proof-of-Delivery (POD) Clerk
- Customer Service / Track-and-Trace Agent

---

### 12. Hospitality & Food Services

*Flow: C primary, G secondary — catering orders, canteen contracts.*
*Seeded actions: Procurement & Sourcing · Assembly · Installation · Delivery & Transportation · Operation.*

**Top administration**
- Chairman / Owner
- Chief Executive Officer / Managing Director
- Chief Operating Officer
- Group General Manager
- Hotel General Manager
- Resident Manager / Hotel Manager
- Director of Operations
- Director of Food & Beverage
- Director of Rooms
- Director of Sales & Marketing
- Director of Finance (hotel controller)
- Director of Catering / Contract Catering Director
- Brand / Franchise Director

**Second line**
- Executive Chef
- Executive Housekeeper
- Front Office Manager
- Revenue Manager
- Head of Banqueting & Events
- Head of Contract Catering
- Head of Central Production Kitchen
- Head of Restaurants & Bars
- Head of Spa & Recreation
- Head of Engineering & Maintenance
- Head of Food Safety & Hygiene

**Middle management**
- Restaurant Manager
- Outlet Manager
- Bar Manager
- Banquet Manager
- Catering Operations Manager
- Unit Manager (site canteen)
- Kitchen Manager
- Purchasing Manager (F&B)
- Cost Controller (F&B)
- Housekeeping Manager
- Laundry Manager
- Reservations Manager
- Guest Relations Manager
- Duty Manager
- Chief Engineer (property)
- Security Manager
- Events & Conference Manager

**Supervisory / front line**
- Head Chef
- Sous Chef
- Chef de Partie
- Pastry Chef
- Head Waiter / Maître d'
- Restaurant Supervisor
- Bar Supervisor
- Banquet Captain
- Housekeeping Supervisor / Floor Supervisor
- Front Desk Supervisor
- Concierge Supervisor
- Stewarding Supervisor
- Kitchen Supervisor (canteen)
- Shift Leader (QSR)

**Professional & technical**
- Food Safety Officer / HACCP Coordinator
- Nutritionist / Dietitian
- Menu Development Chef / R&D Chef
- Beverage Sommelier
- Revenue & Distribution Analyst
- Hotel Systems (PMS / POS) Administrator
- Cost & Yield Analyst
- Event Designer / Planner
- Guest Experience Analyst
- Training Chef / L&D Officer
- Procurement Specialist (food commodities)

**Skilled & operational**
- Commis Chef
- Cook
- Baker
- Butcher
- Kitchen Assistant
- Steward / Dishwasher
- Waiter / Waitress
- Barista
- Bartender
- Host / Hostess
- Cashier
- Room Attendant
- Public Area Cleaner
- Linen & Laundry Attendant
- Bellman / Porter
- Doorman
- Valet
- Front Desk Agent / Receptionist
- Reservations Agent
- Telephone Operator
- Spa Therapist
- Lifeguard
- Maintenance Technician (HVAC, electrical, plumbing)
- Pool Technician
- Delivery Driver (catering)
- Food Packer
- Security Guard
- Storekeeper (F&B stores)

**Regulated / certified**
- Food Handler Card Holder
- HACCP Certified Supervisor
- Person in Charge (food safety, statutory)
- Alcohol Service Licence Holder
- Fire Safety Officer / Fire Warden
- First Aider
- Pool Water Quality Certified Operator
- Municipality Health Card Holder (GCC)
- Halal / Kosher Certification Coordinator

**Industry-specific support**
- Night Auditor
- Rota / Duty Roster Coordinator
- Banquet Event Order (BEO) Coordinator
- Menu Costing Clerk
- Receiving Clerk (F&B)
- Guest Feedback / Reviews Coordinator
- Loyalty Programme Officer
- Contract Catering Compliance Officer
- Staff Accommodation Supervisor

---

### 13. Information Technology & Software

*Flow: E (Professional Services) primary, D secondary — development projects, integration and support.*
*Seeded actions: Consulting & Advisory · Survey & Assessment · Design & Engineering · Procurement & Sourcing · Programming & Configuration · Installation · Integration · Testing & Inspection · Commissioning · Training · Maintenance & Repair · Upgrading & Retrofit.*

**Top administration**
- Chairman / Board
- Chief Executive Officer
- Chief Technology Officer
- Chief Product Officer
- Chief Information Officer
- Chief Information Security Officer
- Chief Data Officer
- Chief Revenue Officer
- VP Engineering
- VP Professional Services
- VP Customer Success
- Managing Director / Country Manager

**Second line**
- Head of Engineering
- Head of Platform / Infrastructure
- Head of Product Management
- Head of Design (UX)
- Head of Quality Engineering
- Head of Data & Analytics
- Head of Security
- Head of DevOps / SRE
- Head of Delivery / PMO
- Head of Support
- Head of Presales & Solutions
- Head of Partnerships & Alliances

**Middle management**
- Engineering Manager
- Development Manager
- Technical Lead / Tech Lead
- Product Manager
- Group Product Manager
- Project Manager
- Delivery Manager
- Scrum Master / Agile Coach
- Release Manager
- QA Manager
- Infrastructure Manager
- Service Delivery Manager
- Support Manager
- Implementation Manager
- Account / Customer Success Manager
- Practice Manager (ERP, cloud, data)

**Supervisory / front line**
- Team Lead (squad)
- Lead Developer
- Lead QA Engineer
- Support Team Leader
- NOC Shift Lead
- Deployment Lead
- Onsite Delivery Lead

**Professional & technical**
- Software Engineer / Developer
- Frontend Engineer
- Backend Engineer
- Full-Stack Engineer
- Mobile Engineer (iOS / Android)
- Embedded Software Engineer
- Solutions Architect
- Enterprise Architect
- Software Architect
- Cloud Engineer (AWS / Azure / GCP)
- DevOps Engineer
- Site Reliability Engineer
- Platform Engineer
- Database Administrator
- Data Engineer
- Data Scientist
- Machine Learning Engineer
- AI / LLM Engineer
- Analytics Engineer
- BI Developer
- QA Engineer / Test Engineer
- Automation Test Engineer
- Performance Test Engineer
- Security Engineer
- Penetration Tester
- Security Operations (SOC) Analyst
- GRC / Compliance Analyst
- Network Engineer
- Systems Engineer
- ERP Consultant (SAP / Oracle / Dynamics)
- CRM Consultant
- Integration Engineer / Middleware Specialist
- Business Analyst
- Systems Analyst
- UX Designer
- UI Designer
- UX Researcher
- Technical Writer
- Presales / Solutions Engineer
- Implementation Consultant
- Technical Account Manager
- Trainer / Enablement Specialist

**Skilled & operational**
- IT Support Technician (L1 / L2)
- Service Desk Agent
- Desktop Support Engineer
- Field Engineer
- NOC Operator
- Data Centre Technician
- Cabling & Rack Technician
- Hardware Technician
- Asset & Licence Administrator
- Release / Build Operator
- Data Entry / Migration Operative

**Regulated / certified**
- Certified Information Systems Security Professional (CISSP)
- ISO 27001 Lead Auditor / ISMS Manager
- Data Protection Officer (GDPR / local law)
- PCI-DSS Qualified Security Assessor liaison
- Cloud Certified Architect (vendor)
- ITIL Service Manager
- Accessibility (WCAG) Auditor
- Software Escrow / Export Control Officer

**Industry-specific support**
- Scrum / Delivery Coordinator
- Licence & Subscription Administrator
- Vendor & Partner Contracts Officer
- Timesheet & Utilisation Analyst
- Bid / Proposal Writer (technical)
- Knowledge Base Editor
- Community & Developer Relations Officer
- Change Advisory Board (CAB) Secretary

---

### 14. Telecommunications

*Flow: A primary, G secondary — rollout projects, managed services.*
*Seeded actions: Survey & Assessment · Design & Engineering · Procurement & Sourcing · Programming & Configuration · Construction & Civil Works · Installation · Integration · Testing & Inspection · Commissioning · Training · Maintenance & Repair · Upgrading & Retrofit.*

**Top administration**
- Chairman / Board
- Chief Executive Officer
- Chief Technology Officer
- Chief Network Officer
- Chief Commercial Officer
- Chief Digital Officer
- Chief Information Security Officer
- Director of Network Operations
- Director of Network Deployment / Rollout
- Director of Regulatory Affairs
- Director of Wholesale & Interconnect
- Country / Cluster Manager

**Second line**
- Head of Radio Access Network (RAN)
- Head of Core Network
- Head of Transmission & Transport
- Head of Fibre / FTTx
- Head of IP & Data Networks
- Head of OSS / BSS
- Head of Field Operations
- Head of Network Planning & Optimisation
- Head of Managed Services
- Head of Tower / Passive Infrastructure
- Head of Service Assurance
- Head of Enterprise Solutions

**Middle management**
- Rollout Project Manager
- Programme Manager (network deployment)
- RAN Manager
- Core Network Manager
- Transmission Manager
- Fibre Deployment Manager
- NOC Manager
- Field Operations Manager
- Site Acquisition Manager
- Civil Works Manager (towers, ducts)
- Implementation Manager
- Service Assurance Manager
- Enterprise Delivery Manager
- Spectrum & Licensing Manager
- Vendor Management Manager

**Supervisory / front line**
- Site Supervisor (tower / rooftop)
- Fibre Splicing Supervisor
- Installation Team Leader
- NOC Shift Supervisor
- Field Maintenance Supervisor
- Cable Laying Foreman
- Survey Team Leader
- Commissioning Team Leader

**Professional & technical**
- RF Planning Engineer
- RF Optimisation Engineer
- Drive Test Engineer
- Radio Network Design Engineer
- Core Network Engineer (EPC / 5GC / IMS)
- Transmission Engineer (microwave, DWDM, SDH)
- IP / MPLS Engineer
- Fibre Optic Engineer
- FTTx Design Engineer
- OSP (Outside Plant) Designer
- Network Architect
- OSS / BSS Engineer
- Billing / Mediation Engineer
- Charging & Rating Analyst
- Telecom Software Engineer
- Network Security Engineer
- Performance & KPI Analyst
- Capacity Planning Engineer
- Site Acquisition Specialist
- Civil / Structural Engineer (tower loading)
- Power Systems Engineer (DC plant, rectifiers)
- Energy & Cooling Engineer (BTS / data centre)
- Commissioning & Integration Engineer
- Field Test Engineer
- Interconnect / Wholesale Analyst
- Regulatory Compliance Analyst
- Product Manager (mobile / broadband / enterprise)

**Skilled & operational**
- Tower Climber / Rigger
- BTS Installation Technician
- Antenna Installer
- Microwave Link Technician
- Fibre Splicer
- OTDR Test Technician
- Cable Puller / Duct Layer
- Trenching & HDD Operator
- FTTH Installation Technician
- CPE / Set-Top Box Installer
- Copper Line Technician
- Power / Battery Technician
- Generator Technician
- HVAC Technician (shelters)
- NOC Operator
- Field Maintenance Technician
- Warehouse & Spares Technician
- Meter / Device Repair Technician
- Retail Shop Advisor
- Call Centre Agent

**Regulated / certified**
- Spectrum Licence Compliance Officer
- Type Approval Officer (device certification)
- Lawful Interception Officer
- Working at Height / Tower Rescue Certified Climber
- RF Exposure (EMF) Safety Officer
- Certified Fibre Optic Technician (CFOT)
- Electrical Authorised Person (site power)
- Data Protection / Subscriber Privacy Officer

**Industry-specific support**
- Site Acquisition & Leasing Officer
- Wayleave & Permit Coordinator
- Rollout Planner / Scheduler
- Vendor Acceptance (PAT / FAC) Coordinator
- Network Records / GIS Officer
- SIM & Number Management Officer
- Dealer & Channel Support Officer
- Interconnect Settlement Clerk
- Spare Parts & RMA Coordinator

---

### 15. Media, Publishing & Creative Production

*Flow: E primary, no secondary — campaigns and productions.*
*Seeded actions: Consulting & Advisory · Design & Engineering · Procurement & Sourcing · Delivery & Transportation · Testing & Inspection.*

**Top administration**
- Chairman / Owner
- Chief Executive Officer / Managing Director
- Chief Creative Officer
- Executive Creative Director
- Chief Content Officer
- Editor-in-Chief
- Publisher
- Head of Studio / Studio Director
- Managing Partner (agency)
- Chief Revenue Officer
- Chief Strategy Officer
- Director of Production

**Second line**
- Creative Director
- Art Director (senior)
- Editorial Director
- Head of Copy
- Head of Strategy / Planning
- Head of Production (broadcast / film)
- Head of Post-Production
- Head of Digital / Social
- Head of Media Buying
- Head of Client Services
- Head of Distribution & Syndication
- Head of Rights & Licensing

**Middle management**
- Account Director
- Account Manager
- Producer
- Executive Producer
- Line Producer
- Production Manager
- Project Manager (campaign)
- Traffic Manager
- Studio Manager
- Managing Editor
- Commissioning Editor
- Post-Production Supervisor
- Media Planning Manager
- Social Media Manager
- Content Marketing Manager
- Events & Activation Manager

**Supervisory / front line**
- Senior Art Director
- Senior Copywriter
- Design Lead
- Production Coordinator
- Assistant Producer
- First Assistant Director
- Floor Manager
- Edit Suite Supervisor
- Studio Floor Supervisor
- Shift Editor (newsroom)

**Professional & technical**
- Copywriter
- Graphic Designer
- Motion Designer
- Illustrator
- Brand Designer
- UX / Digital Designer
- Photographer
- Videographer
- Director of Photography
- Camera Operator
- Sound Engineer / Recordist
- Lighting Designer / Gaffer
- Video Editor
- Colourist
- VFX Artist
- 3D Artist / Animator
- Compositor
- Broadcast Engineer
- Studio Technician
- Audio Post Engineer
- Voiceover Artist
- Journalist / Reporter
- Sub-Editor / Copy Editor
- Proofreader
- Translator / Localisation Editor
- Content Strategist
- SEO Specialist
- Performance Marketing Analyst
- Media Buyer / Planner
- Data & Insights Analyst
- Community Manager
- Prepress Technician
- Print Production Specialist

**Skilled & operational**
- Studio Assistant
- Grip
- Best Boy / Lighting Technician
- Boom Operator
- Set Builder / Carpenter
- Props Master
- Wardrobe / Costume Assistant
- Make-Up Artist
- Runner / Production Assistant
- Archive & Media Librarian
- Media Ingest / DIT Operator
- Printing Press Operator
- Bindery Operator
- Warehouse & Dispatch Operative (print distribution)
- Delivery Driver

**Regulated / certified**
- Rights & Clearances Officer
- Standards & Practices / Compliance Editor
- Broadcast Licence Compliance Officer
- Data Protection Officer (audience data)
- Advertising Standards Compliance Officer
- Safety Officer for Productions (stunts, rigging)
- Drone Pilot (licensed)

**Industry-specific support**
- Traffic / Trafficking Coordinator
- Talent & Casting Coordinator
- Location Manager
- Permits & Filming Approvals Officer
- Rights Clearance Assistant
- Royalties & Residuals Clerk
- Billing & Media Reconciliation Clerk
- Asset / DAM Librarian
- Circulation Manager (publishing)
- Subscriptions Officer

---

### 16. Financial Services & Insurance

*Flow: E primary, G secondary — advisory, retainers. Note: only four seeded service actions, the narrowest set with Management Consulting.*
*Seeded actions: Consulting & Advisory · Survey & Assessment · Testing & Inspection · Operation.*

**Top administration**
- Chairman / Board of Directors
- Board Risk Committee Chair
- Board Audit Committee Chair
- Chief Executive Officer
- Deputy CEO
- Chief Operating Officer
- Chief Financial Officer
- Chief Risk Officer
- Chief Compliance Officer
- Chief Investment Officer
- Chief Actuary
- Chief Underwriting Officer
- Chief Credit Officer
- Chief Digital / Technology Officer
- Money Laundering Reporting Officer (MLRO)
- Head of Internal Audit
- Country Manager / Branch General Manager

**Second line**
- Head of Retail Banking
- Head of Corporate Banking
- Head of Investment Banking
- Head of Treasury
- Head of Wealth Management
- Head of Asset Management
- Head of Credit Risk
- Head of Market Risk
- Head of Operational Risk
- Head of Underwriting
- Head of Claims
- Head of Reinsurance
- Head of Bancassurance
- Head of Product (cards, loans, savings)
- Head of Operations / Back Office
- Head of Collections & Recovery
- Head of Financial Crime

**Middle management**
- Branch Manager
- Relationship Manager (corporate / SME / retail)
- Portfolio Manager
- Credit Manager
- Underwriting Manager
- Claims Manager
- Operations Manager
- Trading Desk Manager
- Compliance Manager
- AML Manager
- Collections Manager
- Product Manager
- Channel Manager (digital / branch / agency)
- Agency Manager (insurance)
- Broker Relations Manager

**Supervisory / front line**
- Branch Operations Supervisor
- Teller Supervisor / Head Teller
- Customer Service Team Leader
- Call Centre Team Leader
- Claims Team Leader
- Underwriting Team Leader
- Settlements Supervisor
- Back Office Supervisor

**Professional & technical**
- Credit Analyst
- Corporate Credit Officer
- Financial Analyst
- Investment Analyst
- Equity / Fixed Income Research Analyst
- Portfolio Analyst
- Trader / Dealer
- Treasury Dealer
- Structured Finance Specialist
- Actuary
- Actuarial Analyst
- Underwriter (life / motor / property / marine / medical)
- Reinsurance Analyst
- Claims Adjuster / Assessor
- Loss Adjuster
- Surveyor (marine / property risk)
- Risk Analyst
- Model Validation Analyst
- Quantitative Analyst
- Compliance Officer
- AML / KYC Analyst
- Sanctions Screening Analyst
- Fraud Investigator
- Internal Auditor
- Regulatory Reporting Analyst
- Financial Reporting Accountant (IFRS 9 / 17)
- Data Scientist (credit scoring, pricing)
- Digital Banking Product Owner
- Core Banking Systems Analyst
- Payments Operations Specialist
- Trade Finance Officer
- Custody & Settlements Officer
- Financial Adviser / Wealth Adviser
- Insurance Broker
- Bancassurance Specialist
- Takaful Specialist / Sharia Compliance Officer

**Skilled & operational**
- Bank Teller / Cashier
- Customer Service Officer
- Account Opening Officer
- Loan Processing Officer
- Card Operations Officer
- Cheque Clearing Clerk
- Remittance Officer
- Data Entry / Document Scanning Clerk
- Collections Agent
- Call Centre Agent
- Sales Agent (insurance / cards)
- Courier & Cash-in-Transit Officer
- Branch Security Officer
- Archives Clerk

**Regulated / certified**
- Licensed Insurance Broker / Agent
- Authorised Signatory
- Money Laundering Reporting Officer (statutory)
- Certified Actuary (FIA / FSA)
- Licensed Financial Adviser (regulator registered)
- Approved Person / Controlled Function Holder
- Sharia Supervisory Board Member
- Certified Internal Auditor
- Data Protection Officer
- Complaints / Ombudsman Liaison Officer

**Industry-specific support**
- Policy Administration Clerk
- Renewals Officer
- Premium Collection Clerk
- Claims Intake Officer
- Document Custodian (security documents)
- Collateral & Lien Officer
- Regulatory Returns Clerk
- Customer Onboarding Coordinator
- Complaints Handling Officer

---

### 17. Real Estate & Property Development

*Flow: A primary, G secondary — development, property management.*
*Seeded actions: Consulting & Advisory · Survey & Assessment · Design & Engineering · Procurement & Sourcing · Operation · Maintenance & Repair · Upgrading & Retrofit.*

**Top administration**
- Chairman / Owner
- Chief Executive Officer / Managing Director
- Chief Operating Officer
- Chief Development Officer
- Chief Investment Officer
- Development Director
- Asset Management Director
- Director of Property Management
- Director of Sales & Leasing
- Director of Facilities Management
- Chief Financial Officer
- Fund Manager (REIT / real estate fund)

**Second line**
- Head of Land Acquisition
- Head of Design & Delivery
- Head of Project Management
- Head of Cost & Commercial
- Head of Leasing
- Head of Residential Sales
- Head of Commercial / Retail Leasing
- Head of Owners Association (OA) Management
- Head of Valuation & Research
- Head of Marketing

**Middle management**
- Development Manager
- Project Manager (development)
- Design Manager
- Construction Manager (client side)
- Commercial Manager
- Cost Manager
- Property Manager
- Community / OA Manager
- Facilities Manager
- Leasing Manager
- Sales Manager
- Portfolio Manager
- Investment Manager
- Marketing Manager
- Handover Manager

**Supervisory / front line**
- Site Supervisor (client representative)
- Snagging Supervisor
- Building Supervisor
- Maintenance Supervisor
- Security Supervisor
- Cleaning Supervisor
- Leasing Team Leader
- Customer Handover Coordinator

**Professional & technical**
- Land Acquisition Analyst
- Feasibility Analyst
- Development Appraiser
- Real Estate Valuer / Appraiser
- Chartered Surveyor
- Quantity Surveyor
- Cost Consultant
- Architect (client side)
- Urban Planner / Master Planner
- Landscape Architect
- MEP Consultant
- Structural Consultant
- Sustainability Consultant (LEED / Estidama)
- Contracts Administrator
- Planning Engineer
- Property Analyst / Research Analyst
- Lease Administrator
- Facilities Engineer
- Building Services Engineer
- Energy Manager
- Asset Performance Analyst
- CAFM / Property Systems Administrator
- Real Estate Marketing Specialist
- CRM & Broker Channel Specialist

**Skilled & operational**
- Sales Consultant / Property Consultant
- Leasing Agent
- Broker / Agent
- Tenant Coordinator
- Front Desk / Building Concierge
- Maintenance Technician (MEP)
- Electrician
- Plumber
- HVAC Technician
- Lift Attendant / Technician liaison
- Handyman
- Painter
- Landscaper / Gardener
- Pool Attendant
- Cleaner
- Security Guard
- Parking Attendant
- Move-In / Move-Out Inspector
- Meter Reader (utility recharge)

**Regulated / certified**
- Licensed Real Estate Broker (RERA / regulator registered)
- Registered Valuer (RICS / local)
- Owners Association Manager (licensed)
- Escrow Account Signatory (off-plan sales)
- Building Permit / NOC Officer
- Fire & Life Safety Compliance Officer
- Lift & Escalator Inspection Coordinator
- Certified Facility Manager (CFM)

**Industry-specific support**
- Title Deed & Registration Officer
- Escrow & Trust Account Clerk
- Unit Handover Documentation Clerk
- Service Charge Accountant
- Rent Collection Officer
- Tenant Relations Officer
- Snag List Coordinator
- Marketing Collateral & Showhome Coordinator
- Broker Commission Clerk

---

### 18. Professional, Scientific & Technical Services

*Flow: E primary, no secondary. Broad ISIC bucket: engineering consultancies, architecture practices, law firms, accountancy firms, R&D labs, testing houses, survey and design bureaux.*
*Seeded actions: Consulting & Advisory · Survey & Assessment · Design & Engineering · Testing & Inspection.*

**Top administration**
- Chairman / Senior Partner
- Managing Partner
- Chief Executive Officer / Managing Director
- Practice Principal
- Chief Operating Officer
- Technical Director
- Design Director
- Director of Engineering
- Head of Practice / Discipline Head
- Laboratory Director
- Director of Research
- Country / Office Managing Director

**Second line**
- Partner (equity / salaried)
- Associate Director
- Head of Architecture
- Head of Civil / Structural
- Head of MEP
- Head of Infrastructure
- Head of Environmental Services
- Head of Surveying
- Head of Testing & Inspection
- Head of R&D
- Head of Quality / Technical Assurance
- Head of Bids & Proposals

**Middle management**
- Project Director
- Project Manager
- Design Manager
- Discipline Lead Engineer
- Studio Lead (architecture)
- Laboratory Manager
- Inspection Manager
- Research Programme Manager
- Client Account Manager
- Resource / Utilisation Manager
- Quality Manager

**Supervisory / front line**
- Senior Engineer (team lead)
- Senior Architect
- Team Leader (drawing office)
- Survey Party Chief
- Lab Supervisor
- Inspection Team Leader
- CAD/BIM Coordinator

**Professional & technical**
- Architect
- Interior Architect
- Landscape Architect
- Urban Designer
- Civil Engineer
- Structural Engineer
- Geotechnical Engineer
- Highway / Transport Engineer
- Water Resources Engineer
- Environmental Engineer
- Environmental Scientist / EIA Specialist
- Mechanical Engineer
- Electrical Engineer
- Fire Engineer
- Acoustic Consultant
- Facade Engineer
- Sustainability Consultant
- Energy Modeller
- Quantity Surveyor
- Cost Consultant
- Planning Engineer
- BIM Manager / Coordinator
- CAD Technician / Draughtsman
- Land Surveyor
- Geomatics / GIS Specialist
- Hydrographic Surveyor
- Materials Testing Engineer
- Laboratory Chemist
- Microbiologist
- Metallurgist
- Research Scientist
- Data Scientist
- Statistician
- Patent Agent / IP Specialist
- Lawyer / Solicitor / Advocate
- Legal Associate
- Auditor / Accountant (practice)
- Tax Consultant
- Forensic Accountant
- Management Systems Consultant (ISO)
- Technical Writer / Report Author

**Skilled & operational**
- Survey Technician / Chainman
- Laboratory Technician
- Sampling Technician
- Field Inspector
- Testing Technician (concrete, soil, asphalt)
- NDT Technician
- Model Maker
- Print / Reprographics Operator
- Field Assistant
- Equipment & Calibration Technician

**Regulated / certified**
- Chartered Engineer (CEng / PE / registered)
- Registered Architect
- Licensed Land Surveyor
- ISO 17025 Laboratory Signatory
- Third Party Inspection Body Signatory
- Certified Public Accountant / Chartered Accountant
- Practising Advocate (bar admitted)
- Approved / Authority-Registered Consultant
- Notified Body Assessor
- Ethics & Independence Officer (audit firms)

**Industry-specific support**
- Bid / Proposal Coordinator
- Fee Proposal & Contracts Administrator
- Timesheet & Utilisation Analyst
- Document Controller
- Drawing Register Clerk
- Client Billing (WIP) Analyst
- Knowledge Management Officer
- Professional Indemnity & Insurance Coordinator
- Accreditation Coordinator

---

### 19. Management Consulting

*Flow: E primary, G secondary — engagements, retainers. The narrowest action set of all twenty-five (3).*
*Seeded actions: Consulting & Advisory · Survey & Assessment · Training.*

**Top administration**
- Chairman
- Senior Partner / Managing Partner
- Chief Executive Officer
- Regional Managing Partner
- Practice Leader (strategy, operations, digital, people)
- Industry Sector Leader
- Chief Operating Officer (firm)
- Chief Knowledge Officer
- Chief People Officer
- Head of Risk & Quality

**Second line**
- Partner
- Associate Partner / Director
- Principal
- Head of Capability (analytics, change, PMO)
- Head of Business Development
- Head of Alliances
- Head of Learning & Development

**Middle management**
- Engagement Manager
- Project Manager
- Programme Manager (client transformation)
- PMO Lead
- Delivery Manager
- Resource / Staffing Manager
- Proposal Manager

**Supervisory / front line**
- Senior Consultant (workstream lead)
- Team Lead
- Workstream Lead
- Case Team Leader

**Professional & technical**
- Strategy Consultant
- Management Consultant
- Operations Consultant
- Supply Chain Consultant
- Organisation Design Consultant
- Change Management Consultant
- HR / People Consultant
- Financial Advisory Consultant
- Risk & Compliance Consultant
- Digital Transformation Consultant
- Technology Consultant
- Data & Analytics Consultant
- Process Improvement / Lean Six Sigma Consultant
- Customer Experience Consultant
- Sustainability / ESG Consultant
- Public Sector Advisory Consultant
- Business Analyst
- Research Analyst
- Benchmarking Analyst
- Economist
- Survey Designer
- Facilitator / Workshop Lead
- Corporate Trainer
- Instructional Designer
- Executive Coach

**Skilled & operational**
- Analyst (entry grade)
- Research Assistant
- Data Analyst
- Presentation / Graphics Specialist
- Editor / Proofreader
- Translator
- Engagement Coordinator
- Travel & Logistics Coordinator

**Regulated / certified**
- Certified Management Consultant (CMC)
- PMP / PRINCE2 Certified Project Manager
- Lean Six Sigma Black Belt
- ISO Lead Auditor
- Independence & Conflict-of-Interest Officer
- Data Protection Officer (client data)

**Industry-specific support**
- Proposal / Bid Writer
- Pitch Deck Designer
- Time & Expense Administrator
- Utilisation & Rate Card Analyst
- Knowledge Base Curator
- Alumni & Client Relations Officer
- Contract & SOW Administrator
- Retainer Billing Clerk

---

### 20. Administrative & Support Services

*Flow: G (Recurring Contract) primary — the only field seeded on G — D secondary. FM, security, cleaning, manpower supply, ad-hoc jobs.*
*Seeded actions: Survey & Assessment · Installation · Delivery & Transportation · Operation · Maintenance & Repair.*

**Top administration**
- Chairman / Owner
- Chief Executive Officer / Managing Director
- Chief Operating Officer
- Facilities Management Director
- Director of Security Services
- Director of Cleaning & Soft Services
- Director of Manpower Supply / Staffing
- Commercial Director
- Director of Mobilisation
- Chief Compliance Officer

**Second line**
- Head of Hard Services (MEP)
- Head of Soft Services
- Head of Integrated FM
- Head of Security Operations
- Head of Cleaning Operations
- Head of Landscaping
- Head of Pest Control
- Head of Catering Support Services
- Head of Manpower & Deployment
- Head of Helpdesk / CAFM
- Head of Contract Performance (SLA / KPI)

**Middle management**
- Contract Manager
- Account Manager (FM contract)
- Facilities Manager
- Site FM Manager
- Operations Manager
- Security Manager
- Cleaning Operations Manager
- Landscaping Manager
- Mobilisation Manager
- Helpdesk Manager
- Technical Services Manager
- Manpower Supply Manager
- Quality & SLA Manager
- Training Manager

**Supervisory / front line**
- Site Supervisor
- Shift Supervisor
- Cleaning Supervisor
- Security Supervisor / Shift In-Charge
- Landscaping Supervisor
- Maintenance Supervisor
- Helpdesk Team Leader
- Team Leader (deployed crew)
- Chargehand
- Camp Supervisor

**Professional & technical**
- Facilities Engineer
- Building Services Engineer
- MEP Engineer
- Energy Manager
- Asset Management Engineer
- Planned Preventive Maintenance (PPM) Planner
- CAFM Administrator
- SLA / KPI Analyst
- Space Planner
- HSE Officer
- Security Systems Engineer (CCTV, access control)
- Fire & Life Safety Engineer
- Environmental / Waste Coordinator
- Bid & Contracts Engineer (FM tenders)
- Cost Estimator (FM)

**Skilled & operational**
- Multi-Skilled Technician
- Electrician
- Plumber
- HVAC Technician
- Chiller Technician
- BMS Operator
- Lift Attendant
- Handyman
- Painter
- Carpenter
- Welder
- Generator Technician
- Water Tank Cleaning Operative
- Cleaner / Housekeeping Attendant
- Deep Cleaning Operative
- Window Cleaner (rope access)
- Waste Collector
- Pest Control Technician
- Gardener / Landscaper
- Irrigation Technician
- Security Guard
- CCTV Operator
- Access Control Officer
- Concierge / Receptionist (deployed)
- Driver
- Office Assistant / Office Boy (deployed)
- Storekeeper
- Helpdesk Agent / Call Logger

**Regulated / certified**
- Licensed Security Guard (SIRA / regulator registered)
- Security Manager (licensed)
- Certified Facility Manager (CFM)
- Pest Control Licence Holder
- Rope Access (IRATA) Technician
- Confined Space Competent Person
- Electrical Authorised Person
- Fire Alarm Competent Person
- Manpower Supply Licence Holder
- Food Hygiene Certified Supervisor (catering support)

**Industry-specific support**
- Contract Administrator
- Deployment / Roster Coordinator
- Attendance & Timesheet Clerk
- Uniform & PPE Storekeeper
- Client SLA Reporting Officer
- Mobilisation Coordinator
- Visa & Labour Card Officer
- Accommodation (Camp) Administrator
- Consumables & Chemicals Controller
- Subcontractor Coordinator

---

### 21. Public Administration & Defense

*Flow: A primary, E secondary — public works, advisory.*
*Seeded actions: Consulting & Advisory · Survey & Assessment · Testing & Inspection · Operation.*

**Top administration**
- Minister / Chairman of the Authority
- Deputy Minister / Vice Chairman
- Director General
- Deputy Director General
- Secretary General
- Undersecretary
- Chief Executive of the Agency
- Governor / Mayor
- Municipality Director General
- Chief of Staff (defence)
- Commanding General / Force Commander
- Inspector General
- Auditor General

**Second line**
- Assistant Undersecretary
- Executive Director (sector)
- Director of Public Works
- Director of Planning & Development
- Director of Licensing & Permits
- Director of Inspection & Enforcement
- Director of Public Services
- Director of Emergency Management
- Director of Procurement & Tenders
- Director of Human Resources (civil service)
- Director of Information & Digital Government
- Director of Statistics
- Director of Logistics (defence)
- Director of Military Engineering

**Middle management**
- Department Head / Section Director
- Programme Manager (public programme)
- Project Manager (public works)
- Municipal Services Manager
- Licensing Manager
- Inspection Manager
- Enforcement Manager
- Tender Committee Secretary
- Budget Manager
- Grants Manager
- Civil Defence Station Commander
- Base Commander / Garrison Manager
- Depot Manager (defence logistics)

**Supervisory / front line**
- Supervisor of Inspectors
- Field Enforcement Supervisor
- Shift Commander (emergency services)
- Watch Commander
- Team Leader (service counter)
- Site Supervisor (public works)
- Warehouse Supervisor (government stores)
- NCO / Sergeant Major (defence)

**Professional & technical**
- Policy Analyst
- Legislative Drafter
- Economist
- Statistician
- Urban Planner
- Civil Engineer (public works)
- Municipal Engineer
- Transport Planner
- Environmental Officer
- Public Health Inspector
- Food Safety Inspector
- Building Inspector
- Fire Safety Inspector
- Labour Inspector
- Customs Officer
- Immigration Officer
- Tax Assessor / Revenue Officer
- Procurement & Tender Officer
- Contract Officer
- Internal Auditor
- Budget & Treasury Analyst
- Grants & Aid Coordinator
- GIS Analyst
- Government Digital Services / e-Gov Analyst
- Records & Archives Manager
- Public Information Officer
- Emergency Planning Officer
- Defence Systems Engineer
- Logistics Officer (military)
- Ordnance Engineer
- Intelligence Analyst
- Cyber Defence Analyst

**Skilled & operational**
- Service Counter Clerk
- Licensing Clerk
- Permit Issuing Officer
- Field Inspector
- Enforcement Officer / Warden
- Municipal Worker
- Road Maintenance Crew
- Street Lighting Technician
- Parks & Landscaping Operative
- Waste Collection Crew
- Driver
- Firefighter
- Ambulance Paramedic
- Police Constable
- Civil Defence Operative
- Armourer
- Vehicle Technician (fleet)
- Storeman (government stores)
- Security Guard
- Soldier / Enlisted Personnel

**Regulated / certified**
- Authorised Inspector (statutory appointment)
- Sworn Enforcement Officer
- Licensed Public Health Inspector
- Certified Fire Officer
- Accredited Auditor (public audit)
- Tender Committee Member (delegated authority)
- Security Clearance Holder
- Commissioned Officer (defence)
- Explosive Ordnance Disposal (EOD) Operator

**Industry-specific support**
- Tender & Bid Opening Clerk
- Public Records Clerk
- Correspondence & Diwan Officer
- Citizen Complaints Officer
- Freedom of Information Officer
- Protocol Officer
- Translator / Interpreter
- Statistics Data Collector
- Fleet & Asset Registrar
- Payroll & Pensions Officer (civil service)

---

### 22. Education & Training

*Flow: E primary, G secondary — programmes, term contracts.*
*Seeded actions: Consulting & Advisory · Survey & Assessment · Design & Engineering · Training.*

**Top administration**
- Chairman of the Board of Trustees / Governors
- Chancellor
- Vice Chancellor
- President
- Provost
- Chief Executive Officer (education group)
- Managing Director (training company)
- School Director / Principal
- Head of School
- Deputy Principal / Vice Principal
- Chief Academic Officer
- Registrar
- Bursar / Chief Financial Officer
- Director of Training

**Second line**
- Dean of Faculty
- Associate Dean
- Head of Department (academic)
- Director of Studies
- Director of Admissions
- Director of Student Affairs
- Director of Quality & Accreditation
- Director of Research
- Head of Curriculum
- Head of Assessment & Examinations
- Head of Corporate Training
- Head of E-Learning
- Head of Careers & Placement

**Middle management**
- Programme Manager / Programme Director
- Course Manager
- Head of Year / Head of Key Stage
- Academic Coordinator
- Training Manager
- Learning & Development Manager
- Admissions Manager
- Examinations Manager
- Student Services Manager
- Facilities Manager (campus)
- Boarding Manager
- Transport Manager (school buses)
- Accreditation Manager

**Supervisory / front line**
- Subject Lead / Head of Subject
- Senior Teacher
- Lead Trainer
- Team Leader (teaching assistants)
- Lab Supervisor
- Library Supervisor
- Shift Supervisor (boarding / campus security)

**Professional & technical**
- Professor
- Associate Professor
- Assistant Professor
- Lecturer
- Senior Lecturer
- Teacher (primary / secondary)
- Subject Specialist Teacher
- Special Educational Needs (SEN) Coordinator
- Corporate Trainer
- Technical Instructor / Vocational Trainer
- Instructional Designer
- Curriculum Developer
- E-Learning Developer
- Assessment Writer / Examiner
- Educational Psychologist
- School Counsellor
- Careers Adviser
- Librarian
- Research Fellow
- Research Assistant
- Laboratory Technician (school / university)
- Learning Technologist
- LMS Administrator
- Quality Assurance Officer (accreditation)
- Student Data / MIS Analyst

**Skilled & operational**
- Teaching Assistant
- Classroom Assistant
- Nursery Assistant
- Invigilator / Exam Proctor
- Lab Assistant
- Library Assistant
- IT Technician
- Sports Coach
- Music / Arts Instructor
- Bus Driver
- Bus Attendant / Supervisor
- School Nurse
- Caretaker / Janitor
- Cleaner
- Canteen Staff
- Security Guard
- Admissions Officer
- Registrar's Clerk
- Student Records Clerk

**Regulated / certified**
- Licensed Teacher (ministry / board registered)
- Qualified Teacher Status Holder
- Awarding Body Approved Assessor
- Internal / External Verifier (vocational)
- Accreditation Lead (CIS / NEASC / BSO / local ministry)
- Safeguarding / Child Protection Officer (DSL)
- First Aider / Paediatric First Aider
- Health & Safety Officer (campus)
- Examination Centre Administrator (approved)

**Industry-specific support**
- Timetabler / Scheduling Officer
- Fees & Billing Officer
- Scholarship & Bursary Coordinator
- Attendance Officer
- Parent Relations Officer
- Alumni Relations Officer
- Marketing & Enrolment Officer
- Visa & Sponsorship Officer (international students)
- Training Logistics Coordinator
- Certificate & Transcript Officer

---

### 23. Healthcare & Social Services

*Flow: D (Field Service & Installation) primary — equipment install and calibration — G secondary, maintenance. Note the seeded actions are those of a medical-equipment and care-services provider, not a hospital's clinical workflow; both populations are listed because both choose this field.*
*Seeded actions: Consulting & Advisory · Survey & Assessment · Installation · Delivery & Transportation · Testing & Inspection · Training · Operation · Maintenance & Repair.*

**Top administration**
- Chairman / Board of Trustees
- Chief Executive Officer
- Hospital Director / Managing Director
- Chief Medical Officer
- Chief Nursing Officer
- Chief Operating Officer
- Chief Quality & Patient Safety Officer
- Chief Financial Officer
- Medical Director
- Director of Clinical Services
- Director of Nursing
- Director of Allied Health
- Director of Social Care
- Director of Biomedical Engineering
- Director of Facilities & Support Services

**Second line**
- Head of Department (cardiology, surgery, radiology, etc.)
- Head of Emergency Medicine
- Head of Laboratory / Pathology
- Head of Pharmacy
- Head of Radiology & Imaging
- Head of Rehabilitation
- Head of Infection Prevention & Control
- Head of Patient Experience
- Head of Health Information Management
- Head of Medical Equipment / Clinical Engineering
- Head of Home Care Services
- Head of Social Work

**Middle management**
- Clinical Manager
- Nurse Manager
- Ward Manager
- Theatre Manager
- Clinic Manager
- Laboratory Manager
- Pharmacy Manager
- Imaging Manager
- Biomedical Engineering Manager
- Service Manager (equipment field service)
- Quality & Accreditation Manager
- Patient Services / Front Office Manager
- Case Management Manager
- Care Home Manager
- Community Services Manager
- Medical Records Manager

**Supervisory / front line**
- Charge Nurse / Nurse In-Charge
- Shift Supervisor (nursing)
- Senior Technologist (lab / imaging)
- Team Leader (field service engineers)
- Pharmacy Supervisor
- Reception Supervisor
- Housekeeping Supervisor (clinical cleaning)
- Care Team Leader
- Ambulance Crew Leader

**Professional & technical**
- Consultant Physician / Specialist
- Surgeon
- Anaesthetist
- General Practitioner / Family Physician
- Resident / Registrar
- Dentist
- Registered Nurse
- Midwife
- Nurse Practitioner
- Pharmacist
- Clinical Pharmacist
- Radiologist
- Radiographer / Imaging Technologist
- Sonographer
- Medical Laboratory Scientist
- Histopathology Technologist
- Phlebotomist
- Physiotherapist
- Occupational Therapist
- Speech & Language Therapist
- Dietitian / Clinical Nutritionist
- Clinical Psychologist
- Social Worker
- Case Manager
- Infection Control Practitioner
- Clinical Coder
- Health Informatics Analyst
- Biomedical Engineer
- Clinical Engineer
- Medical Physicist
- Field Service Engineer (medical devices)
- Application Specialist (device training)
- Calibration Engineer
- Regulatory Affairs Specialist (medical devices)
- Clinical Research Coordinator
- Quality & Accreditation Officer (JCI / CBAHI / HAAD)
- Health & Safety Officer (clinical)

**Skilled & operational**
- Nursing Assistant / Healthcare Assistant
- Patient Care Technician
- Emergency Medical Technician (EMT)
- Paramedic
- Ambulance Driver
- Operating Theatre Technician
- Sterilisation (CSSD) Technician
- Dental Assistant
- Pharmacy Technician
- Laboratory Technician
- Imaging Assistant
- Medical Equipment Technician
- Installation Technician (medical equipment)
- Spare Parts Coordinator
- Porter / Patient Transport
- Ward Clerk
- Medical Records Clerk
- Receptionist / Patient Registration Clerk
- Insurance & Claims Clerk
- Housekeeping Attendant (clinical)
- Catering Assistant (patient meals)
- Laundry Attendant
- Biomedical Waste Handler
- Care Worker / Home Carer
- Support Worker (disability, elderly)
- Security Officer (hospital)

**Regulated / certified**
- Licensed Physician (medical council registration)
- Licensed Nurse (nursing council registration)
- Licensed Pharmacist
- Licensed Radiographer
- Radiation Protection Supervisor
- Controlled Drugs Custodian
- Infection Prevention Lead (statutory)
- Medical Device Establishment Licence Holder
- Authorised Service Provider (OEM certified engineer)
- Clinical Governance / Accreditation Lead
- Safeguarding Lead (vulnerable adults / children)
- Basic / Advanced Life Support Certified Staff
- Biomedical Waste Licence Officer

**Industry-specific support**
- Appointment & Scheduling Coordinator
- Bed Management Coordinator
- Insurance Pre-Approval Officer
- Revenue Cycle / Medical Billing Officer
- Claims Denial Analyst
- Patient Relations / Complaints Officer
- Medical Equipment Contract Administrator
- Preventive Maintenance Scheduler
- Consumables & Reagents Storekeeper
- Cold Chain Custodian (vaccines, reagents)
- Interpreter / Patient Liaison

---

### 24. Arts, Entertainment & Events

*Flow: A primary, E secondary — stand and stage build, creative work.*
*Seeded actions: Design & Engineering · Procurement & Sourcing · Fabrication / Manufacturing · Assembly · Demolition & Dismantling · Installation · Delivery & Transportation · Testing & Inspection · Operation.*

**Top administration**
- Chairman / Owner
- Chief Executive Officer / Managing Director
- Artistic Director
- Chief Operating Officer
- Events Director
- Production Director
- Venue Director / General Manager
- Director of Programming
- Commercial / Sponsorship Director
- Festival Director
- Head of Exhibitions

**Second line**
- Head of Production
- Head of Technical
- Head of Staging & Rigging
- Head of Fabrication / Workshop
- Head of AV & Broadcast
- Head of Lighting
- Head of Sound
- Head of Event Operations
- Head of Guest Experience
- Head of Ticketing
- Head of Security & Crowd Safety
- Head of Sponsorship & Partnerships

**Middle management**
- Event Manager
- Production Manager
- Project Manager (stand / stage build)
- Technical Manager
- Venue Operations Manager
- Stage Manager
- Exhibition Manager
- Workshop Manager
- Logistics Manager
- Ticketing Manager
- Volunteer Manager
- Artist Liaison Manager
- Site Manager (festival)
- Health & Safety Manager (events)

**Supervisory / front line**
- Deputy Stage Manager
- Crew Chief
- Rigging Supervisor
- Lighting Supervisor
- Sound Supervisor
- Set Build Foreman
- Load-In / Load-Out Supervisor
- Front of House Supervisor
- Security Supervisor
- Ushering Team Leader
- Box Office Supervisor

**Professional & technical**
- Set Designer
- Production Designer
- Exhibition / Stand Designer
- Lighting Designer
- Sound Designer
- Video / Content Designer
- Structural Engineer (temporary structures)
- Rigging Engineer
- AV Systems Engineer
- Show Control Programmer
- Broadcast Engineer
- Pyrotechnics Designer
- Special Effects Technician
- Costume Designer
- Choreographer
- Curator
- Registrar (museum / gallery)
- Conservator
- Event Producer
- Crowd Safety Consultant
- Accessibility Consultant
- Sustainability Coordinator (events)

**Skilled & operational**
- Rigger
- Truss & Stage Builder
- Carpenter / Set Builder
- Scenic Painter
- Metal Fabricator
- Welder
- Stand Builder / Fitter
- Lighting Technician
- Sound Technician
- AV Technician
- LED Wall Technician
- Follow Spot Operator
- Camera Operator
- Stagehand
- Props Handler
- Wardrobe Assistant
- Make-Up Artist
- Forklift / Telehandler Operator
- Truck Driver (production haulage)
- Load Crew / Casual Crew
- Ticket Seller / Box Office Clerk
- Usher
- Steward / Marshal
- Security Guard
- Cleaner (venue turnaround)
- Bar & Concession Staff

**Regulated / certified**
- Temporary Demountable Structures Competent Person
- Certified Rigger / Rigging Inspector
- Crowd Safety Manager (certified)
- Pyrotechnician Licence Holder
- Electrical Competent Person (temporary supplies)
- Working at Height Certified Crew
- Public Entertainment Licence Holder
- Fire Marshal / Event Fire Officer
- Event Medical Cover Coordinator
- Noise & Environmental Permit Officer

**Industry-specific support**
- Event Coordinator
- Exhibitor Services Officer
- Accreditation & Passes Officer
- Ticketing & Access Control Officer
- Artist Travel & Hospitality Coordinator
- Sponsorship Fulfilment Coordinator
- Permits & Municipality Approvals Officer
- Freight & Customs (carnet) Coordinator
- Storage & Asset Controller (stock scenery)
- Volunteer Coordinator

---

### 25. Personal & Other Services

*Flow: D primary, no secondary — "diagnose, repair, deliver, invoice". Repair shops, laundries, salons, funeral services, membership organisations, domestic services.*
*Seeded actions: Survey & Assessment · Installation · Delivery & Transportation · Maintenance & Repair.*

**Top administration**
- Owner / Proprietor
- Managing Director
- General Manager
- Operations Director
- Multi-Site / Area Director
- Franchise Owner
- Chairman of the Association (membership bodies)
- Secretary General (membership bodies)

**Second line**
- Head of Operations
- Head of Service / Technical Services
- Head of Retail & Branches
- Head of Customer Care
- Head of Training & Standards
- Head of Membership (associations)
- Head of Mobile Services

**Middle management**
- Branch Manager
- Salon Manager
- Spa Manager
- Workshop Manager
- Service Centre Manager
- Laundry Plant Manager
- Funeral Home Manager
- Cleaning Services Manager
- Pet Services Manager
- Fleet & Dispatch Manager
- Membership Manager
- Quality & Standards Manager

**Supervisory / front line**
- Shift Supervisor
- Workshop Foreman
- Service Advisor / Front Desk Lead
- Senior Stylist / Chief Technician
- Route Supervisor (collection & delivery)
- Team Leader (mobile technicians)
- Quality Checker

**Professional & technical**
- Service Engineer
- Diagnostic Technician
- Electronics Repair Engineer
- Appliance Engineer
- Estimator (repair quotations)
- Trainer / Assessor (trade skills)
- Health & Safety Officer
- Environmental Officer (chemicals, effluent)
- Membership / Programme Officer (associations)
- Marketing & Loyalty Specialist

**Skilled & operational**
- Repair Technician (mobile phone, computer, appliance)
- Watch & Jewellery Repairer
- Shoe Repairer / Cobbler
- Tailor / Seamstress
- Upholsterer
- Locksmith
- Bicycle Mechanic
- Auto Service Technician
- Tyre Fitter
- Car Wash Attendant
- Laundry Operative
- Dry Cleaning Technician
- Presser
- Ironing Attendant
- Hairdresser / Barber
- Beautician / Aesthetician
- Nail Technician
- Massage Therapist
- Fitness Instructor / Personal Trainer
- Pet Groomer
- Dog Walker / Pet Sitter
- Domestic Cleaner
- Housekeeper
- Nanny / Childminder
- Elderly Companion
- Funeral Director's Assistant
- Embalmer
- Grave Attendant
- Photographer (events, portraits)
- Delivery & Collection Driver
- Receptionist / Booking Clerk
- Cashier
- Storekeeper (spares, consumables)

**Regulated / certified**
- Licensed Cosmetologist / Barber
- Health Card Holder (municipality)
- Massage Therapy Licence Holder
- Embalmer's Licence Holder
- Funeral Services Permit Holder
- Gas Safe / Electrical Appliance Repair Certified Technician
- Refrigerant Handling Certified Technician
- Chemical Handling Certified Operator (dry cleaning solvents)
- Childcare Licence / DBS-Equivalent Cleared Worker
- Food Handler Certificate (where food is served)

**Industry-specific support**
- Booking & Appointments Coordinator
- Job Card Clerk
- Warranty & Insurance Claims Clerk
- Spare Parts Purchasing Clerk
- Customer Feedback Officer
- Loyalty & Membership Clerk
- Route Planner (collection & delivery)
- Chemical & Consumables Controller
- Franchise Standards Auditor

---

## 5. What the twenty-five lists have in common

### 5.1 Eleven archetypes cover most of the operating line

Across all twenty-five fields the same eleven access shapes keep appearing under
different job titles. This is the finding that matters most for the product,
because the product needs **access shapes**, not job titles — and the job titles
number in the low thousands while the shapes number about eleven.

| Archetype | Titles it appears under | What it must be able to do |
|---|---|---|
| **Principal** | Chairman, CEO, MD, Owner, Managing Partner, Director General | Everything. This is `Admin` today. |
| **Department head** | Operations Director, Head of Production, Executive Chef, Chief Nursing Officer, Head of RAN | Full control of one section, sight of the rest. This is `Manager` today. |
| **Winner of work** | Sales Manager, BD Manager, Account Director, Relationship Manager, Leasing Manager | Deals, clients, quotations, pipeline; no cost visibility beyond the quote |
| **Bidder / estimator** | Estimator, Tendering Engineer, Bid Manager, Proposal Manager, Cost Consultant | Tenders, BOQ, rate library, quotations; reads cost, does not approve |
| **Deliverer** | Project Manager, Production Manager, Event Manager, Engagement Manager, Rig Manager | Projects, tasks, timesheets, change orders, inspections |
| **Front-line assigner** | Foreman, Supervisor, Charge Nurse, Crew Chief, Shift Leader | Assigns named people to jobs; edits nothing structural. This is `Team Lead` today. |
| **Doer** | Engineer, Technician, Nurse, Consultant, Operator, Chef | Own records only; raises and edits, deletes nothing. This is `Member` today. |
| **Custodian of things** | Store Keeper, Warehouse Manager, Materials Controller, Pharmacy Technician | Stock, items, sheets, shipments; no financial view |
| **Buyer** | Procurement Manager, Buyer, Subcontracts Administrator | Suppliers, orders, bills up to a limit |
| **Money** | Financial Controller, Chief Accountant, Bursar, Hotel Controller | Ledger, payables, receivables, approvals above the limit |
| **Checker** | QA/QC Inspector, Safety Officer, Compliance Officer, Internal Auditor, Airworthiness Signatory | Reads everything in scope, signs inspections, changes nothing else. **No current starter role fits this.** |

Two of those eleven have no home in the product today:

- **The checker.** Invariant 7 says reviewer is never approver, and the document
  ladder enforces it — but a studio that wants a pure inspector must build one
  by hand out of view rights plus `engineeringDocs.register.review`. Every
  regulated field in this research has at least one statutory checker, and four
  of them (aerospace, oil & gas, healthcare, water) have several.
- **The bidder.** `tendering.tenders` and `tendering.rates` are seeded to
  Manager only. An estimator who is not a manager holds nothing, and estimation
  is a distinct job in fourteen of the twenty-five fields.

### 5.2 What the seniority ladder looks like, everywhere

Every field resolved into the same six rungs, whatever the words:

1. **Governance** — board, owner, trustees, minister
2. **Executive** — CEO / MD / DG / Managing Partner / Hotel GM
3. **Functional head** — Director / Head of / Chief Engineer / Executive Chef
4. **Manager** — of a plant, project, branch, ward, contract, engagement
5. **Supervisor** — foreman, charge hand, shift leader, crew chief, charge nurse
6. **Individual** — professional, technician, operative, agent

The product currently offers **three and a half** of the six: Admin (1–2),
Manager (3–4), Team Lead (5), Member/Viewer (6). Rungs 3 and 4 are collapsed
into one role, which is the gap a studio feels first — a Head of Production and
a Production Manager are not the same access, in any of the twenty-five fields.

### 5.3 Roles that appear in all twenty-five

**Managing Director / CEO, General Manager, Finance Manager, Accountant, HR
Manager, Procurement / Purchasing Officer, Store Keeper, Sales Manager,
Customer Service Representative, IT Support Technician, Quality Officer, HSE /
Safety Officer, Document Controller, Administrative Assistant, Receptionist,
Driver, Security Guard.** Seventeen roles that every one of the twenty-five
fields has. They are not repeated in the per-field sections — that is precisely
what the universal spine (§3) is, and it is why an industry role library should
seed the spine unconditionally and the field's own list on top.

### 5.4 Roles that appear in exactly one field

Useful because they are the ones a generic library would miss: Airworthiness
Review Signatory (aerospace), Loading Master (oil & gas), Technically Competent
Manager for a landfill permit (waste), Shotfirer (mining), Skipper with
Certificate of Competency (fishing), Sharia Supervisory Board Member
(financial services), Designated Safeguarding Lead (education), Embalmer
(personal services), Crowd Safety Manager (events), Known Consignor Security
Officer (logistics), Lawful Interception Officer (telecoms), Escrow Account
Signatory (real estate).

Each exists because a **licence or a statute** creates it, not because a
company chose to. That is the reliable marker for an industry-specific role,
and it is why the "Regulated / certified" tier is in every section.

---

## 6. How this maps onto what the product already has

The permission catalogue holds **139 keys across 15 sections** on `main`
(`tests/gate-a.mjs` asserts the number; the working tree carrying the
in-progress BOQ and rate-library slice asserts 143). Mapping
the archetypes onto the existing area keys, with no new keys invented:

| Archetype | Areas it needs |
|---|---|
| Winner of work | `crmSales.tickets` full · `crmSales.clients` full · `crmSales.quotations` edit · `crmSales.pipeline` view · `crmSales.dashboard` view |
| Bidder / estimator | `tendering.tenders` full · `tendering.rates` full · `crmSales.quotations` create · `inventory.items` view · `engineeringDocs.rfq` view |
| Deliverer | `projects.list` full · `projects.planner` edit · `projects.sla` edit · `tasks.board` full · `inventory.sheets` edit · `crmSales.contracts` view |
| Front-line assigner | `tasks.board` full · `fieldService.schedule` edit · `fieldService.tracking` edit · `projects.list` view · `hr.vacations` view (own) |
| Custodian of things | `inventory.stock` full · `inventory.items` full · `inventory.sheets` edit · `logistics.shipments` edit |
| Buyer | `procurement.suppliers` full · `finance.payables` create+edit · `inventory.items` view |
| Money | `finance.ledger` view+post · `finance.payables` full + `approve` · `finance.cash` full · `finance.assets` full · `finance.settings` edit |
| Checker | `engineeringDocs.register` view + `review` · `projects.list` view · `fieldService.tracking` view · `inventory.sheets` view — **and nothing else** |

Everything an eleven-role starter set would need **already exists as a
permission key**. That is the useful conclusion: this is a seeding problem, not
a catalogue problem.

### 6.1 The blocker, stated plainly

`listRoles` seeds `STARTER_ROLES` **only when a studio has zero roles**:

```
const rows = await readArr<Role>(S.roles(studioId));
if (rows.length) return rows;
```

So an industry-aware starter set reaches **new studios only**. Every existing
studio keeps the five it has, and the owner never notices because
`effectivePermissions` short-circuits on `role === "owner"`. CLAUDE.md already
records this as an open gap for `crmSales.pipeline`, `crmSales.contracts` and
`tendering.tenders`; an industry role library makes it three times worse rather
than introducing it. `scripts/migrate/grant-administration.mjs` is the pattern
for the fix and there is no equivalent yet.

### 6.2 The second blocker

**Nothing stores a job title.** The HR employee record has no `position`, no
`jobTitle` and no `department`; `roleNames` on it resolves from the permission
role. So today the only way to say "Ahmed is a Site Engineer" is to name a
permission role "Site Engineer" — which conflates the two axes that
`roles.ts` deliberately separated, and does it in the direction the comment
warns about.

If the outcome of this research is a role library, it has to decide which axis
it lands on. The three options:

1. **Seeded permission roles per industry.** ~8–12 roles per field, chosen from
   the archetypes, named in that field's vocabulary ("Site Engineer" for
   construction, "Charge Nurse" for healthcare). Highest value, and it changes
   what people can do, so it needs the backfill script from §6.1.
2. **A job-title taxonomy on the HR record**, separate from access. The full
   ~1,500 titles below become a picker; access stays on the eleven archetypes.
   Cheapest, changes no permission, and answers "who does what" without
   touching "who may do what".
3. **Both, joined.** A title suggests a role at hire time; the suggestion is
   overridable and the two stay separate records. Most work, and the only option
   that makes the research pay twice.

---

## 7. Counts

Counted from this file rather than estimated — every `- ` bullet under a field's
eight tiers, and under the spine's eight groups.

| Field | Roles listed |
|---|---|
| Universal spine (§3) | 135 |
| 1. Agriculture, Forestry & Fishing | 110 |
| 2. Mining & Quarrying | 113 |
| 3. Manufacturing | 114 |
| 4. Industrial Automation & Robotics | 84 |
| 5. Automotive & Aerospace Manufacturing | 119 |
| 6. Energy & Utilities (Electricity, Gas) | 121 |
| 7. Oil, Gas & Petrochemicals (EPC) | 145 |
| 8. Water Supply, Sewerage & Waste Management | 118 |
| 9. Construction & Contracting | 154 |
| 10. Wholesale & Retail Trade | 105 |
| 11. Transportation, Logistics & Storage | 115 |
| 12. Hospitality & Food Services | 112 |
| 13. Information Technology & Software | 116 |
| 14. Telecommunications | 111 |
| 15. Media, Publishing & Creative Production | 115 |
| 16. Financial Services & Insurance | 126 |
| 17. Real Estate & Property Development | 105 |
| 18. Professional, Scientific & Technical Services | 112 |
| 19. Management Consulting | 75 |
| 20. Administrative & Support Services | 108 |
| 21. Public Administration & Defense | 119 |
| 22. Education & Training | 110 |
| 23. Healthcare & Social Services | 139 |
| 24. Arts, Entertainment & Events | 116 |
| 25. Personal & Other Services | 96 |

**2,858** entries across the twenty-five fields, plus the **135** in the
universal spine that all of them share: **2,993** in total. Distinct titles are
fewer — duplication across fields is deliberate and was asked for.

The widest fields are Construction (154), Oil & Gas (145) and Healthcare (139);
the narrowest are Management Consulting (75) and Industrial Automation (84).
Against the seeded service-action counts in §1.1 the correlation is loose, not
clean: Management Consulting is narrowest on both (3 actions, 75 roles), but
Industrial Automation carries 13 actions on one of the smallest role counts,
which is what a specialist integrator actually looks like — many kinds of work,
few kinds of people.

---

## 8. Not built yet

Stated in words, because a silent gap reads as a finished feature.

- **Nothing in this file is in the code.** No permission key, no seeded role, no
  HR field, no picker, no migration.
- **The four label mismatches between `fieldsOfWork.ts` and
  `platform/engagement/industries.ts` are not fixed**, and the 41-entry
  onboarding list in `src/lib/industries.ts` is still a third, unreconciled
  taxonomy.
- **There is no job-title / position field** on the HR employee record, and
  nothing stores a department against a person.
- **There is no per-industry starter role set**, and `listRoles` could not
  deliver one to an existing studio if there were.
- **There is no "checker" or "estimator" starter role**, so those two archetypes
  must be hand-built by whoever needs them.
- **The counts in §7 are of this document's own lines**, not of any market
  survey's sample size — they say how complete this list is, not how many people
  hold each job.
