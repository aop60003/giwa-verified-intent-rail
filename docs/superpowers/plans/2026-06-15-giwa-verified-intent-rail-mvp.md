# GIWA Verified Intent Rail MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Execution notice:** This document is a reference map only. Do not execute it directly. Use the 2026-06-16 sprint plans, starting with `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`, so implementation stops at each sprint gate.

**Goal:** Build a testnet-only GIWA Sepolia MVP where a user reviews one mock vault deposit intent, executes it, receives a receipt only after block confirmation, and a partner sees manifest-matched activation evidence.

**Architecture:** Use a small TypeScript monorepo with a Next.js web app, shared protocol utilities, and Solidity contracts. The web app owns the user flow, the Next API routes sign manifests and verify completed deposits, the shared package owns canonical schemas and hashes, and the contracts provide a mock ERC-20, mock vault, and inspectable intent events. The MVP stays narrow: one campaign, one mission, one mock token, one mock vault, one manifest schema, one receipt schema, and no real funds, yield, RWA issuance, settlement, security guarantee, or KYC decision.

**Tech Stack:** pnpm workspaces, TypeScript, Next.js, React, viem, Vitest, Hardhat, Solidity.

---

## Current Product Constraints

- Public name: `GIWA Verified Intent Rail`.
- Primary flow: `First Mock Vault Deposit on GIWA Sepolia`.
- Chain config from GIWA docs checked on 2026-06-15:
  - `chainId`: `91342`
  - standard RPC env default: `https://sepolia-rpc.giwa.io`
  - Flashblocks RPC env default: `https://sepolia-rpc-flashblocks.giwa.io`
  - explorer env default: `https://sepolia-explorer.giwa.io`
- Flashblocks is fast feedback only. The UI must show receipt readiness only after normal block confirmation.
- Dojang/up.id state is optional read-only context. The MVP must allow `guest` and `unavailable`.
- Dependency installation requires user approval under repository rules before execution starts.
- Secrets are configured only through ignored `.env.local` files. Commit `.env.example` with variable names and non-secret defaults only.

## File Structure

Create these files:

- `package.json` - root workspace scripts.
- `pnpm-workspace.yaml` - workspace package map.
- `tsconfig.base.json` - shared TypeScript settings.
- `.gitignore` - ignore dependency folders, build output, env files, and local demo data.
- `.env.example` - documented variable names without secrets.
- `packages/protocol/package.json` - shared schema/hash package.
- `packages/protocol/src/types.ts` - manifest, signed manifest, receipt, verifier status, run event types.
- `packages/protocol/src/canonical.ts` - deterministic payload ordering.
- `packages/protocol/src/hash.ts` - `keccak256` helpers.
- `packages/protocol/src/ids.ts` - `campaignId` and `missionId` normalization to `bytes32`.
- `packages/protocol/src/manifest.ts` - manifest validation, normalization, signing payload.
- `packages/protocol/src/receipt.ts` - receipt validation, canonical payload, hash generation.
- `packages/protocol/src/index.ts` - public exports.
- `packages/protocol/src/*.test.ts` - protocol unit tests.
- `packages/contracts/package.json` - contract workspace.
- `packages/contracts/hardhat.config.ts` - GIWA Sepolia network config.
- `packages/contracts/contracts/MockIntentToken.sol` - minimal test token.
- `packages/contracts/contracts/MockVault.sol` - mock vault deposit target.
- `packages/contracts/contracts/IntentRail.sol` - intent event contract.
- `packages/contracts/test/*.test.ts` - contract tests.
- `packages/contracts/scripts/deploy.ts` - deploy token, vault, and rail, then write deployment JSON.
- `apps/web/package.json` - web app workspace.
- `apps/web/src/generated/deployment.json` - generated deployment output committed only after testnet deployment.
- `apps/web/src/lib/chain.ts` - GIWA Sepolia chain definition and explorer helpers.
- `apps/web/src/lib/env.ts` - server/client env parsing.
- `apps/web/src/lib/contracts/abis.ts` - typed ABI fragments used by the app.
- `apps/web/src/lib/campaign/defaultCampaign.ts` - one campaign and one mission definition.
- `apps/web/src/lib/status/watchDepositStatus.ts` - submitted, preconfirmed, confirmed, timeout state machine.
- `apps/web/src/lib/verifier/verifyDeposit.ts` - deterministic manifest-to-transaction verification.
- `apps/web/src/lib/storage/runStore.ts` - local demo JSONL run event store.
- `apps/web/src/lib/storage/receiptStore.ts` - local demo JSONL receipt store.
- `apps/web/src/app/api/manifest/route.ts` - signed manifest issuer.
- `apps/web/src/app/api/runs/event/route.ts` - partner funnel event ingestion.
- `apps/web/src/app/api/verify/route.ts` - verifier and receipt issuer.
- `apps/web/src/app/page.tsx` - flagship user flow.
- `apps/web/src/app/receipt/[receiptHash]/page.tsx` - user receipt screen.
- `apps/web/src/app/partner/page.tsx` - partner campaign summary.
- `apps/web/src/components/*.tsx` - wallet, readiness, preview, execution, status, receipt, partner summary components.
- `apps/web/src/app/globals.css` - restrained product UI.
- `docs/implementation/giwa-mvp-runbook.md` - local demo and verification runbook.

## Task 1: Bootstrap Workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Confirm local toolchain**

Run:

```powershell
node --version
pnpm --version
git status --short
```

Expected:

```text
node prints a version
pnpm prints a version
git status shows only known documentation changes or an empty tree
```

- [ ] **Step 2: Ask for dependency install approval**

Say:

```text
이 구현은 Next.js, viem, Vitest, Hardhat 의존성을 추가합니다. 설치를 진행해도 될까요?
```

Proceed only after approval.

- [ ] **Step 3: Add root workspace files**

Write `package.json`:

```json
{
  "name": "giwa-verified-intent-rail",
  "private": true,
  "packageManager": "pnpm@10.12.1",
  "scripts": {
    "dev": "pnpm --filter @giwa/web dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "verify:docs": "pwsh -NoProfile -Command \"$docPattern='TO'+'DO|FIX'+'ME|TB'+'D'; rg -n $docPattern . -g '*.md'; $riskPattern='instant final'+'ity|200ms confirm'+'ed|guarantee safe'+'ty|perform K'+'YC|real R'+'WA|real y'+'ield'; rg -n $riskPattern . -g '*.md'\""
  }
}
```

Write `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Write `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

Write `.gitignore`:

```gitignore
node_modules/
.next/
dist/
coverage/
.turbo/
.env
.env.local
.env.*.local
apps/web/.data/
packages/contracts/cache/
packages/contracts/artifacts/
```

Write `.env.example`:

```dotenv
NEXT_PUBLIC_GIWA_CHAIN_ID=91342
NEXT_PUBLIC_GIWA_EXPLORER_URL=https://sepolia-explorer.giwa.io
GIWA_RPC_URL=https://sepolia-rpc.giwa.io
GIWA_FLASHBLOCKS_RPC_URL=https://sepolia-rpc-flashblocks.giwa.io
CAMPAIGN_SIGNER_PRIVATE_KEY=
VERIFIER_PRIVATE_KEY=
NEXT_PUBLIC_INTENT_RAIL_ADDRESS=
NEXT_PUBLIC_MOCK_TOKEN_ADDRESS=
NEXT_PUBLIC_MOCK_VAULT_ADDRESS=
```

- [ ] **Step 4: Install dependencies**

Run after approval:

```powershell
pnpm add -D typescript
pnpm add -D -w vitest tsx
pnpm add -D --filter @giwa/contracts hardhat @nomicfoundation/hardhat-toolbox
pnpm add --filter @giwa/protocol viem
pnpm add --filter @giwa/web next react react-dom viem
pnpm add -D --filter @giwa/web @types/node @types/react @types/react-dom eslint eslint-config-next
```

Expected:

```text
Packages resolve successfully and pnpm-lock.yaml is created.
```

- [ ] **Step 5: Commit bootstrap**

Run:

```powershell
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .env.example pnpm-lock.yaml
git commit -m "chore: bootstrap GIWA intent rail workspace"
```

Expected:

```text
Commit created.
```

## Task 2: Shared Manifest and Receipt Protocol

**Files:**
- Create: `packages/protocol/package.json`
- Create: `packages/protocol/src/types.ts`
- Create: `packages/protocol/src/canonical.ts`
- Create: `packages/protocol/src/hash.ts`
- Create: `packages/protocol/src/ids.ts`
- Create: `packages/protocol/src/manifest.ts`
- Create: `packages/protocol/src/receipt.ts`
- Create: `packages/protocol/src/index.ts`
- Test: `packages/protocol/src/manifest.test.ts`
- Test: `packages/protocol/src/receipt.test.ts`

- [ ] **Step 1: Add package scaffold**

Write `packages/protocol/package.json`:

```json
{
  "name": "@giwa/protocol",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "viem": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "workspace:*",
    "vitest": "workspace:*"
  }
}
```

