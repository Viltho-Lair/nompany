// THE APPROVAL TYPES — every kind of thing the product asks somebody to approve.
//
// PLUG AND PLAY, the owner's phrase (19/09/2026): a feature that needs an
// approval adds ONE row here and a Request approval button on its record. It then
// appears in Approvals settings to be assigned, and its requests appear on the
// Approvals page — nobody creates anything by hand for it.
//
// A KEY IS STORED on every approval and every studio's settings, so renaming one
// is a data migration, not a label edit.
//
// Each of the first seven gets its Request approval button, and a source
// record, as it is wired (docs/progress.md). `carried` is not requestable: it
// holds only the hand-written items converted from the old board when
// Approvals replaced it.

/**
 * ONE STEP AS IT WAS ANSWERED BEFORE THIS TYPE MOVED ONTO APPROVALS: a right,
 * and the amount it started at. Read for one thing only — the steps a studio
 * that has not set this type up yet gets by default (`defaultSetting` in
 * ./approvals): the people who hold that right TODAY. The owner, 19/09/2026:
 * seed each type with the people who hold today's right, so nothing stops the
 * day a type moves. Saving the type in Approvals settings replaces it for good.
 */
export type LegacyStep = { readonly permission: string; readonly from: number; readonly label: string };

export type ApprovalTypeDef = {
  readonly key: string;
  readonly label: string;
  /** False only for `carried` — nothing may raise one. */
  readonly requestable: boolean;
  /**
   * CARRIES AN AMOUNT, so a step may start at a threshold (`from`). A request
   * of such a type says what it is worth; one whose steps all start at 0 is
   * never converted and never needs the studio's currency.
   */
  readonly amounted?: boolean;
  /**
   * The old chain in Studio settings → Approvals this type replaces, so a studio
   * that had moved its limits keeps them in its default steps.
   */
  readonly legacyChain?: string;
  /** The steps it had before — see LegacyStep. */
  readonly legacy?: readonly LegacyStep[];
  /**
   * NOBODY ANSWERS TWO STEPS OF ONE REQUEST — invariant 7's reviewer ≠ approver,
   * kept where the steps ARE two different acts (a document is reviewed, then
   * approved). Everywhere else the same person may be named on two steps.
   */
  readonly distinctSigners?: boolean;
};

export const APPROVAL_TYPES: readonly ApprovalTypeDef[] = [
  { key: "quotation", label: "Quotation approval", requestable: true },
  { key: "client-po", label: "Client purchase order", requestable: true },
  { key: "material-po", label: "Material purchase order", requestable: true },
  { key: "delivery", label: "Delivery request", requestable: true },
  { key: "delivery-return", label: "Delivery return", requestable: true },
  { key: "id-update", label: "ID update", requestable: true },
  { key: "permit-request", label: "Permit request", requestable: true },
  // A RETURN AT THE COUNTER (Point of Sale → Returns). Asked for when the
  // return is; approving it puts the units back and pays the refund.
  {
    key: "pos-return", label: "Till return", requestable: true, amounted: true,
    legacy: [{ permission: "pos.returns.approve", from: 0, label: "Returns" }],
  },
  // A STOCK ADJUSTMENT over the studio's limit (Inventory → Stock). Recording it
  // is asking; approving it writes the movement. The old chain's limits come
  // with it — a studio that had moved them keeps its own (`legacyChain`).
  {
    key: "adjustment", label: "Stock adjustment", requestable: true, amounted: true, legacyChain: "adjustment",
    legacy: [
      { permission: "inventory.stock.approve", from: 1000, label: "Stock control" },
      { permission: "inventory.stock.approveHigh", from: 25000, label: "Above the limit" },
    ],
  },
  // A SUPPLIER'S BILL (Finance → Payables). Asked for from the bill once it is
  // received; approving it is what payment waits on.
  {
    key: "bill", label: "Supplier bill", requestable: true, amounted: true, legacyChain: "bill",
    legacy: [
      { permission: "finance.payables.approve", from: 0, label: "Finance" },
      { permission: "finance.payables.approveHigh", from: 50000, label: "Above the limit" },
    ],
  },
  { key: "carried", label: "Carried over", requestable: false },
];

export const APPROVAL_TYPE_KEYS = APPROVAL_TYPES.map((t) => t.key);

export const approvalType = (key: unknown) => APPROVAL_TYPES.find((t) => t.key === key) || null;
