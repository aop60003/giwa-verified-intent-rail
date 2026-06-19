export type Hex = `0x${string}`;
export type Address = Hex;

export const GIWA_SEPOLIA_CHAIN_ID = 91342 as const;
export const MANIFEST_VERSION = "1" as const;
export const RECEIPT_SCHEMA_VERSION = "1" as const;
export const VERIFIER_SCHEMA_VERSION = "1" as const;
export const PROTOCOL_VERSION = "1" as const;
export const ACTION_TYPE = "mockVaultDeposit" as const;
export const NETWORK_NAME = "GIWA Sepolia" as const;
export const RECEIPT_ISSUER = "GIWA Verified Intent Rail MVP" as const;
export const RECEIPT_SAFETY_NOTICE = "Testnet-only. No real asset, no yield, no RWA claim." as const;

export type VerifiedState = "verified" | "guest" | "unavailable";
export type VerifiedProvider = "Dojang" | "up.id";
export type VerifierDecision = "matched" | "mismatched" | "failed" | "timeout";

export type ActionManifest = {
  manifestVersion: typeof MANIFEST_VERSION;
  chainId: typeof GIWA_SEPOLIA_CHAIN_ID;
  nonce: string;
  expiryUnix: number;
  campaignId: string;
  missionId: string;
  wallet: Address;
  actionType: typeof ACTION_TYPE;
  target: Address;
  selector: Hex;
  asset: Address;
  amountBaseUnits: string;
  spender: Address;
  maxAllowanceBaseUnits: string;
  referralCode?: string;
};

export type ManifestTypedMessage = {
  manifestVersion: string;
  chainId: bigint;
  nonce: string;
  expiryUnix: bigint;
  campaignId: string;
  missionId: string;
  wallet: Address;
  actionType: string;
  target: Address;
  selector: Hex;
  asset: Address;
  amountBaseUnits: bigint;
  spender: Address;
  maxAllowanceBaseUnits: bigint;
  referralCode: string;
};

export type SignedManifest = {
  manifest: ActionManifest;
  verifyingContract: Address;
  manifestSignature: Hex;
  recoveredSigner: Address;
  intentHash: Hex;
  manifestStructHash: Hex;
  eip712Digest: Hex;
};

export type ReceiptPayload = {
  schemaVersion: typeof RECEIPT_SCHEMA_VERSION;
  verifierVersion: string;
  intentHash: Hex;
  chainId: typeof GIWA_SEPOLIA_CHAIN_ID;
  networkName: typeof NETWORK_NAME;
  status: "matched";
  actionType: typeof ACTION_TYPE;
  asset: Address;
  amountBaseUnits: string;
  target: Address;
  spender: Address;
  maxAllowanceBaseUnits: string;
  allowanceUsedBaseUnits: string;
  approvalRequired: boolean;
  approveTxHash: Hex | null;
  depositTxHash: Hex;
  depositBlockNumber: number;
  depositBlockHash: Hex;
  campaignId: string;
  missionId: string;
  wallet: Address;
  verifiedState: VerifiedState;
  verifiedProvider?: VerifiedProvider;
  testnetDepositAmountDelta: string;
  issuedAt: number;
  issuer: typeof RECEIPT_ISSUER;
  safetyNotice: typeof RECEIPT_SAFETY_NOTICE;
};

export type ReceiptEnvelopeFields = {
  decisionTxHash: Hex;
  decisionBlockNumber: number;
  decisionBlockHash: Hex;
  explorerUrl: string;
  displayStatus: string;
  displayCopy: string;
};

export type ReceiptEnvelope = ReceiptEnvelopeFields & {
  payload: ReceiptPayload;
  receiptHash: Hex;
};

export type VerifierInputPayload = {
  schemaVersion: typeof VERIFIER_SCHEMA_VERSION;
  chainId: typeof GIWA_SEPOLIA_CHAIN_ID;
  intentHash: Hex;
  depositTxHash: Hex;
  depositTransactionSnapshotHash: Hex;
  depositReceiptSnapshotHash: Hex;
  decodedLogSnapshotHash: Hex;
  confirmationDepth: number;
  headBlockNumberAtVerification: number;
  verifierVersion: string;
};

export type GoldenVector = {
  payloadName: string;
  fieldOrder: readonly string[];
  payloadJson: string;
  payloadBytesHex: Hex;
  hash: Hex;
  createdBy: "Sprint 1 Protocol Kernel";
  createdAt: "2026-06-16";
};