- [ ] **Step 2: Write failing protocol tests**

Write `packages/protocol/src/manifest.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canonicalManifestPayload, computeIntentHash, normalizeManifest } from "./manifest";
import { idToBytes32 } from "./ids";

const manifest = {
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
} as const;

describe("manifest protocol", () => {
  it("canonicalizes fields in the exact MVP order", () => {
    expect(canonicalManifestPayload(manifest)).toBe(
      "{\"manifestVersion\":\"1\",\"chainId\":91342,\"nonce\":\"wallet-1-campaign-1-mission-1\",\"expiryUnix\":1790000000,\"campaignId\":\"gasok-demo\",\"missionId\":\"first-mock-vault-deposit\",\"wallet\":\"0x0000000000000000000000000000000000000001\",\"actionType\":\"mockVaultDeposit\",\"target\":\"0x0000000000000000000000000000000000000002\",\"selector\":\"0xb6b55f25\",\"asset\":\"0x0000000000000000000000000000000000000003\",\"amountBaseUnits\":\"1000000000000000000\",\"spender\":\"0x0000000000000000000000000000000000000002\",\"maxAllowanceBaseUnits\":\"1000000000000000000\",\"referralCode\":\"qr-judge-demo\"}"
    );
  });

  it("computes a stable intent hash", () => {
    expect(computeIntentHash(manifest)).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(computeIntentHash(manifest)).toBe(computeIntentHash({ ...manifest }));
  });

  it("normalizes campaign and mission ids for indexed Solidity events", () => {
    expect(idToBytes32("gasok-demo")).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(idToBytes32("first-mock-vault-deposit")).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("rejects real product language in actionType", () => {
    expect(() => normalizeManifest({ ...manifest, actionType: "realRwaDeposit" })).toThrow("Unsupported actionType");
  });
});
```

Write `packages/protocol/src/receipt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeReceiptHash, createReceiptPayload } from "./receipt";

describe("receipt protocol", () => {
  it("creates a matched testnet-only receipt payload", () => {
    const payload = createReceiptPayload({
      schemaVersion: "1",
      verifierVersion: "1",
      intentHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      chainId: 91342,
      networkName: "GIWA Sepolia",
      status: "matched",
      actionType: "mockVaultDeposit",
      asset: "0x0000000000000000000000000000000000000003",
      amountBaseUnits: "1000000000000000000",
      targetContract: "0x0000000000000000000000000000000000000002",
      spender: "0x0000000000000000000000000000000000000002",
      maxAllowanceBaseUnits: "1000000000000000000",
      allowanceUsedBaseUnits: "1000000000000000000",
      depositTxHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      blockNumber: "12345",
      blockHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      wallet: "0x0000000000000000000000000000000000000001",
      verifiedState: "guest",
      testnetDepositAmountDelta: "1000000000000000000",
      issuedAt: 1790000010,
      issuer: "GIWA Verified Intent Rail MVP",
      explorerUrl: "https://sepolia-explorer.giwa.io/tx/0x2222222222222222222222222222222222222222222222222222222222222222"
    });

    expect(payload.safetyNotice).toBe("Testnet-only. No real asset, no yield, no RWA claim.");
    expect(computeReceiptHash(payload)).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });
});
```

- [ ] **Step 3: Implement protocol utilities**

Write `packages/protocol/src/types.ts`:

```ts
export type Hex = `0x${string}`;
export type Address = Hex;
export type VerifierStatus = "matched" | "mismatched" | "failed" | "timeout";
export type VerifiedState = "verified" | "guest" | "unavailable";

export type ActionManifest = {
  manifestVersion: "1";
  chainId: number;
  nonce: string;
  expiryUnix: number;
  campaignId: string;
  missionId: string;
  wallet: Address;
  actionType: "mockVaultDeposit";
  target: Address;
  selector: Hex;
  asset: Address;
  amountBaseUnits: string;
  spender: Address;
  maxAllowanceBaseUnits: string;
  referralCode?: string;
};

export type SignedManifest = {
  manifest: ActionManifest;
  manifestSignature: Hex;
  manifestSigner: Address;
};

export type ProofKpiReceiptPayload = {
  schemaVersion: "1";
  verifierVersion: "1";
  intentHash: Hex;
  chainId: number;
  networkName: "GIWA Sepolia";
  status: "matched";
  actionType: "mockVaultDeposit";
  asset: Address;
  amountBaseUnits: string;
  targetContract: Address;
  spender: Address;
  maxAllowanceBaseUnits: string;
  allowanceUsedBaseUnits: string;
  approveTxHash?: Hex;
  depositTxHash: Hex;
  blockNumber: string;
  blockHash: Hex;
  campaignId: string;
  missionId: string;
  wallet: Address;
  verifiedState: VerifiedState;
  verifiedProvider?: "Dojang" | "up.id";
  testnetDepositAmountDelta: string;
  issuedAt: number;
  issuer: "GIWA Verified Intent Rail MVP";
  explorerUrl: string;
  safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim.";
};

export type ProofKpiReceipt = ProofKpiReceiptPayload & {
  receiptHash: Hex;
};
```

Write `packages/protocol/src/canonical.ts`:

```ts
export function canonicalPayload<T extends Record<string, unknown>>(value: T, fieldOrder: readonly (keyof T)[]): string {
  const ordered: Record<string, unknown> = {};

  for (const field of fieldOrder) {
    const item = value[field];
    if (item !== undefined) {
      ordered[String(field)] = item;
    }
  }

  return JSON.stringify(ordered);
}
```

Write `packages/protocol/src/hash.ts`:

```ts
import { keccak256, stringToBytes } from "viem";
import type { Hex } from "./types";

export function hashCanonicalPayload(payload: string): Hex {
  return keccak256(stringToBytes(payload));
}
```

Write `packages/protocol/src/ids.ts`:

```ts
import { keccak256, stringToBytes } from "viem";
import type { Hex } from "./types";

export function idToBytes32(id: string): Hex {
  if (id.trim().length === 0) {
    throw new Error("id must not be empty");
  }

  return keccak256(stringToBytes(id));
}
```

Write `packages/protocol/src/manifest.ts`:

```ts
import { getAddress, isAddress } from "viem";
import { canonicalPayload } from "./canonical";
import { hashCanonicalPayload } from "./hash";
import type { ActionManifest, Hex } from "./types";

const manifestFieldOrder = [
  "manifestVersion",
  "chainId",
  "nonce",
  "expiryUnix",
  "campaignId",
  "missionId",
  "wallet",
  "actionType",
  "target",
  "selector",
  "asset",
  "amountBaseUnits",
  "spender",
  "maxAllowanceBaseUnits",
  "referralCode"
] as const;

function requireBaseUnitString(value: string, field: string): string {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`${field} must be a base-unit integer string`);
  }

  return value;
}

function requireSelector(selector: Hex): Hex {
  if (!/^0x[a-fA-F0-9]{8}$/.test(selector)) {
    throw new Error("selector must be bytes4");
  }

  return selector.toLowerCase() as Hex;
}

export function normalizeManifest(input: ActionManifest): ActionManifest {
  if (input.manifestVersion !== "1") {
    throw new Error("Unsupported manifestVersion");
  }
  if (input.chainId !== 91342) {
    throw new Error("Unsupported chainId");
  }
  if (input.actionType !== "mockVaultDeposit") {
    throw new Error("Unsupported actionType");
  }
  if (!isAddress(input.wallet) || !isAddress(input.target) || !isAddress(input.asset) || !isAddress(input.spender)) {
    throw new Error("Manifest contains an invalid address");
  }
  if (input.expiryUnix <= 0) {
    throw new Error("expiryUnix must be positive");
  }

  return {
    manifestVersion: "1",
    chainId: 91342,
    nonce: input.nonce,
    expiryUnix: input.expiryUnix,
    campaignId: input.campaignId,
    missionId: input.missionId,
    wallet: getAddress(input.wallet),
    actionType: "mockVaultDeposit",
    target: getAddress(input.target),
    selector: requireSelector(input.selector),
    asset: getAddress(input.asset),
    amountBaseUnits: requireBaseUnitString(input.amountBaseUnits, "amountBaseUnits"),
    spender: getAddress(input.spender),
    maxAllowanceBaseUnits: requireBaseUnitString(input.maxAllowanceBaseUnits, "maxAllowanceBaseUnits"),
    ...(input.referralCode ? { referralCode: input.referralCode } : {})
  };
}

export function canonicalManifestPayload(input: ActionManifest): string {
  return canonicalPayload(normalizeManifest(input), manifestFieldOrder);
}

export function computeIntentHash(input: ActionManifest): Hex {
  return hashCanonicalPayload(canonicalManifestPayload(input));
}
```

Write `packages/protocol/src/receipt.ts`:

