// Structured content for the public /terms page. The legal body is authored in
// English (the authoritative language per §20.7); the page chrome (hero, labels,
// notes) is localized via the i18n dictionary. Keeping the terms here — rather
// than inline in the page — keeps the route file small and the text reviewable
// in one place. Mirror any change here into legal/terms-and-conditions.md.

export const TERMS_META = {
  version: "1.0",
  effective: "07/08/2026",
  updated: "07/08/2026",
};

// Block shapes:
//   { type: "p", lead?, text }            paragraph (optional bold lead-in)
//   { type: "ul", items: [] }             bullet list
//   { type: "h3", text }                  sub-heading
//   { type: "table", head: [], rows: [] } data table
export const TERMS_SECTIONS = [
  {
    id: "acceptance",
    title: "1. Introduction and acceptance",
    blocks: [
      { type: "p", text: 'These Terms and Conditions of Service (the "Terms") form a binding legal agreement between nompany, the provider of the nompany ERP platform ("nompany", "we", "us", "our"), and the organisation or individual that registers for, accesses, or uses that platform (the "Customer", "you", "your").' },
      { type: "p", text: 'The "Service" means the nompany modular enterprise resource planning (ERP) software-as-a-service platform, including its web application, APIs, associated modules (such as Sales, Projects, Inventory, HR/Employees, Finance, Operations and Logistics), documentation, and support, made available on a subscription basis.' },
      { type: "p", text: 'By creating an account, clicking "I accept", signing an Order Form, or otherwise accessing or using the Service, you confirm that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must not access or use the Service.' },
      { type: "p", text: 'If you accept these Terms on behalf of an organisation, you represent and warrant that you have authority to bind that organisation, and "you" refers to that organisation.' },
      { type: "p", lead: "Order of precedence.", text: 'These Terms incorporate by reference the following, which together form the "Agreement": (a) any executed Order Form or subscription confirmation; (b) the Data Processing Agreement ("DPA"); (c) the Service Level Agreement ("SLA"); (d) the Acceptable Use Policy; and (e) our Privacy Notice. In the event of conflict, these documents govern in the order listed, with the Order Form taking highest precedence, except that the DPA prevails on matters of personal-data protection.' },
    ],
  },
  {
    id: "definitions",
    title: "2. Definitions",
    blocks: [
      { type: "ul", items: [
        '"Authorised User" — an employee, contractor, or agent of the Customer whom the Customer permits to access the Service under its account.',
        '"Customer Data" — all data, content, and information (including personal data) that the Customer or its Authorised Users submit to, store in, or generate through the Service.',
        '"Personal Data", "Processing", "Controller", "Processor", "Data Subject", and "Supervisory Authority" — have the meanings given in Applicable Data Protection Law.',
        '"Applicable Data Protection Law" — all data protection and privacy laws applicable to the Processing of Personal Data under the Agreement, including the EU General Data Protection Regulation (Regulation (EU) 2016/679, "EU GDPR"), the UK GDPR and the Data Protection Act 2018, and any other applicable data protection laws in the EMEA region.',
        '"Order Form" — the ordering document or online checkout specifying the subscribed modules, plan tier, number of seats/Authorised Users, term, and fees.',
        '"Subscription Term" — the period for which the Customer has paid for or committed to the Service, as set out in the Order Form.',
        '"Sub-processor" — a third party engaged by nompany to Process Customer Personal Data.',
        '"Payment Processor" — a third-party payment-services provider engaged by nompany to process payment transactions.',
      ] },
    ],
  },
  {
    id: "registration",
    title: "3. Eligibility and account registration",
    blocks: [
      { type: "p", text: "The Service is intended for business and professional use only. You must be at least 18 years old (or the age of majority in your jurisdiction) and legally capable of entering into a binding contract." },
      { type: "p", text: "You must provide accurate, current, and complete registration information and keep it up to date. We may refuse registration or cancel an account at our discretion where information is false, or where use would breach these Terms or applicable law." },
      { type: "p", lead: "Account security.", text: "You are responsible for safeguarding credentials and for all activity under your account and those of your Authorised Users. You must enable available security controls (including multi-factor authentication where offered), keep credentials confidential, and notify us without undue delay at info@nompany.com of any suspected unauthorised access or security incident affecting your account." },
      { type: "p", text: "Each set of login credentials is personal to a single Authorised User and must not be shared. You are responsible for ensuring your Authorised Users comply with these Terms." },
    ],
  },
  {
    id: "subscriptions",
    title: "4. Subscriptions, licences, and modules",
    blocks: [
      { type: "p", lead: "Licence grant.", text: "Subject to the Agreement and payment of applicable fees, nompany grants the Customer a non-exclusive, non-transferable, non-sublicensable, revocable right to access and use the Service and subscribed modules during the Subscription Term, solely for the Customer's internal business operations." },
      { type: "p", lead: "Modular subscriptions.", text: "The Service is modular. You may subscribe to and de-subscribe from individual modules subject to the applicable plan and fees. Enabling a module may make additional terms or configuration requirements applicable, which will be presented at activation." },
      { type: "p", lead: "Free tier, seats, and fair use.", text: 'A free tier is available for up to five (5) Authorised Users and requires no payment card. Where a plan is priced per Authorised User ("seat"), you must maintain a valid subscription for each individual accessing the Service. You may reassign a seat to a new user when a prior user no longer requires access, but seats must not be used as generic or shared logins. We may audit usage on reasonable notice to verify compliance.' },
      { type: "p", lead: "Restrictions.", text: "You must not, and must not permit any third party to: (a) resell, rent, lease, or provide the Service to third parties except as expressly permitted; (b) reverse engineer, decompile, or attempt to derive source code, except to the extent this restriction is prohibited by law; (c) copy, modify, or create derivative works of the Service; (d) circumvent usage limits, security, or access controls; (e) use the Service to build a competing product; or (f) remove or obscure any proprietary notices." },
      { type: "p", lead: "Beta and preview features.", text: 'Features labelled beta, preview, trial, or experimental are provided "as is", may be changed or withdrawn at any time, and are excluded from the SLA and from certain warranties.' },
    ],
  },
  {
    id: "payments",
    title: "5. Payments, fees, discounts, and refunds",
    blocks: [
      { type: "p", lead: "Fees.", text: "You agree to pay the fees stated in the applicable Order Form or on the pricing page for the plan and modules selected. Unless stated otherwise, fees for the paid tiers are billed per Authorised User." },
      { type: "p", lead: "Currency and invoicing.", text: "Fees are charged in the currency stated at checkout or on the Order Form; where amounts are shown in more than one currency, the currency of the charge governs. We issue an invoice for each charge, available in your account." },
      { type: "p", lead: "Billing cycle and renewals.", text: "Paid subscriptions are billed in advance on a monthly or annual basis as selected, and renew automatically for successive periods equal to the initial Subscription Term unless cancelled. You may disable auto-renewal or cancel at any time from your account settings or by written notice at least thirty (30) days before the next renewal date. Any usage-based or overage charges are billed in arrears." },
      { type: "p", lead: "Payment methods and Payment Processor.", text: "Online payments are handled by a third-party Payment Processor. By providing a payment method you authorise us and our Payment Processor to charge the applicable fees, including recurring charges on renewal. nompany does not store your full card number (PAN); card data is captured and held directly by the PCI-DSS-compliant Payment Processor, and nompany retains only a payment token, card brand, expiry, and the last four digits for billing and fraud-prevention purposes. You are responsible for keeping payment details current." },
      { type: "p", lead: "Taxes.", text: "Fees are exclusive of taxes unless stated. You are responsible for all applicable taxes, duties, and levies, including any applicable value added tax (VAT), goods and services tax (GST), or sales tax at the prevailing rate in your jurisdiction, except taxes on nompany's net income. Where a reverse-charge, exemption, or zero-rating applies, you must provide a valid tax registration number; otherwise the applicable tax will be added." },
      { type: "p", lead: "Discounts, promotions, and credits.", text: "From time to time we may offer discounts, promotional pricing, trial extensions, or account credits. Unless stated otherwise: (a) a promotion applies to the initial term only and pricing reverts to the then-current standard rate on renewal; (b) promotions cannot be combined, are non-transferable, have no cash value, and are limited to one per customer; (c) account credits are applied to future invoices, are non-refundable, and are not redeemable for cash; and (d) we may modify or withdraw any offer prospectively at any time. Annual (yearly) billing is offered at a discount to the equivalent monthly rate, as shown at checkout." },
      { type: "p", lead: "Failed payments and suspension.", text: "If a charge fails, we may retry the payment method and will notify you. If fees remain unpaid fifteen (15) days after the due date, we may suspend access to paid modules following notice, until the outstanding amount is settled. We do not charge interest on late payments; we may, however, recover reasonable, documented costs of collection where permitted by law. Suspension does not relieve you of the obligation to pay accrued fees." },
      { type: "p", lead: "Refunds and cancellation.", text: "Except where required by mandatory law or expressly stated in an Order Form, fees already paid are non-refundable, and cancelling a subscription does not entitle you to a refund or credit for the remainder of a paid period; your paid access continues until the end of the current term. Partial months are not pro-rated. Downgrades take effect at the next renewal. The free tier can be cancelled at any time. Nothing in this clause limits any non-excludable statutory right you may have." },
      { type: "p", lead: "Chargebacks and payment disputes.", text: "If you believe a charge is incorrect, contact us at info@nompany.com within sixty (60) days of the invoice date so we can investigate in good faith. Initiating a chargeback or payment reversal without first contacting us may result in suspension. Where a chargeback is later found to be unwarranted, the disputed amount together with any Payment Processor fees remains payable." },
      { type: "p", lead: "Price changes.", text: "We may change standard fees effective from your next renewal, with at least thirty (30) days' prior notice. Continued use after the change takes effect constitutes acceptance; if you do not agree, you may cancel before the change applies." },
    ],
  },
  {
    id: "acceptable-use",
    title: "6. Customer responsibilities and acceptable use",
    blocks: [
      { type: "p", text: "You are responsible for: (a) the accuracy, quality, and legality of Customer Data and the means by which you acquired it; (b) obtaining all consents and rights necessary for us to Process Customer Data to provide the Service; (c) configuring the Service (roles, permissions, retention settings, integrations) appropriately for your needs; and (d) maintaining suitable backups of business-critical data you also hold outside the Service." },
      { type: "p", lead: "Acceptable Use.", text: "You must not use the Service to: (a) violate any law or third-party right; (b) upload malware or interfere with the integrity or performance of the Service; (c) gain unauthorised access to any system or data; (d) transmit unlawful, defamatory, or infringing content; (e) send unsolicited communications in breach of anti-spam laws; or (f) Process special categories of data or children's data except in compliance with Applicable Data Protection Law and, where required, with our prior written agreement." },
      { type: "p", text: "We may investigate suspected violations and cooperate with lawful authority. We may remove or disable content, or suspend access, where we reasonably believe it is unlawful or breaches these Terms." },
    ],
  },
  {
    id: "ip",
    title: "7. Intellectual property",
    blocks: [
      { type: "p", lead: "nompany IP.", text: "nompany and its licensors retain all right, title, and interest in and to the Service, including all software, APIs, documentation, look and feel, and all improvements and derivatives. No rights are granted except the limited licence in Section 4." },
      { type: "p", lead: "Customer Data.", text: "As between the parties, the Customer retains all right, title, and interest in Customer Data. You grant nompany a worldwide, non-exclusive licence to host, copy, transmit, display, and Process Customer Data solely to provide, secure, and support the Service and as instructed under the DPA." },
      { type: "p", lead: "Feedback.", text: "If you provide suggestions or feedback, you grant nompany a perpetual, irrevocable, royalty-free licence to use it without restriction. We will not identify you as the source without consent." },
      { type: "p", lead: "Aggregated/anonymised data.", text: "We may generate and use aggregated or anonymised data (that does not identify you, any individual, or your Customer Data) to operate, improve, and benchmark the Service, provided such data cannot reasonably be re-identified." },
    ],
  },
  {
    id: "availability",
    title: "8. Service availability, support, and service levels",
    blocks: [
      { type: "p", lead: "Availability target.", text: 'We will use commercially reasonable efforts to make the Service available at a monthly uptime of 99.5% (the "Availability Target"), excluding Scheduled Maintenance and events outside our reasonable control.' },
      { type: "p", lead: "Scheduled maintenance.", text: "We will endeavour to give at least 48 hours' advance notice of planned maintenance and to schedule it during low-usage windows." },
      { type: "p", lead: "Support and customer satisfaction.", text: "We are committed to your success and satisfaction. Support is provided according to your plan tier, with the following target initial response times:" },
      { type: "table", head: ["Severity", "Description", "Target initial response"], rows: [
        ["P1 — Critical", "Service unavailable or major module unusable, no workaround", "2 business hours"],
        ["P2 — High", "Significant feature impaired, workaround exists", "1 business day"],
        ["P3 — Normal", "Minor issue or general question", "2 business days"],
        ["P4 — Low", "Feature request or cosmetic issue", "Best efforts"],
      ] },
      { type: "p", lead: "Service credits.", text: "Where uptime falls below the Availability Target in a billing month, you may request service credits as set out in the SLA. Service credits are your sole and exclusive remedy for availability failures." },
      { type: "p", lead: "Feedback and continuous improvement.", text: "We welcome feedback and maintain reasonable channels (in-app, email, or account management) to receive and act on it as part of our commitment to customer satisfaction." },
    ],
  },
  {
    id: "data-protection",
    title: "9. Data protection and privacy (EMEA)",
    blocks: [
      { type: "p", lead: "Roles.", text: "For Customer Data that is Personal Data, the Customer is the Controller and nompany acts as Processor (or, where the Customer is itself a processor, as sub-processor). Each party will comply with its obligations under Applicable Data Protection Law." },
      { type: "p", lead: "Processing under the DPA.", text: "nompany will Process Personal Data only: (a) to provide, secure, and support the Service; (b) on the Customer's documented instructions (including as set out in the Agreement); and (c) as required by law, in which case we will notify you unless legally prohibited. The Data Processing Agreement (Annex A) governs these obligations and prevails over any conflicting term on data protection." },
      { type: "p", lead: "Security measures.", text: "nompany implements appropriate technical and organisational measures designed to protect Personal Data, including: encryption of data in transit (TLS) and at rest; role-based access controls and least-privilege administration; field-level encryption for sensitive identifiers (such as national ID and passport numbers); network segmentation; logging and monitoring; secure development practices; and regular backups. A summary is available on request." },
      { type: "p", lead: "Sub-processors.", text: "You authorise nompany to engage Sub-processors (including its Payment Processor and hosting provider) to Process Personal Data, provided each is bound by data-protection obligations no less protective than those in the DPA. We maintain a current list of Sub-processors and will give notice of intended changes, allowing you a reasonable opportunity to object on legitimate data-protection grounds." },
      { type: "p", lead: "International transfers.", text: "Where Personal Data is transferred across borders (including outside the EEA or the UK), we will implement a lawful transfer mechanism — such as the European Commission's Standard Contractual Clauses and the UK International Data Transfer Agreement/Addendum — together with any supplementary measures required, and equivalent safeguards under any other applicable EMEA data protection law." },
      { type: "p", lead: "Data subject rights.", text: "Taking into account the nature of Processing, nompany will provide reasonable assistance (including appropriate technical measures in the Service) to help the Customer respond to Data Subject requests to exercise rights of access, rectification, erasure, restriction, portability, and objection." },
      { type: "p", lead: "Personal data breach.", text: "nompany will notify the Customer without undue delay, and in any event within 72 hours of becoming aware, of any confirmed Personal Data breach affecting Customer Personal Data, and will provide information reasonably necessary for the Customer to meet its own notification obligations to Supervisory Authorities and Data Subjects." },
      { type: "p", lead: "Audits.", text: "On reasonable prior written notice and no more than once per year (unless required by a Supervisory Authority or following a breach), nompany will make available information necessary to demonstrate compliance with the DPA, and will allow for and contribute to audits, subject to appropriate confidentiality and security safeguards." },
      { type: "p", lead: "Records and privacy contact.", text: "Data-protection enquiries may be directed to our privacy contact at info@nompany.com. Where required, we maintain records of Processing activities." },
    ],
  },
  {
    id: "retention",
    title: "10. Data retention and deletion",
    blocks: [
      { type: "p", lead: "Principle.", text: "nompany retains Customer Data only for as long as necessary to provide the Service, comply with legal obligations, resolve disputes, and enforce agreements — consistent with the storage-limitation and data-minimisation principles of Applicable Data Protection Law." },
      { type: "p", lead: "Customer control.", text: "You control the primary retention of your business records within the Service through configuration, module retention settings, and manual deletion. Where you delete a record, it is removed from the active Service and flagged for deletion from backups in the ordinary backup-expiry cycle." },
      { type: "p", lead: "Standard retention schedule.", text: "Unless a different period is agreed in an Order Form or required by law, the following default periods apply:" },
      { type: "table", head: ["Data category", "Retention period", "Trigger"], rows: [
        ["Active Customer Data (records within subscribed modules)", "Duration of the Subscription Term", "Ongoing use"],
        ["Customer Data after termination/expiry (export window)", "30 days from termination", "End of subscription"],
        ["Customer Data after the export window (deletion)", "Deleted within 90 days of termination", "End of subscription"],
        ["Encrypted backups / disaster-recovery snapshots", "Rolling 35 days, then automatic expiry", "Backup cycle"],
        ["Invoices, billing and tax records", "10 years", "Legal / tax obligation"],
        ["Payment transaction metadata (token, card brand, last 4 digits, authorisation records)", "Subscription Term + up to 24 months", "Fraud-prevention / accounting"],
        ["Full card number (PAN)", "Not stored by nompany — held by the PCI-DSS Payment Processor", "N/A"],
        ["Authentication & security logs (audit trail)", "12 months (longer if required for a security investigation)", "Security / compliance"],
        ["Support tickets & correspondence", "24 months from ticket closure", "Service records"],
        ["Marketing / consent records (where applicable)", "Until consent withdrawn, plus the minimum required by law", "Consent lifecycle"],
        ["Anonymised / aggregated data", "Retained indefinitely (non-identifying)", "N/A"],
      ] },
      { type: "p", lead: "Legal holds.", text: 'Where retention is required by law, regulatory obligation, or an active legal claim ("legal hold"), the affected data may be retained beyond the periods above until the obligation or claim is resolved, after which standard deletion resumes.' },
      { type: "p", lead: "Deletion on termination.", text: "Following the export window in Section 12, nompany will delete or irreversibly anonymise Customer Personal Data in active systems and, on written request, certify deletion — except for copies (a) in routine backups pending scheduled expiry, or (b) required to be retained by law (such as billing and tax records), which remain protected by the confidentiality and security terms of the Agreement until deleted." },
      { type: "p", lead: "Backups.", text: "Backups exist for resilience and disaster recovery, not for selective per-record restoration, and expire automatically on the cycle in the table above. Data marked for deletion is not restored from backups except in a genuine disaster-recovery scenario, after which it is re-deleted." },
    ],
  },
  {
    id: "confidentiality",
    title: "11. Confidentiality",
    blocks: [
      { type: "p", text: 'Each party may receive "Confidential Information" of the other, including the terms of the Agreement and business, technical, and security information. The receiving party will use it only to perform under the Agreement, protect it with at least reasonable care, and not disclose it except to personnel and advisers with a need to know who are bound by confidentiality.' },
      { type: "p", text: "Confidentiality obligations do not apply to information that is or becomes public without breach, was lawfully known before disclosure, is independently developed, or is lawfully received from a third party. Disclosure required by law is permitted with, where lawful, prior notice to the disclosing party." },
    ],
  },
  {
    id: "termination",
    title: "12. Suspension, termination, and post-termination",
    blocks: [
      { type: "p", lead: "Termination for convenience.", text: "Either party may elect not to renew at the end of a Subscription Term per Section 5. Except as stated in an Order Form, fees for the current term remain payable and non-refundable." },
      { type: "p", lead: "Termination for cause.", text: "Either party may terminate the Agreement on written notice if the other: (a) materially breaches and fails to cure within thirty (30) days of notice; or (b) becomes insolvent, enters administration, or ceases business." },
      { type: "p", lead: "Suspension.", text: "We may suspend access, in whole or part, where: (a) required by law; (b) there is a material security risk; (c) your use threatens the integrity or performance of the Service; or (d) fees are materially overdue. We will limit the scope and duration of suspension to what is reasonably necessary and, where practicable, give prior notice." },
      { type: "p", lead: "Data export window.", text: "For 30 days after termination or expiry, and provided fees are paid, you may export Customer Data in a commonly used, machine-readable format via self-service export tools or, on request, with reasonable assistance." },
      { type: "p", lead: "Effect of termination.", text: "On termination: (a) all licences end and you must cease use; (b) accrued fees become due; (c) Customer Data is handled per Section 10 (Data Retention and Deletion); and (d) clauses that by their nature should survive (including payment obligations, IP, confidentiality, liability, data protection, and governing law) survive." },
    ],
  },
  {
    id: "warranties",
    title: "13. Warranties and disclaimers",
    blocks: [
      { type: "p", lead: "Mutual.", text: "Each party warrants it has authority to enter into the Agreement." },
      { type: "p", lead: "nompany warranty.", text: "nompany warrants that the Service will perform materially in accordance with its documentation during the Subscription Term, and that it will provide the Service with reasonable skill and care." },
      { type: "p", lead: "Disclaimer.", text: 'Except as expressly stated and to the maximum extent permitted by law, the Service is provided "as is" and "as available", and nompany disclaims all other warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or that it will meet requirements not agreed in writing. Nothing in these Terms excludes liability or rights that cannot be excluded under mandatory law.' },
    ],
  },
  {
    id: "liability",
    title: "14. Limitation of liability",
    blocks: [
      { type: "p", lead: "Excluded losses.", text: "To the maximum extent permitted by law, neither party is liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, revenue, goodwill, or anticipated savings, arising out of or related to the Agreement." },
      { type: "p", lead: "Cap.", text: "Each party's total aggregate liability arising out of or related to the Agreement in any 12-month period will not exceed the total fees paid or payable by the Customer for the Service in that period." },
      { type: "p", lead: "Exceptions.", text: "The exclusions and cap in this Section do not apply to: (a) death or personal injury caused by negligence; (b) fraud or fraudulent misrepresentation; (c) a party's indemnification obligations; (d) breach of confidentiality; (e) the Customer's payment obligations; or (f) any liability that cannot be limited under applicable law." },
      { type: "p", text: "This Section allocates risk between the parties and is reflected in the fees. It does not limit statutory data-protection liability owed directly to Data Subjects or Supervisory Authorities under Applicable Data Protection Law." },
    ],
  },
  {
    id: "indemnification",
    title: "15. Indemnification",
    blocks: [
      { type: "p", lead: "By nompany.", text: "nompany will defend the Customer against third-party claims that the Service, as provided and used in accordance with the Agreement, infringes that third party's intellectual property rights, and will indemnify against damages finally awarded, subject to the Customer promptly notifying us, granting control of the defence, and providing reasonable cooperation. This does not apply to claims arising from Customer Data, unauthorised use, or combination with non-nompany products." },
      { type: "p", lead: "By the Customer.", text: "The Customer will defend and indemnify nompany against third-party claims arising from Customer Data or the Customer's breach of Sections 4 (Restrictions), 6 (Acceptable Use), or its data-protection representations." },
    ],
  },
  {
    id: "third-party",
    title: "16. Third-party services and integrations",
    blocks: [
      { type: "p", text: "The Service may interoperate with third-party services (such as payment, email, mapping, or storage providers). Your use of those services is governed by their own terms, and nompany is not responsible for third-party services. Enabling an integration authorises the exchange of relevant Customer Data necessary for the integration to function." },
    ],
  },
  {
    id: "changes",
    title: "17. Changes to the Terms and the Service",
    blocks: [
      { type: "p", lead: "Terms.", text: "We may update these Terms from time to time. For material changes, we will provide at least thirty (30) days' notice by email or in-app notice. Changes take effect at the end of the notice period; continued use constitutes acceptance. If you object to a material change, you may terminate before it takes effect as your exclusive remedy." },
      { type: "p", lead: "Service.", text: "We may modify, add, or remove features to improve the Service, provided we do not materially reduce the core functionality of a subscribed module during a paid term without an equivalent alternative." },
    ],
  },
  {
    id: "force-majeure",
    title: "18. Force majeure",
    blocks: [
      { type: "p", text: "Neither party is liable for failure or delay in performance (other than payment obligations) caused by events beyond its reasonable control, including acts of God, natural disasters, war, terrorism, civil unrest, government action, epidemics, failures of utilities or telecommunications, or third-party infrastructure outages. The affected party will use reasonable efforts to mitigate and resume performance." },
    ],
  },
  {
    id: "governing-law",
    title: "19. Governing law and dispute resolution",
    blocks: [
      { type: "p", lead: "Governing law.", text: "The governing law of the Agreement, and the courts having jurisdiction over it, will be those of nompany's jurisdiction of establishment, and will be confirmed in these Terms once the company's incorporation is finalised. Until then, the parties will act in good faith. Regardless of the governing law ultimately specified, nompany applies data-protection standards consistent with the EU GDPR and UK GDPR to all Customers (see Section 9)." },
      { type: "p", lead: "Jurisdiction.", text: "Once confirmed under the clause above, the competent courts of nompany's jurisdiction of establishment will have exclusive jurisdiction, except that either party may seek injunctive relief before any court of competent jurisdiction to protect its intellectual property or Confidential Information." },
      { type: "p", lead: "Escalation.", text: "Before commencing proceedings, the parties will attempt in good faith to resolve disputes through senior-management escalation within thirty (30) days." },
      { type: "p", lead: "Data-protection remedies.", text: "Nothing in this Section limits a Data Subject's right to lodge a complaint with, or seek a remedy from, the competent Supervisory Authority." },
    ],
  },
  {
    id: "general",
    title: "20. General",
    blocks: [
      { type: "p", lead: "Entire agreement.", text: "The Agreement is the entire agreement between the parties on its subject matter and supersedes prior discussions, subject to any mandatory statutory rights." },
      { type: "p", lead: "Assignment.", text: "You may not assign the Agreement without our prior written consent (not unreasonably withheld). We may assign to an affiliate or in connection with a merger, acquisition, or sale of assets, on notice." },
      { type: "p", lead: "Notices.", text: "Notices must be in writing and sent to the contact details on the Order Form or account, and to nompany at info@nompany.com. Notices are deemed received on delivery (email: on confirmed transmission during business hours)." },
      { type: "p", lead: "Severability.", text: "If any provision is held unenforceable, it will be modified to the minimum extent necessary, and the remaining provisions continue in effect." },
      { type: "p", lead: "Waiver.", text: "No failure or delay in exercising a right is a waiver, and no waiver is effective unless in writing." },
      { type: "p", lead: "No partnership.", text: "Nothing in the Agreement creates a partnership, agency, or joint venture between the parties." },
      { type: "p", lead: "Language.", text: "These Terms are published in English and Arabic. The English version is the authoritative text; in the event of any conflict, the English version prevails unless mandatory local law requires otherwise." },
    ],
  },
  {
    id: "annex-a",
    title: "Annex A — Data Processing Summary",
    blocks: [
      { type: "p", text: "Summary of the Data Processing Agreement referenced in Section 9. A full DPA is executed separately." },
      { type: "table", head: ["Item", "Detail"], rows: [
        ["Subject matter", "Provision of the nompany ERP Service"],
        ["Duration", "The Subscription Term plus applicable retention/deletion periods (Section 10)"],
        ["Nature and purpose", "Hosting, processing, and support of Customer Data to deliver ERP functionality"],
        ["Types of Personal Data", "Contact details; employment/HR data; identifiers (e.g., national ID, passport — encrypted); financial, payment and operational records; usage/log data"],
        ["Categories of Data Subjects", "The Customer's employees, contractors, customers, suppliers, and other business contacts"],
        ["Controller", "The Customer"],
        ["Processor", "nompany"],
        ["Sub-processors", "Per the published Sub-processor list (Section 9), including the hosting provider and Payment Processor"],
        ["International transfers", "Safeguarded per Section 9 (SCCs / UK IDTA / equivalent)"],
        ["Security measures", "Per Section 9"],
        ["Deletion/return", "Per Sections 10 and 12"],
      ] },
    ],
  },
];
