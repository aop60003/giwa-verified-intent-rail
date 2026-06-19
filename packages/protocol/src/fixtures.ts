import type { ActionManifest } from "./types.ts";

export const manifestFixture: ActionManifest = {
  manifestVersion: "1",
  chainId: 91342,
  nonce: "wallet-1-campaign-1-mission-1",
  expiryUnix: 1790000000,
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  wallet: "0x0000000000000000000000000000000000000001",
  actionType: "mockVaultDeposit",
  target: "0x0000000000000000000000000000000000000002",
  selector: "0xb6b55f25",
  asset: "0x0000000000000000000000000000000000000003",
  amountBaseUnits: "1000000000000000000",
  spender: "0x0000000000000000000000000000000000000002",
  maxAllowanceBaseUnits: "1000000000000000000",
  referralCode: "qr-judge-demo"
};