```ts
import { canonicalPayload } from "./canonical";
import { hashCanonicalPayload } from "./hash";
import type { ProofKpiReceipt, ProofKpiReceiptPayload } from "./types";

const receiptFieldOrder = [
  "schemaVersion",
  "verifierVersion",
  "intentHash",
  "chainId",
  "networkName",
  "status",
  "actionType",
  "asset",
  "amountBaseUnits",
  "targetContract",
  "spender",
  "maxAllowanceBaseUnits",
  "allowanceUsedBaseUnits",
  "approveTxHash",
  "depositTxHash",
  "blockNumber",
  "blockHash",
  "campaignId",
  "missionId",
  "wallet",
  "verifiedState",
  "verifiedProvider",
  "testnetDepositAmountDelta",
  "issuedAt",
  "issuer",
  "explorerUrl",
  "safetyNotice"
] as const;

export function createReceiptPayload(input: Omit<ProofKpiReceiptPayload, "safetyNotice">): ProofKpiReceiptPayload {
  if (input.status !== "matched") {
    throw new Error("Only matched transactions receive a successful receipt");
  }

  return {
    ...input,
    safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim."
  };
}

export function canonicalReceiptPayload(input: ProofKpiReceiptPayload): string {
  return canonicalPayload(input, receiptFieldOrder);
}

export function computeReceiptHash(input: ProofKpiReceiptPayload): `0x${string}` {
  return hashCanonicalPayload(canonicalReceiptPayload(input));
}

export function attachReceiptHash(input: ProofKpiReceiptPayload): ProofKpiReceipt {
  return {
    ...input,
    receiptHash: computeReceiptHash(input)
  };
}
```

Write `packages/protocol/src/index.ts`:

```ts
export * from "./types";
export * from "./canonical";
export * from "./hash";
export * from "./ids";
export * from "./manifest";
export * from "./receipt";
```

- [ ] **Step 4: Run protocol tests**

Run:

```powershell
pnpm --filter @giwa/protocol test
pnpm --filter @giwa/protocol typecheck
```

Expected:

```text
All manifest and receipt tests pass.
TypeScript reports no errors.
```

- [ ] **Step 5: Commit protocol**

Run:

```powershell
git add packages/protocol
git commit -m "feat: add canonical intent and receipt protocol"
```

Expected:

```text
Commit created.
```

## Task 3: Contracts for Mock Deposit and Intent Events

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/hardhat.config.ts`
- Create: `packages/contracts/contracts/MockIntentToken.sol`
- Create: `packages/contracts/contracts/MockVault.sol`
- Create: `packages/contracts/contracts/IntentRail.sol`
- Test: `packages/contracts/test/IntentRail.test.ts`
- Create: `packages/contracts/scripts/deploy.ts`

- [ ] **Step 1: Add contract package scaffold**

Write `packages/contracts/package.json`:

```json
{
  "name": "@giwa/contracts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "hardhat compile",
    "typecheck": "tsc --noEmit",
    "test": "hardhat test",
    "lint": "hardhat compile"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^6.0.0",
    "hardhat": "^3.0.0",
    "typescript": "workspace:*",
    "tsx": "workspace:*"
  }
}
```

Write `packages/contracts/hardhat.config.ts`:

```ts
import "@nomicfoundation/hardhat-toolbox";
import type { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    giwaSepolia: {
      url: process.env.GIWA_RPC_URL ?? "https://sepolia-rpc.giwa.io",
      chainId: 91342,
      accounts: process.env.VERIFIER_PRIVATE_KEY ? [process.env.VERIFIER_PRIVATE_KEY] : []
    }
  }
};

export default config;
```

- [ ] **Step 2: Write failing contract tests**

Write `packages/contracts/test/IntentRail.test.ts`:

```ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("GIWA Verified Intent Rail contracts", () => {
  it("mints mock test tokens and accepts a mock vault deposit", async () => {
    const [deployer, user] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockIntentToken");
    const token = await Token.deploy("GIWA Mock Intent Token", "gMIT");
    const Vault = await ethers.getContractFactory("MockVault");
    const vault = await Vault.deploy(await token.getAddress());

    await token.mint(user.address, ethers.parseEther("1"));
    await token.connect(user).approve(await vault.getAddress(), ethers.parseEther("1"));

    await expect(vault.connect(user).deposit(ethers.parseEther("1")))
      .to.emit(vault, "MockDeposit")
      .withArgs(user.address, await token.getAddress(), ethers.parseEther("1"));

    expect(await vault.deposits(user.address)).to.equal(ethers.parseEther("1"));
    expect(await token.balanceOf(await vault.getAddress())).to.equal(ethers.parseEther("1"));
    expect(deployer.address).to.match(/^0x/);
  });

  it("emits intent submitted and matched events with hashed campaign ids", async () => {
    const [operator, user] = await ethers.getSigners();
    const Rail = await ethers.getContractFactory("IntentRail");
    const rail = await Rail.deploy(operator.address);
    const intentHash = ethers.keccak256(ethers.toUtf8Bytes("intent"));
    const campaignId = ethers.keccak256(ethers.toUtf8Bytes("gasok-demo"));
    const missionId = ethers.keccak256(ethers.toUtf8Bytes("first-mock-vault-deposit"));
    const receiptHash = ethers.keccak256(ethers.toUtf8Bytes("receipt"));
    const depositTxHash = ethers.keccak256(ethers.toUtf8Bytes("deposit-tx"));

    await expect(
      rail.connect(user).submitIntent(
        intentHash,
        campaignId,
        missionId,
        user.address,
        user.address,
        "0xb6b55f25",
        user.address,
        100n,
        user.address,
        100n,
        1790000000n
      )
    ).to.emit(rail, "IntentSubmitted");

    await expect(
      rail.connect(operator).markMatched(intentHash, receiptHash, user.address, depositTxHash, 123n, 100n, 1790000010n)
    ).to.emit(rail, "IntentMatched");
  });

  it("rejects matched and failed decisions from non-operator accounts", async () => {
    const [operator, attacker] = await ethers.getSigners();
    const Rail = await ethers.getContractFactory("IntentRail");
    const rail = await Rail.deploy(operator.address);
    const hash = ethers.keccak256(ethers.toUtf8Bytes("x"));

    await expect(
      rail.connect(attacker).markMatched(hash, hash, attacker.address, hash, 1n, 1n, 1n)
    ).to.be.revertedWith("ONLY_OPERATOR");

    await expect(
      rail.connect(attacker).markFailed(hash, attacker.address, "mismatched", "target mismatch", 1n)
    ).to.be.revertedWith("ONLY_OPERATOR");
  });
});
```

- [ ] **Step 3: Implement contracts**

Write `packages/contracts/contracts/MockIntentToken.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockIntentToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "ALLOWANCE_TOO_LOW");
        require(balanceOf[from] >= amount, "BALANCE_TOO_LOW");

        allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
        return true;
    }
}
```

Write `packages/contracts/contracts/MockVault.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20Like {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract MockVault {
    IERC20Like public immutable asset;
    mapping(address => uint256) public deposits;

    event MockDeposit(address indexed wallet, address indexed asset, uint256 amountBaseUnits);

    constructor(address asset_) {
        require(asset_ != address(0), "ASSET_ZERO");
        asset = IERC20Like(asset_);
    }

    function deposit(uint256 amountBaseUnits) external {
        require(amountBaseUnits > 0, "AMOUNT_ZERO");
        bool ok = asset.transferFrom(msg.sender, address(this), amountBaseUnits);
        require(ok, "TRANSFER_FAILED");
        deposits[msg.sender] += amountBaseUnits;
        emit MockDeposit(msg.sender, address(asset), amountBaseUnits);
    }
}
```

Write `packages/contracts/contracts/IntentRail.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract IntentRail {
    address public immutable operator;

    event IntentSubmitted(
        bytes32 indexed intentHash,
        bytes32 indexed campaignId,
        bytes32 indexed missionId,
        address wallet,
        address target,
        bytes4 selector,
        address asset,
        uint256 amountBaseUnits,
        address spender,
        uint256 maxAllowanceBaseUnits,
        uint256 expiryUnix
    );

    event IntentMatched(
        bytes32 indexed intentHash,
        bytes32 indexed receiptHash,
        address indexed wallet,
        bytes32 depositTxHash,
        uint256 blockNumber,
        uint256 allowanceUsedBaseUnits,
        uint256 issuedAt
    );

    event IntentFailed(
        bytes32 indexed intentHash,
        address indexed wallet,
        string status,
        string failureReason,
        uint256 decidedAt
    );

    modifier onlyOperator() {
        require(msg.sender == operator, "ONLY_OPERATOR");
        _;
    }

    constructor(address operator_) {
        require(operator_ != address(0), "OPERATOR_ZERO");
        operator = operator_;
    }

    function submitIntent(
        bytes32 intentHash,
        bytes32 campaignId,
        bytes32 missionId,
        address wallet,
        address target,
        bytes4 selector,
        address asset,
        uint256 amountBaseUnits,
        address spender,
        uint256 maxAllowanceBaseUnits,
        uint256 expiryUnix
    ) external {
        require(wallet == msg.sender, "WALLET_MISMATCH");
        emit IntentSubmitted(
            intentHash,
            campaignId,
            missionId,
            wallet,
            target,
            selector,
            asset,
            amountBaseUnits,
            spender,
            maxAllowanceBaseUnits,
            expiryUnix
        );
    }

    function markMatched(
        bytes32 intentHash,
        bytes32 receiptHash,
        address wallet,
        bytes32 depositTxHash,
        uint256 blockNumber,
        uint256 allowanceUsedBaseUnits,
        uint256 issuedAt
    ) external onlyOperator {
        emit IntentMatched(intentHash, receiptHash, wallet, depositTxHash, blockNumber, allowanceUsedBaseUnits, issuedAt);
    }

    function markFailed(
        bytes32 intentHash,
        address wallet,
        string calldata status,
        string calldata failureReason,
        uint256 decidedAt
    ) external onlyOperator {
        emit IntentFailed(intentHash, wallet, status, failureReason, decidedAt);
    }
}
```

- [ ] **Step 4: Run contract tests**

Run:

```powershell
pnpm --filter @giwa/contracts test
pnpm --filter @giwa/contracts build
```

Expected:

```text
All contract tests pass and Hardhat compiles three contracts.
```

- [ ] **Step 5: Add deployment script**

Write `packages/contracts/scripts/deploy.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("MockIntentToken");
  const token = await Token.deploy("GIWA Mock Intent Token", "gMIT");
  await token.waitForDeployment();

  const Vault = await ethers.getContractFactory("MockVault");
  const vault = await Vault.deploy(await token.getAddress());
  await vault.waitForDeployment();

  const Rail = await ethers.getContractFactory("IntentRail");
  const rail = await Rail.deploy(deployer.address);
  await rail.waitForDeployment();

  const deployment = {
    chainId: 91342,
    deployer: deployer.address,
    mockToken: await token.getAddress(),
    mockVault: await vault.getAddress(),
    intentRail: await rail.getAddress()
  };

  const outputPath = path.resolve(process.cwd(), "../../apps/web/src/generated/deployment.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(deployment, null, 2)}\n`);
  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run after `.env.local` contains a funded `VERIFIER_PRIVATE_KEY` for GIWA Sepolia testnet:

```powershell
pnpm --filter @giwa/contracts hardhat run scripts/deploy.ts --network giwaSepolia
```

Expected:

```text
The script prints mockToken, mockVault, and intentRail addresses and writes apps/web/src/generated/deployment.json.
```

- [ ] **Step 6: Commit contracts**

Run:

```powershell
git add packages/contracts apps/web/src/generated/deployment.json
git commit -m "feat: add mock vault and intent event contracts"
```

Expected:

```text
Commit created.
```

## Task 4: Web App Foundation and Chain Config

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/src/lib/chain.ts`
- Create: `apps/web/src/lib/env.ts`
- Create: `apps/web/src/lib/contracts/abis.ts`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/globals.css`

- [ ] **Step 1: Add app scaffold**

Write `apps/web/package.json`:

```json
{
  "name": "@giwa/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "next lint"
  },
  "dependencies": {
    "@giwa/protocol": "workspace:*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "viem": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "typescript": "workspace:*",
    "vitest": "workspace:*"
  }
}
```

Write `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Write `apps/web/next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default nextConfig;
```

- [ ] **Step 2: Add chain and env files**

Write `apps/web/src/lib/chain.ts`:

```ts
import { defineChain } from "viem";

export const giwaSepolia = defineChain({
  id: 91342,
  name: "GIWA Sepolia",
  nativeCurrency: {
    name: "GIWA Sepolia Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [process.env.GIWA_RPC_URL ?? "https://sepolia-rpc.giwa.io"]
    }
  },
  blockExplorers: {
    default: {
      name: "GIWA Sepolia Explorer",
      url: process.env.NEXT_PUBLIC_GIWA_EXPLORER_URL ?? "https://sepolia-explorer.giwa.io"
    }
  },
  testnet: true
});

export function txExplorerUrl(hash: `0x${string}`): string {
  const base = process.env.NEXT_PUBLIC_GIWA_EXPLORER_URL ?? "https://sepolia-explorer.giwa.io";
  return `${base.replace(/\/$/, "")}/tx/${hash}`;
}
```

Write `apps/web/src/lib/env.ts`:

```ts
export function requiredServerEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function optionalServerEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}
```

Write `apps/web/src/lib/contracts/abis.ts`:

```ts
export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }]
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "allowance", type: "uint256" }]
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "ok", type: "bool" }]
  }
] as const;

