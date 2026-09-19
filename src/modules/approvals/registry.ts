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

export type ApprovalTypeDef = {
  readonly key: string;
  readonly label: string;
  /** False only for `carried` — nothing may raise one. */
  readonly requestable: boolean;
};

export const APPROVAL_TYPES: readonly ApprovalTypeDef[] = [
  { key: "quotation", label: "Quotation approval", requestable: true },
  { key: "client-po", label: "Client purchase order", requestable: true },
  { key: "material-po", label: "Material purchase order", requestable: true },
  { key: "delivery", label: "Delivery request", requestable: true },
  { key: "delivery-return", label: "Delivery return", requestable: true },
  { key: "id-update", label: "ID update", requestable: true },
  { key: "permit-request", label: "Permit request", requestable: true },
  { key: "carried", label: "Carried over", requestable: false },
];

export const APPROVAL_TYPE_KEYS = APPROVAL_TYPES.map((t) => t.key);

export const approvalType = (key: unknown) => APPROVAL_TYPES.find((t) => t.key === key) || null;
