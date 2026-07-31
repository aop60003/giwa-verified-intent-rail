export type PublicNegativeControl = {
  label: "Recorded negative control";
  scenario: "TARGET_MISMATCH";
  scope: "controlled-demo-scenario";
  receiptIssued: false;
  publicReceiptAvailable: false;
  path: "/giwa-demo?example=mismatch";
};

export const PUBLIC_NEGATIVE_CONTROL: Readonly<PublicNegativeControl> =
  Object.freeze({
    label: "Recorded negative control",
    scenario: "TARGET_MISMATCH",
    scope: "controlled-demo-scenario",
    receiptIssued: false,
    publicReceiptAvailable: false,
    path: "/giwa-demo?example=mismatch"
  });