export const mockVaultAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "amountBaseUnits", type: "uint256" }],
    outputs: []
  },
  {
    type: "event",
    name: "MockDeposit",
    inputs: [
      { name: "wallet", type: "address", indexed: true },
      { name: "asset", type: "address", indexed: true },
      { name: "amountBaseUnits", type: "uint256", indexed: false }
    ]
  }
] as const;

export const intentRailAbi = [
  {
    type: "function",
    name: "submitIntent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "intentHash", type: "bytes32" },
      { name: "campaignId", type: "bytes32" },
      { name: "missionId", type: "bytes32" },
      { name: "wallet", type: "address" },
      { name: "target", type: "address" },
      { name: "selector", type: "bytes4" },
      { name: "asset", type: "address" },
      { name: "amountBaseUnits", type: "uint256" },
      { name: "spender", type: "address" },
      { name: "maxAllowanceBaseUnits", type: "uint256" },
      { name: "expiryUnix", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "markMatched",
    stateMutability: "nonpayable",
    inputs: [
      { name: "intentHash", type: "bytes32" },
      { name: "receiptHash", type: "bytes32" },
      { name: "wallet", type: "address" },
      { name: "depositTxHash", type: "bytes32" },
      { name: "blockNumber", type: "uint256" },
      { name: "allowanceUsedBaseUnits", type: "uint256" },
      { name: "issuedAt", type: "uint256" }
    ],
    outputs: []
  }
] as const;
```

- [ ] **Step 3: Add layout and base styles**

Write `apps/web/src/app/layout.tsx`:

```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GIWA Verified Intent Rail",
  description: "Testnet action evidence rail for GIWA Sepolia mock vault actions."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Write `apps/web/src/app/globals.css`:

```css
:root {
  color-scheme: light;
  --bg: #f8faf9;
  --ink: #14211d;
  --muted: #5e6f68;
  --line: #d8e2dd;
  --panel: #ffffff;
  --accent: #0f7b63;
  --accent-ink: #ffffff;
  --warn: #9a5b13;
  --bad: #9b1c31;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: Arial, Helvetica, sans-serif;
}

button {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  font: inherit;
  min-height: 40px;
  padding: 0 14px;
}

button.primary {
  background: var(--accent);
  color: var(--accent-ink);
  border-color: var(--accent);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.shell {
  width: min(1120px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 28px 0 48px;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 16px;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 18px;
}

.stack {
  display: grid;
  gap: 12px;
}

.muted {
  color: var(--muted);
}

@media (max-width: 840px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run app typecheck**

Run:

```powershell
pnpm --filter @giwa/web typecheck
```

Expected:

```text
TypeScript reports no errors.
```

- [ ] **Step 5: Commit app foundation**

Run:

```powershell
git add apps/web
git commit -m "feat: add GIWA web app foundation"
```

Expected:

```text
Commit created.
```

## Task 5: Manifest Issuer and Campaign Definition

**Files:**
- Create: `apps/web/src/lib/campaign/defaultCampaign.ts`
- Create: `apps/web/src/app/api/manifest/route.ts`
- Test: `apps/web/src/app/api/manifest/route.test.ts`

- [ ] **Step 1: Define the single MVP campaign**

Write `apps/web/src/lib/campaign/defaultCampaign.ts`:

```ts
import deployment from "@/generated/deployment.json";
import { getFunctionSelector, parseAbiItem } from "viem";

export const defaultCampaign = {
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  actionType: "mockVaultDeposit",
  chainId: 91342,
  amountBaseUnits: "1000000000000000000",
  maxAllowanceBaseUnits: "1000000000000000000",
  target: deployment.mockVault as `0x${string}`,
  asset: deployment.mockToken as `0x${string}`,
  spender: deployment.mockVault as `0x${string}`,
  selector: getFunctionSelector(parseAbiItem("function deposit(uint256 amountBaseUnits)"))
} as const;
```

- [ ] **Step 2: Write failing issuer test**

Write `apps/web/src/app/api/manifest/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeIntentHash } from "@giwa/protocol";
import { buildManifestForWallet } from "./route";

describe("manifest issuer", () => {
  it("builds a GIWA Sepolia mock vault manifest for one wallet", () => {
    const manifest = buildManifestForWallet({
      wallet: "0x0000000000000000000000000000000000000001",
      nowUnix: 1790000000,
      referralCode: "qr-judge-demo"
    });

    expect(manifest.chainId).toBe(91342);
    expect(manifest.actionType).toBe("mockVaultDeposit");
    expect(manifest.expiryUnix).toBe(1790000900);
    expect(computeIntentHash(manifest)).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });
});
```

- [ ] **Step 3: Implement manifest API route**

Write `apps/web/src/app/api/manifest/route.ts`:

```ts
import { canonicalManifestPayload, type ActionManifest } from "@giwa/protocol";
import { privateKeyToAccount } from "viem/accounts";
import { NextResponse } from "next/server";
import { defaultCampaign } from "@/lib/campaign/defaultCampaign";
import { requiredServerEnv } from "@/lib/env";

export function buildManifestForWallet(input: {
  wallet: `0x${string}`;
  nowUnix: number;
  referralCode?: string;
}): ActionManifest {
  return {
    manifestVersion: "1",
    chainId: defaultCampaign.chainId,
    nonce: `${input.wallet.toLowerCase()}-${defaultCampaign.campaignId}-${defaultCampaign.missionId}-${input.nowUnix}`,
    expiryUnix: input.nowUnix + 900,
    campaignId: defaultCampaign.campaignId,
    missionId: defaultCampaign.missionId,
    wallet: input.wallet,
    actionType: "mockVaultDeposit",
    target: defaultCampaign.target,
    selector: defaultCampaign.selector,
    asset: defaultCampaign.asset,
    amountBaseUnits: defaultCampaign.amountBaseUnits,
    spender: defaultCampaign.spender,
    maxAllowanceBaseUnits: defaultCampaign.maxAllowanceBaseUnits,
    ...(input.referralCode ? { referralCode: input.referralCode } : {})
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wallet = url.searchParams.get("wallet") as `0x${string}` | null;
  const referralCode = url.searchParams.get("referralCode") ?? undefined;

  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "wallet must be an address" }, { status: 400 });
  }

  const manifest = buildManifestForWallet({
    wallet,
    referralCode,
    nowUnix: Math.floor(Date.now() / 1000)
  });
  const account = privateKeyToAccount(requiredServerEnv("CAMPAIGN_SIGNER_PRIVATE_KEY") as `0x${string}`);
  const payload = canonicalManifestPayload(manifest);
  const manifestSignature = await account.signMessage({ message: payload });

  return NextResponse.json({
    manifest,
    manifestSignature,
    manifestSigner: account.address
  });
}
```

- [ ] **Step 4: Run manifest tests**

Run:

```powershell
pnpm --filter @giwa/web test -- route.test.ts
pnpm --filter @giwa/web typecheck
```

Expected:

```text
Manifest issuer test passes and TypeScript reports no errors.
```

- [ ] **Step 5: Commit manifest issuer**

Run:

```powershell
git add apps/web/src/lib/campaign apps/web/src/app/api/manifest
git commit -m "feat: issue signed action manifests"
```

Expected:

```text
Commit created.
```

## Task 6: Transaction Status State Machine

**Files:**
- Create: `apps/web/src/lib/status/watchDepositStatus.ts`
- Test: `apps/web/src/lib/status/watchDepositStatus.test.ts`

- [ ] **Step 1: Write failing status tests**

Write `apps/web/src/lib/status/watchDepositStatus.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { statusCopy } from "./watchDepositStatus";

describe("deposit status copy", () => {
  it("keeps preconfirmation separate from final confirmation", () => {
    expect(statusCopy.preconfirmed).toContain("fast feedback");
    expect(statusCopy.preconfirmed).toContain("not final confirmation");
    expect(statusCopy.confirmed).toContain("receipt is ready");
  });
});
```

- [ ] **Step 2: Implement status watcher**

Write `apps/web/src/lib/status/watchDepositStatus.ts`:

```ts
import { createPublicClient, http, type Hash } from "viem";
import { giwaSepolia } from "@/lib/chain";

export type DepositStatus = "submitted" | "preconfirmed" | "confirmed" | "timeout";

export const statusCopy: Record<DepositStatus, string> = {
  submitted: "Your wallet sent the transaction.",
  preconfirmed: "The network has seen it. This is fast feedback, not final confirmation.",
  confirmed: "On-chain block confirmation received. Your receipt is ready.",
  timeout: "The app did not observe confirmation within the expected window. Check the explorer before retrying."
};

export async function watchDepositStatus(input: {
  hash: Hash;
  onStatus: (status: DepositStatus) => void;
  timeoutMs: number;
}): Promise<DepositStatus> {
  const standardClient = createPublicClient({
    chain: giwaSepolia,
    transport: http(process.env.GIWA_RPC_URL ?? "https://sepolia-rpc.giwa.io")
  });
  const flashblocksClient = createPublicClient({
    chain: giwaSepolia,
    transport: http(process.env.GIWA_FLASHBLOCKS_RPC_URL ?? "https://sepolia-rpc-flashblocks.giwa.io")
  });
  const startedAt = Date.now();

  input.onStatus("submitted");

  while (Date.now() - startedAt < input.timeoutMs) {
    const earlyReceipt = await flashblocksClient.getTransactionReceipt({ hash: input.hash }).catch(() => null);
    if (earlyReceipt) {
      input.onStatus("preconfirmed");
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  while (Date.now() - startedAt < input.timeoutMs) {
    const receipt = await standardClient.getTransactionReceipt({ hash: input.hash }).catch(() => null);
    if (receipt?.blockHash && receipt.blockNumber !== null) {
      input.onStatus("confirmed");
      return "confirmed";
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  input.onStatus("timeout");
  return "timeout";
}
```

- [ ] **Step 3: Run status tests**

Run:

```powershell
pnpm --filter @giwa/web test -- watchDepositStatus.test.ts
pnpm --filter @giwa/web typecheck
```

Expected:

```text
Status copy test passes and TypeScript reports no errors.
```

- [ ] **Step 4: Commit status watcher**

Run:

```powershell
git add apps/web/src/lib/status
git commit -m "feat: add GIWA transaction status watcher"
```

Expected:

```text
Commit created.
```

## Task 7: Verifier and Receipt Issuer

**Files:**
- Create: `apps/web/src/lib/verifier/verifyDeposit.ts`
- Create: `apps/web/src/lib/storage/receiptStore.ts`
- Create: `apps/web/src/app/api/verify/route.ts`
- Test: `apps/web/src/lib/verifier/verifyDeposit.test.ts`

- [ ] **Step 1: Write verifier tests**

Write `apps/web/src/lib/verifier/verifyDeposit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { encodeFunctionData } from "viem";
import { mockVaultAbi } from "@/lib/contracts/abis";
import { verifyDepositFields } from "./verifyDeposit";

const manifest = {
  manifestVersion: "1",
  chainId: 91342,
  nonce: "n",
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
  maxAllowanceBaseUnits: "1000000000000000000"
} as const;

describe("verifyDepositFields", () => {
  it("matches the required mock vault deposit calldata", () => {
    const input = encodeFunctionData({
      abi: mockVaultAbi,
      functionName: "deposit",
      args: [1000000000000000000n]
    });

    expect(
      verifyDepositFields({
        manifest,
        transaction: {
          from: manifest.wallet,
          to: manifest.target,
          input
        },
        nowUnix: 1789999999
      })
    ).toEqual({ status: "matched", allowanceUsedBaseUnits: "1000000000000000000" });
  });

  it("rejects a different target", () => {
    const input = encodeFunctionData({
      abi: mockVaultAbi,
      functionName: "deposit",
      args: [1000000000000000000n]
    });

    expect(
      verifyDepositFields({
        manifest,
        transaction: {
          from: manifest.wallet,
          to: "0x0000000000000000000000000000000000000004",
          input
        },
        nowUnix: 1789999999
      })
    ).toEqual({ status: "mismatched", reason: "target mismatch" });
  });
});
```

- [ ] **Step 2: Implement verifier**

Write `apps/web/src/lib/verifier/verifyDeposit.ts`:

```ts
import {
  attachReceiptHash,
  computeIntentHash,
  createReceiptPayload,
  normalizeManifest,
  type ActionManifest,
  type ProofKpiReceipt,
  type VerifiedState
} from "@giwa/protocol";
import { createPublicClient, decodeFunctionData, http, isAddressEqual, type Hash } from "viem";
import { giwaSepolia, txExplorerUrl } from "@/lib/chain";
import { mockVaultAbi } from "@/lib/contracts/abis";

export type VerifyDepositFieldsInput = {
  manifest: ActionManifest;
  transaction: {
    from: `0x${string}`;
    to: `0x${string}` | null;
    input: `0x${string}`;
  };
  nowUnix: number;
};

export type VerifyDepositFieldsResult =
  | { status: "matched"; allowanceUsedBaseUnits: string }
  | { status: "mismatched"; reason: string }
  | { status: "timeout"; reason: string };

export function verifyDepositFields(input: VerifyDepositFieldsInput): VerifyDepositFieldsResult {
  const manifest = normalizeManifest(input.manifest);

  if (input.nowUnix > manifest.expiryUnix) {
    return { status: "timeout", reason: "manifest expired" };
  }
  if (!isAddressEqual(input.transaction.from, manifest.wallet)) {
    return { status: "mismatched", reason: "wallet mismatch" };
  }
  if (!input.transaction.to || !isAddressEqual(input.transaction.to, manifest.target)) {
    return { status: "mismatched", reason: "target mismatch" };
  }
  if (!input.transaction.input.toLowerCase().startsWith(manifest.selector.toLowerCase())) {
    return { status: "mismatched", reason: "selector mismatch" };
  }

  const decoded = decodeFunctionData({
    abi: mockVaultAbi,
    data: input.transaction.input
  });

  if (decoded.functionName !== "deposit") {
    return { status: "mismatched", reason: "function mismatch" };
  }

  const amount = decoded.args[0];
  if (amount > BigInt(manifest.amountBaseUnits)) {
    return { status: "mismatched", reason: "amount exceeds manifest" };
  }
  if (amount > BigInt(manifest.maxAllowanceBaseUnits)) {
    return { status: "mismatched", reason: "allowance used above max" };
  }

  return {
    status: "matched",
    allowanceUsedBaseUnits: amount.toString()
  };
}

export async function verifyDepositOnChain(input: {
  manifest: ActionManifest;
  depositTxHash: Hash;
  verifiedState: VerifiedState;
  verifiedProvider?: "Dojang" | "up.id";
}): Promise<
  | { status: "matched"; receipt: ProofKpiReceipt }
  | { status: "mismatched" | "failed" | "timeout"; reason: string }
> {
  const client = createPublicClient({
    chain: giwaSepolia,
    transport: http(process.env.GIWA_RPC_URL ?? "https://sepolia-rpc.giwa.io")
  });
  const tx = await client.getTransaction({ hash: input.depositTxHash }).catch(() => null);
  const txReceipt = await client.getTransactionReceipt({ hash: input.depositTxHash }).catch(() => null);

  if (!tx || !txReceipt) {
    return { status: "timeout", reason: "transaction not confirmed" };
  }
  if (txReceipt.status !== "success") {
    return { status: "failed", reason: "deposit transaction failed" };
  }

  const fieldDecision = verifyDepositFields({
    manifest: input.manifest,
    transaction: {
      from: tx.from,
      to: tx.to,
      input: tx.input
    },
    nowUnix: Math.floor(Date.now() / 1000)
  });

  if (fieldDecision.status !== "matched") {
    return fieldDecision;
  }

  const payload = createReceiptPayload({
    schemaVersion: "1",
    verifierVersion: "1",
    intentHash: computeIntentHash(input.manifest),
    chainId: 91342,
    networkName: "GIWA Sepolia",
    status: "matched",
    actionType: "mockVaultDeposit",
    asset: input.manifest.asset,
    amountBaseUnits: input.manifest.amountBaseUnits,
    targetContract: input.manifest.target,
    spender: input.manifest.spender,
    maxAllowanceBaseUnits: input.manifest.maxAllowanceBaseUnits,
    allowanceUsedBaseUnits: fieldDecision.allowanceUsedBaseUnits,
    depositTxHash: input.depositTxHash,
    blockNumber: txReceipt.blockNumber.toString(),
    blockHash: txReceipt.blockHash,
    campaignId: input.manifest.campaignId,
    missionId: input.manifest.missionId,
    wallet: input.manifest.wallet,
    verifiedState: input.verifiedState,
    ...(input.verifiedProvider ? { verifiedProvider: input.verifiedProvider } : {}),
    testnetDepositAmountDelta: fieldDecision.allowanceUsedBaseUnits,
    issuedAt: Math.floor(Date.now() / 1000),
    issuer: "GIWA Verified Intent Rail MVP",
    explorerUrl: txExplorerUrl(input.depositTxHash)
  });

  return {
    status: "matched",
    receipt: attachReceiptHash(payload)
  };
}
```

- [ ] **Step 3: Implement receipt storage**

Write `apps/web/src/lib/storage/receiptStore.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import type { ProofKpiReceipt } from "@giwa/protocol";

const dataDir = path.join(process.cwd(), ".data");
const receiptPath = path.join(dataDir, "receipts.jsonl");

export function saveReceipt(receipt: ProofKpiReceipt): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.appendFileSync(receiptPath, `${JSON.stringify(receipt)}\n`, "utf8");
}

export function listReceipts(): ProofKpiReceipt[] {
  if (!fs.existsSync(receiptPath)) {
    return [];
  }

  return fs
    .readFileSync(receiptPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ProofKpiReceipt);
}

export function findReceipt(receiptHash: string): ProofKpiReceipt | null {
  return listReceipts().find((receipt) => receipt.receiptHash.toLowerCase() === receiptHash.toLowerCase()) ?? null;
}
```

- [ ] **Step 4: Implement verifier API**

Write `apps/web/src/app/api/verify/route.ts`:

```ts
import { canonicalManifestPayload, type SignedManifest, type VerifiedState } from "@giwa/protocol";
import { recoverMessageAddress } from "viem";
import { NextResponse } from "next/server";
import { saveReceipt } from "@/lib/storage/receiptStore";
import { verifyDepositOnChain } from "@/lib/verifier/verifyDeposit";

type VerifyBody = {
  signedManifest: SignedManifest;
  depositTxHash: `0x${string}`;
  verifiedState: VerifiedState;
  verifiedProvider?: "Dojang" | "up.id";
};

export async function POST(request: Request) {
  const body = (await request.json()) as VerifyBody;
  const recovered = await recoverMessageAddress({
    message: canonicalManifestPayload(body.signedManifest.manifest),
    signature: body.signedManifest.manifestSignature
  });

  if (recovered.toLowerCase() !== body.signedManifest.manifestSigner.toLowerCase()) {
    return NextResponse.json({ status: "mismatched", reason: "manifest signature mismatch" }, { status: 400 });
  }

  const result = await verifyDepositOnChain({
    manifest: body.signedManifest.manifest,
    depositTxHash: body.depositTxHash,
    verifiedState: body.verifiedState,
    verifiedProvider: body.verifiedProvider
  });

  if (result.status !== "matched") {
    return NextResponse.json(result, { status: 400 });
  }

  saveReceipt(result.receipt);
  return NextResponse.json(result.receipt);
}
```

- [ ] **Step 5: Run verifier tests**

Run:

```powershell
pnpm --filter @giwa/web test -- verifyDeposit.test.ts
pnpm --filter @giwa/web typecheck
```

Expected:

```text
Verifier tests pass and TypeScript reports no errors.
```

- [ ] **Step 6: Commit verifier**

Run:

```powershell
git add apps/web/src/lib/verifier apps/web/src/lib/storage apps/web/src/app/api/verify
git commit -m "feat: verify deposits and issue receipts"
```

Expected:

```text
Commit created.
```

## Task 8: User Flow UI

**Files:**
- Create: `apps/web/src/components/WalletPanel.tsx`
- Create: `apps/web/src/components/ReadinessPanel.tsx`
- Create: `apps/web/src/components/IntentPreview.tsx`
- Create: `apps/web/src/components/ExecutionPanel.tsx`
- Create: `apps/web/src/components/StatusRail.tsx`
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Implement main page state machine**

Write `apps/web/src/app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { SignedManifest, VerifiedState } from "@giwa/protocol";
import { WalletPanel } from "@/components/WalletPanel";
import { ReadinessPanel } from "@/components/ReadinessPanel";
import { IntentPreview } from "@/components/IntentPreview";
import { ExecutionPanel } from "@/components/ExecutionPanel";
import { StatusRail, type UiStatus } from "@/components/StatusRail";

export default function HomePage() {
  const [wallet, setWallet] = useState<`0x${string}` | null>(null);
  const [signedManifest, setSignedManifest] = useState<SignedManifest | null>(null);
  const [verifiedState, setVerifiedState] = useState<VerifiedState>("guest");
  const [status, setStatus] = useState<UiStatus>("idle");

  async function requestManifest(address: `0x${string}`) {
    const response = await fetch(`/api/manifest?wallet=${address}&referralCode=qr-judge-demo`);
    if (!response.ok) {
      throw new Error("Manifest request failed");
    }
    setSignedManifest((await response.json()) as SignedManifest);
  }

  return (
    <main className="shell">
      <header className="stack" style={{ marginBottom: 18 }}>
        <h1>GIWA Verified Intent Rail</h1>
        <p className="muted">Testnet-only guided intent for one GIWA Sepolia mock vault deposit.</p>
      </header>
      <div className="grid">
        <section className="stack">
          <WalletPanel
            wallet={wallet}
            onWallet={async (address) => {
              setWallet(address);
              await requestManifest(address);
            }}
          />
          <ReadinessPanel wallet={wallet} verifiedState={verifiedState} onVerifiedState={setVerifiedState} />
          {signedManifest ? <IntentPreview signedManifest={signedManifest} /> : null}
        </section>
        <aside className="stack">
          <StatusRail status={status} />
          {wallet && signedManifest ? (
            <ExecutionPanel
              wallet={wallet}
              signedManifest={signedManifest}
              verifiedState={verifiedState}
              onStatus={setStatus}
            />
          ) : null}
        </aside>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Implement wallet and readiness components**

Write `apps/web/src/components/WalletPanel.tsx`:

```tsx
"use client";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function WalletPanel({
  wallet,
  onWallet
}: {
  wallet: `0x${string}` | null;
  onWallet: (wallet: `0x${string}`) => Promise<void>;
}) {
  async function connect() {
    if (!window.ethereum) {
      throw new Error("Wallet provider not found");
    }
    const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as `0x${string}`[];
    await onWallet(accounts[0]);
  }

  return (
    <section className="panel stack">
      <h2>Wallet</h2>
      <p className="muted">{wallet ? wallet : "Connect a wallet to request the signed action manifest."}</p>
      <button className="primary" onClick={connect}>
        {wallet ? "Wallet connected" : "Connect wallet"}
      </button>
    </section>
  );
}
```

Write `apps/web/src/components/ReadinessPanel.tsx`:

```tsx
"use client";

import type { VerifiedState } from "@giwa/protocol";

export function ReadinessPanel({
  wallet,
  verifiedState,
  onVerifiedState
}: {
  wallet: `0x${string}` | null;
  verifiedState: VerifiedState;
  onVerifiedState: (state: VerifiedState) => void;
}) {
  return (
    <section className="panel stack">
      <h2>Readiness</h2>
      <p>Network: GIWA Sepolia</p>
      <p>Verified state: {verifiedState}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => onVerifiedState("verified")}>Mark verified</button>
        <button onClick={() => onVerifiedState("guest")}>Guest</button>
        <button onClick={() => onVerifiedState("unavailable")}>Unavailable</button>
      </div>
      <p className="muted">
        {wallet ? "The MVP reads verified state where available and keeps guest fallback open." : "Wallet check is pending."}
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Implement preview, execution, and status components**

Write `apps/web/src/components/IntentPreview.tsx`:

```tsx
"use client";

import { computeIntentHash, type SignedManifest } from "@giwa/protocol";

export function IntentPreview({ signedManifest }: { signedManifest: SignedManifest }) {
  const manifest = signedManifest.manifest;

  return (
    <section className="panel stack">
      <h2>Intent Preview</h2>
      <p>Action: First mock vault deposit</p>
      <p>Target: {manifest.target}</p>
      <p>Selector: {manifest.selector}</p>
      <p>Asset: {manifest.asset}</p>
      <p>Amount: {manifest.amountBaseUnits}</p>
      <p>Spender: {manifest.spender}</p>
      <p>Max allowance: {manifest.maxAllowanceBaseUnits}</p>
      <p>Intent hash: {computeIntentHash(manifest)}</p>
      <p className="muted">Testnet-only. No real funds, yield, or RWA claim.</p>
    </section>
  );
}
```

Write `apps/web/src/components/StatusRail.tsx`:

```tsx
"use client";

export type UiStatus = "idle" | "submitted" | "preconfirmed" | "confirmed" | "timeout" | "receipt";

const labels: Record<UiStatus, string> = {
  idle: "Ready",
  submitted: "Submitted",
  preconfirmed: "Fast feedback",
  confirmed: "Confirmed",
  timeout: "Timeout",
  receipt: "Receipt ready"
};

export function StatusRail({ status }: { status: UiStatus }) {
  return (
    <section className="panel stack">
      <h2>Status</h2>
      <p>{labels[status]}</p>
      <p className="muted">
        {status === "preconfirmed"
          ? "The network has seen the transaction. This is not final confirmation."
          : "Receipt creation waits for block confirmation."}
      </p>
    </section>
  );
}
```

Write `apps/web/src/components/ExecutionPanel.tsx`:

```tsx
"use client";

import { computeIntentHash, idToBytes32, type SignedManifest, type VerifiedState } from "@giwa/protocol";
import { createWalletClient, custom, encodeFunctionData, parseAbi } from "viem";
import deployment from "@/generated/deployment.json";
import { giwaSepolia } from "@/lib/chain";
import { erc20Abi, intentRailAbi, mockVaultAbi } from "@/lib/contracts/abis";
import { watchDepositStatus } from "@/lib/status/watchDepositStatus";
import type { UiStatus } from "./StatusRail";

export function ExecutionPanel({
  wallet,
  signedManifest,
  verifiedState,
  onStatus
}: {
  wallet: `0x${string}`;
  signedManifest: SignedManifest;
  verifiedState: VerifiedState;
  onStatus: (status: UiStatus) => void;
}) {
  async function execute() {
    if (!window.ethereum) {
      throw new Error("Wallet provider not found");
    }
    const client = createWalletClient({
      account: wallet,
      chain: giwaSepolia,
      transport: custom(window.ethereum)
    });
    const manifest = signedManifest.manifest;
    const intentHash = computeIntentHash(manifest);

    await client.writeContract({
      address: deployment.intentRail as `0x${string}`,
      abi: intentRailAbi,
      functionName: "submitIntent",
      args: [
        intentHash,
        idToBytes32(manifest.campaignId),
        idToBytes32(manifest.missionId),
        manifest.wallet,
        manifest.target,
        manifest.selector,
        manifest.asset,
        BigInt(manifest.amountBaseUnits),
        manifest.spender,
        BigInt(manifest.maxAllowanceBaseUnits),
        BigInt(manifest.expiryUnix)
      ]
    });

    await client.writeContract({
      address: manifest.asset,
      abi: erc20Abi,
      functionName: "approve",
      args: [manifest.spender, BigInt(manifest.maxAllowanceBaseUnits)]
    });

    const depositHash = await client.writeContract({
      address: manifest.target,
      abi: mockVaultAbi,
      functionName: "deposit",
      args: [BigInt(manifest.amountBaseUnits)]
    });

    const finalStatus = await watchDepositStatus({
      hash: depositHash,
      timeoutMs: 90000,
      onStatus: (status) => onStatus(status)
    });

    if (finalStatus !== "confirmed") {
      return;
    }

    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signedManifest,
        depositTxHash: depositHash,
        verifiedState
      })
    });

    if (!response.ok) {
      throw new Error("Receipt verification failed");
    }

    const receipt = await response.json();
    onStatus("receipt");
    window.location.href = `/receipt/${receipt.receiptHash}`;
  }

  return (
    <section className="panel stack">
      <h2>Execute</h2>
      <p className="muted">Approve the mock token, deposit to the mock vault, then wait for confirmed block evidence.</p>
      <button className="primary" onClick={execute}>Start mock deposit</button>
    </section>
  );
}
```

- [ ] **Step 4: Run web checks**

Run:

```powershell
pnpm --filter @giwa/web typecheck
pnpm --filter @giwa/web build
```

Expected:

```text
TypeScript reports no errors and Next.js production build succeeds.
```

- [ ] **Step 5: Commit user flow**

Run:

```powershell
git add apps/web/src/app apps/web/src/components
git commit -m "feat: add flagship mock vault user flow"
```

Expected:

```text
Commit created.
```

## Task 9: Receipt and Partner Summary Screens

**Files:**
- Create: `apps/web/src/lib/storage/runStore.ts`
- Create: `apps/web/src/app/api/runs/event/route.ts`
- Create: `apps/web/src/app/receipt/[receiptHash]/page.tsx`
- Create: `apps/web/src/app/partner/page.tsx`
- Create: `apps/web/src/components/PartnerSummary.tsx`

- [ ] **Step 1: Implement run event store**

Write `apps/web/src/lib/storage/runStore.ts`:

```ts
import fs from "node:fs";
import path from "node:path";

export type RunEventName = "campaign_entry" | "wallet_connected" | "intent_accepted" | "deposit_submitted" | "receipt_matched";

export type RunEvent = {
  runId: string;
  campaignId: string;
  missionId: string;
  wallet?: `0x${string}`;
  event: RunEventName;
  amountBaseUnits?: string;
  receiptHash?: `0x${string}`;
  depositTxHash?: `0x${string}`;
  createdAt: number;
};

const dataDir = path.join(process.cwd(), ".data");
const runPath = path.join(dataDir, "runs.jsonl");

export function saveRunEvent(event: RunEvent): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.appendFileSync(runPath, `${JSON.stringify(event)}\n`, "utf8");
}

export function listRunEvents(): RunEvent[] {
  if (!fs.existsSync(runPath)) {
    return [];
  }

  return fs
    .readFileSync(runPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RunEvent);
}
```

- [ ] **Step 2: Implement run event API**

Write `apps/web/src/app/api/runs/event/route.ts`:

```ts
import { NextResponse } from "next/server";
import { saveRunEvent, type RunEvent } from "@/lib/storage/runStore";

export async function POST(request: Request) {
  const body = (await request.json()) as RunEvent;
  saveRunEvent({
    ...body,
    createdAt: body.createdAt || Math.floor(Date.now() / 1000)
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Implement receipt page**

Write `apps/web/src/app/receipt/[receiptHash]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { findReceipt } from "@/lib/storage/receiptStore";

export default function ReceiptPage({ params }: { params: { receiptHash: string } }) {
  const receipt = findReceipt(params.receiptHash);
  if (!receipt) {
    notFound();
  }

  return (
    <main className="shell stack">
      <h1>ProofKPI Receipt</h1>
      <section className="panel stack">
        <p>Status: {receipt.status}</p>
        <p>Receipt hash: {receipt.receiptHash}</p>
        <p>Intent hash: {receipt.intentHash}</p>
        <p>Deposit tx: <a href={receipt.explorerUrl}>{receipt.depositTxHash}</a></p>
        <p>Block: {receipt.blockNumber}</p>
        <p>Verified state: {receipt.verifiedState}</p>
        <p>Mock testnet deposit delta: {receipt.testnetDepositAmountDelta}</p>
        <p className="muted">{receipt.safetyNotice}</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Implement partner summary**

Write `apps/web/src/components/PartnerSummary.tsx`:

```tsx
import type { ProofKpiReceipt } from "@giwa/protocol";
import type { RunEvent } from "@/lib/storage/runStore";

export function PartnerSummary({ events, receipts }: { events: RunEvent[]; receipts: ProofKpiReceipt[] }) {
  const entries = events.filter((event) => event.event === "campaign_entry").length;
  const connected = events.filter((event) => event.event === "wallet_connected").length;
  const accepted = events.filter((event) => event.event === "intent_accepted").length;
  const submitted = events.filter((event) => event.event === "deposit_submitted").length;
  const matched = receipts.length;
  const matchedRate = submitted === 0 ? "0%" : `${Math.round((matched / submitted) * 100)}%`;
  const amount = receipts.reduce((sum, receipt) => sum + BigInt(receipt.testnetDepositAmountDelta), 0n).toString();

  return (
    <section className="panel stack">
      <h2>Partner Summary</h2>
      <p>Campaign entries: {entries}</p>
      <p>Wallet connected: {connected}</p>
      <p>Intent accepted: {accepted}</p>
      <p>Deposit submitted: {submitted}</p>
      <p>Manifest-matched receipts: {matched}</p>
      <p>Matched tx rate: {matchedRate}</p>
      <p>Mock testnet deposit metrics: {amount}</p>
      <p className="muted">Metrics are testnet-only and do not represent real TVL, yield, settlement, or RWA issuance.</p>
    </section>
  );
}
```

Write `apps/web/src/app/partner/page.tsx`:

```tsx
import { PartnerSummary } from "@/components/PartnerSummary";
import { listReceipts } from "@/lib/storage/receiptStore";
import { listRunEvents } from "@/lib/storage/runStore";

export default function PartnerPage() {
  return (
    <main className="shell stack">
      <h1>GIWA Verified Intent Rail Partner Report</h1>
      <PartnerSummary events={listRunEvents()} receipts={listReceipts()} />
    </main>
  );
}
```

- [ ] **Step 5: Run partner page checks**

Run:

```powershell
pnpm --filter @giwa/web typecheck
pnpm --filter @giwa/web build
```

Expected:

```text
TypeScript reports no errors and Next.js production build succeeds.
```

- [ ] **Step 6: Commit reporting screens**

Run:

```powershell
git add apps/web/src/lib/storage apps/web/src/app/api/runs apps/web/src/app/receipt apps/web/src/app/partner apps/web/src/components/PartnerSummary.tsx
git commit -m "feat: add receipts and partner summary"
```

Expected:

```text
Commit created.
```

## Task 10: Acceptance Cases and Demo Runbook

**Files:**
- Create: `docs/implementation/giwa-mvp-runbook.md`
- Modify: `README.md`
- Test: local verification commands

- [ ] **Step 1: Add runbook**

Write `docs/implementation/giwa-mvp-runbook.md`:

```markdown
# GIWA Verified Intent Rail MVP Runbook

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Set `CAMPAIGN_SIGNER_PRIVATE_KEY` and `VERIFIER_PRIVATE_KEY` to funded GIWA Sepolia testnet keys.
3. Deploy contracts:

```powershell
pnpm --filter @giwa/contracts hardhat run scripts/deploy.ts --network giwaSepolia
```

4. Copy deployed addresses into `.env.local` if needed.
5. Start the app:

```powershell
pnpm dev
```

## Happy Path

1. Open `http://localhost:3000`.
2. Connect wallet on GIWA Sepolia.
3. Review target, selector, asset, amount, spender, and max allowance.
4. Submit intent event.
5. Approve the mock token.
6. Deposit to the mock vault.
7. Confirm the UI shows submitted, fast feedback, confirmed.
8. Confirm receipt page shows `depositTxHash`, `receiptHash`, `blockNumber`, `verifiedState`, and testnet-only safety notice.
9. Open `http://localhost:3000/partner`.
10. Confirm partner summary shows matched receipt and mock testnet deposit metrics.

## Acceptance Cases

- Wrong network: app blocks execution and asks for GIWA Sepolia.
- Insufficient mock token balance: approve or deposit fails and no receipt is issued.
- Expired manifest: verifier returns `timeout` or `mismatched` and no successful receipt is issued.
- Mismatched target: verifier returns `mismatched`.
- Mismatched spender: verifier returns `mismatched`.
- Allowance above max: verifier returns `mismatched`.
- Failed deposit transaction: verifier returns `failed`.
- Flashblocks timeout: UI shows timeout and tells the user to check explorer before retrying.
- Dojang/up.id unavailable: user remains in `guest` or `unavailable` flow.

## Language Guardrails

Use:

- "fast feedback"
- "block confirmation"
- "testnet-only"
- "mock vault deposit"
- "manifest-matched"

Do not use:

- "instant finality"
- "200ms confirmed"
- "guarantee safety"
- "perform KYC"
- "real RWA"
- "real yield"
- "settlement"
```

- [ ] **Step 2: Update README with implementation entrypoints**

Add this section to `README.md`:

```markdown
## MVP Implementation Entrypoints

- `apps/web` - GIWA Verified Intent Rail user flow, receipt screen, and partner report.
- `packages/protocol` - canonical manifest, intent hash, receipt payload, and receipt hash rules.
- `packages/contracts` - mock token, mock vault, and intent event contract.
- `docs/implementation/giwa-mvp-runbook.md` - local setup, demo path, and acceptance cases.
```

- [ ] **Step 3: Run full verification**

Run:

```powershell
pnpm test
pnpm typecheck
pnpm build
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
rg -n $docPattern . -g "*.md"
$riskPattern = "instant final" + "ity|200ms confirm" + "ed|guarantee safe" + "ty|perform K" + "YC|real R" + "WA|real y" + "ield"
rg -n $riskPattern . -g "*.md"
```

Expected:

```text
All tests pass.
TypeScript reports no errors.
Build succeeds.
The documentation scan for unfinished markers has no implementation-plan leftovers.
Risk phrase matches appear only inside explicit guardrail or forbidden-claim sections.
```

- [ ] **Step 4: Commit runbook**

Run:

```powershell
git add docs/implementation README.md
git commit -m "docs: add GIWA MVP implementation runbook"
```

Expected:

```text
Commit created.
```

## Task 11: Manual End-to-End Demo Verification

**Files:**
- Use: `apps/web`
- Use: `packages/contracts`
- Use: `docs/implementation/giwa-mvp-runbook.md`

- [ ] **Step 1: Start local app**

Run:

```powershell
pnpm dev
```

Expected:

```text
Next.js starts on http://localhost:3000.
```

- [ ] **Step 2: Execute the flagship flow**

In the browser:

```text
Connect wallet -> review intent -> submit intent -> approve mock token -> deposit -> wait for confirmed -> receive receipt.
```

Expected:

```text
The receipt appears only after block confirmation and includes depositTxHash, receiptHash, blockNumber, explorerUrl, verifiedState, and safetyNotice.
```

- [ ] **Step 3: Verify partner report**

Open:

```text
http://localhost:3000/partner
```

Expected:

```text
Partner summary displays campaign entries, wallet connections, intent accepted count, deposit submitted count, manifest-matched receipts, matched tx rate, and mock testnet deposit metrics.
```

- [ ] **Step 4: Capture demo evidence**

Save these values in the final implementation report:

```text
mockToken address
mockVault address
intentRail address
depositTxHash
receiptHash
receipt page URL
partner page URL
```

## Self-Review

- Spec coverage: The plan covers manifest, preview, GIWA Sepolia transaction, Flashblocks fast feedback, confirmed block evidence, verifier decision, receipt, and partner report.
- Boundary coverage: The plan keeps the MVP testnet-only and includes copy guardrails against real funds, yield, RWA issuance, settlement, security, and KYC claims.
- Type consistency: The shared protocol fields match the 03 positioning document and are reused in API routes, verifier, UI, receipt, and partner summary.
- Known execution gate: Dependency installation and funded GIWA Sepolia testnet keys require user action before implementation can run end-to-end.

## Sources

- GIWA connect docs: https://docs.giwa.io/get-started/connect-to-giwa
- GIWA Flashblocks docs: https://docs.giwa.io/giwa-chain/en/network-information/flashblocks
- GIWA Verified Address docs: https://docs.giwa.io/giwa-chain/en/giwa-ecosystem/dojang/verified-address
- GIWA up.id docs: https://docs.giwa.io/giwa-chain/en/giwa-ecosystem/up-id
