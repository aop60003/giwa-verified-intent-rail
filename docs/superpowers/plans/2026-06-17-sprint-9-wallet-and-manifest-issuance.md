# Sprint 9 Wallet and Manifest Issuance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect a browser wallet, enforce GIWA Sepolia chain `91342`, and issue a signed wallet-bound manifest without sending approve or deposit transactions.

**Architecture:** Preserve the Sprint 7 recorded static fallback and Sprint 8 mock live API, then add a browser-safe EIP-1193 wallet boundary, chain gate, manifest invalidation model, and server-side protocol-backed manifest issuer. Sprint 9 stops at manifest preview and keeps chain transaction execution disabled for Sprint 10.

**Tech Stack:** TypeScript 6, Vitest 4, existing `@giwa/protocol` source utilities, viem 2 already present in the workspace, static browser JavaScript, Node HTTP live server, Sprint 8 `liveStore` and `liveApi` adapters.

---

## Source Documents

- `AGENTS.md`
- `README.md`
- `03_giwa_verified_intent_rail_positioning.md`
- `docs/superpowers/specs/2026-06-17-giwa-live-mvp-architecture-cutover-design.md`
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- `docs/superpowers/plans/2026-06-17-sprint-8-local-live-architecture-cutover.md`
- `docs/implementation/giwa-live-mvp-runtime-gate.md`
- `docs/implementation/giwa-mvp-role-and-key-policy.md`
- `docs/implementation/giwa-mvp-faucet-and-preflight.md`
- `docs/implementation/giwa-mvp-runbook.md`
- `apps/web/src/lib/live/*`
- `packages/protocol/src/*`

## Sprint 9 Boundary

Sprint 9 creates wallet connection, chain gating, and signed manifest issuance only.

Allowed:

- EIP-1193 provider adapter
- browser wallet connect request
- GIWA Sepolia chain id checks
- wallet and chain change listeners
- server-side protocol-backed manifest signing
- manifest preview linked to a live run
- invalidating issued manifests after wallet or chain changes
- preserving Sprint 8 mock mode for API smoke checks

Not allowed:

- sending approve transactions
- sending deposit transactions
- relaying `IntentSubmitted`
- running `deploy:giwa`, `fund:giwa`, `anchor:giwa`, or `verify:giwa`
- requesting or storing a user wallet private key
- exposing server-only role keys or tokenized RPC values in public files
- replacing the Sprint 7 static recorded demo
- using Flashblocks as final confirmation

## File Structure

Create:

- `docs/implementation/giwa-live-mvp-runtime-gate.md` Sprint 9 section - runtime boundary for wallet and manifest issuance
- `apps/web/src/lib/wallet/walletTypes.ts` - browser-safe EIP-1193 wallet state and constants
- `apps/web/src/lib/wallet/walletTypes.test.ts` - wallet type and status gate tests
- `apps/web/src/lib/wallet/eip1193Provider.ts` - injected provider wrapper with request and event helpers
- `apps/web/src/lib/wallet/eip1193Provider.test.ts` - mocked provider tests
- `apps/web/src/lib/wallet/giwaChainGate.ts` - GIWA Sepolia chain evaluation and switch/add request payloads
- `apps/web/src/lib/wallet/giwaChainGate.test.ts` - wrong-chain and chain-normalization tests
- `apps/web/src/lib/live/liveManifestIssuer.ts` - protocol-backed wallet-bound manifest issuer
- `apps/web/src/lib/live/liveManifestIssuer.test.ts` - signing, preview, and wallet-bound manifest tests
- `apps/web/src/lib/live/liveManifestState.ts` - manifest preview and invalidation state helpers
- `apps/web/src/lib/live/liveManifestState.test.ts` - wallet and chain change invalidation tests
- `apps/web/src/lib/live/liveFlowState.ts` - browser UI state model for live wallet and manifest preview
- `apps/web/src/lib/live/liveFlowState.test.ts` - UI state tests for connect, wrong chain, preview, and disabled transaction actions
- `apps/web/public/live.html` - local live flow shell used by the Sprint 9 live server
- `apps/web/public/live-flow.js` - browser runtime for wallet connect and manifest preview

Modify:

- `apps/web/src/lib/live/liveTypes.ts` - add `manifestInvalidated` and manifest preview response types
- `apps/web/src/lib/live/liveTypes.test.ts` - add receipt lock and invalidation tests
- `apps/web/src/lib/live/liveApi.ts` - make `/api/runs` return signed manifest data and keep chain action endpoints disabled
- `apps/web/src/lib/live/liveApi.test.ts` - add wallet-bound manifest and wrong-chain API tests
- `apps/web/scripts/serve-live.mjs` - use protocol-backed issuer outside mock mode and route `/live`
- `apps/web/package.json` - keep scripts unchanged unless `test:wallet` or `test:manifest` aliases are added without installing packages
- `docs/implementation/giwa-mvp-runbook.md` - document Sprint 9 local live wallet preview command
- `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md` - add Sprint 9 row if missing

No real `.env` or `.env.local` content may be printed or searched with content-printing commands.

## Task 1: Sprint 9 Runtime Boundary Document

**Files:**

- Modify: `docs/implementation/giwa-live-mvp-runtime-gate.md`
- Modify: `docs/implementation/giwa-mvp-runbook.md`

- [ ] **Step 1: Write the failing documentation scan**

Run before editing:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
rg -n "Sprint 9 Wallet and Manifest Issuance" docs\implementation\giwa-live-mvp-runtime-gate.md docs\implementation\giwa-mvp-runbook.md
rg -n $docPattern docs\implementation\giwa-live-mvp-runtime-gate.md docs\implementation\giwa-mvp-runbook.md
```

Expected:

```text
First command exits 1 because Sprint 9 runtime guidance is not present yet.
Second command prints no new unfinished-marker matches.
```

- [ ] **Step 2: Add Sprint 9 runtime gate text**

Append this section to `docs/implementation/giwa-live-mvp-runtime-gate.md`:

```markdown
## Sprint 9 Wallet and Manifest Issuance

Sprint 9 adds browser wallet connection and server-side manifest issuance. It does not send approve, deposit, intent relay, or verifier transactions.

The live server has two supported modes:

- `GIWA_LIVE_MOCK_MODE=1`: Sprint 8 API contract mode remains available for local smoke checks.
- `GIWA_LIVE_MOCK_MODE` unset: live env readiness must pass, and `/api/runs` issues protocol-backed signed manifests.

Browser code may read:

- connected wallet address
- wallet chain id
- public deployment addresses
- manifest preview fields
- run status

Browser code must not read server-only role keys, raw env files, private RPC credentials, or wallet recovery material.

Sprint 9 exit gate:

- wallet connect works with an EIP-1193 injected provider
- GIWA Sepolia chain `91342` is confirmed before manifest issuance
- wrong chain blocks manifest issuance
- a connected wallet receives a signed manifest bound to that wallet
- manifest preview shows target, selector, asset, amount, spender, max allowance, expiry, and intent hash
- account or chain changes invalidate the existing manifest
- approve and deposit actions remain disabled for Sprint 10
```

- [ ] **Step 3: Add runbook section**

Append this section to `docs/implementation/giwa-mvp-runbook.md`:

```markdown
## Sprint 9 Local Wallet Manifest Preview

Start the live server for wallet and manifest preview:

```powershell
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Open:

```text
Live wallet flow: http://127.0.0.1:4177/live
```

The Sprint 9 live flow connects a browser wallet, checks GIWA Sepolia chain `91342`, and requests a signed manifest preview. It does not send approve or deposit transactions.

Keep the Sprint 7 recorded fallback available:

```text
Static guided flow: http://127.0.0.1:4176/
Partner console:    http://127.0.0.1:4176/partner
```
```

- [ ] **Step 4: Run documentation scan**

Run:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield")
rg -n $docPattern docs\implementation\giwa-live-mvp-runtime-gate.md docs\implementation\giwa-mvp-runbook.md
rg -n $riskPattern docs\implementation\giwa-live-mvp-runtime-gate.md docs\implementation\giwa-mvp-runbook.md
```

Expected:

```text
No matches in the new Sprint 9 sections.
```

## Task 2: Wallet Adapter Types and Tests

**Files:**

- Create: `apps/web/src/lib/wallet/walletTypes.ts`
- Create: `apps/web/src/lib/wallet/walletTypes.test.ts`

- [ ] **Step 1: Write failing wallet type tests**

Create `apps/web/src/lib/wallet/walletTypes.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  GIWA_SEPOLIA_CHAIN_HEX,
  GIWA_SEPOLIA_CHAIN_ID,
  canIssueManifestFromWalletState,
  normalizeWalletAccount,
  walletStatusLabel
} from "./walletTypes.ts";

describe("Sprint 9 wallet types", () => {
  it("documents the GIWA Sepolia chain gate constants", () => {
    expect(GIWA_SEPOLIA_CHAIN_ID).toBe(91342);
    expect(GIWA_SEPOLIA_CHAIN_HEX).toBe("0x164ce");
  });

  it("normalizes connected wallet addresses for manifest binding", () => {
    expect(normalizeWalletAccount("0x00000000000000000000000000000000000000A1")).toBe(
      "0x00000000000000000000000000000000000000a1"
    );
  });

  it("blocks manifest issuance unless wallet and chain are ready", () => {
    expect(
      canIssueManifestFromWalletState({
        status: "connected",
        account: "0x0000000000000000000000000000000000000001",
        chainId: 91342
      })
    ).toBe(true);
    expect(canIssueManifestFromWalletState({ status: "wrongChain", account: null, chainId: 1 })).toBe(false);
    expect(canIssueManifestFromWalletState({ status: "manifestInvalidated", account: null, chainId: 91342 })).toBe(false);
  });

  it("keeps copy scoped to wallet readiness", () => {
    expect(walletStatusLabel("providerMissing")).toBe("Wallet provider not detected");
    expect(walletStatusLabel("wrongChain")).toBe("Switch to GIWA Sepolia");
    expect(walletStatusLabel("manifestInvalidated")).toBe("Manifest invalidated");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- walletTypes
```

Expected:

```text
FAIL because apps/web/src/lib/wallet/walletTypes.ts does not exist.
```

- [ ] **Step 3: Implement wallet types**

Create `apps/web/src/lib/wallet/walletTypes.ts`:

```typescript
import { isAddress } from "viem";

export const GIWA_SEPOLIA_CHAIN_ID = 91342 as const;
export const GIWA_SEPOLIA_CHAIN_HEX = "0x164ce" as const;

export const WALLET_STATUSES = [
  "providerMissing",
  "disconnected",
  "connecting",
  "connected",
  "wrongChain",
  "requestRejected",
  "switchRejected",
  "addChainRejected",
  "accountChanged",
  "chainChanged",
  "manifestInvalidated"
] as const;

export type WalletStatus = (typeof WALLET_STATUSES)[number];

export type WalletReadinessState = {
  status: WalletStatus;
  account: `0x${string}` | null;
  chainId: number | null;
};

export function normalizeWalletAccount(value: string): `0x${string}` {
  if (!isAddress(value, { strict: false })) {
    throw new Error("wallet account must be a valid address");
  }

  return value.toLowerCase() as `0x${string}`;
}

export function canIssueManifestFromWalletState(state: WalletReadinessState): boolean {
  return state.status === "connected" && state.account !== null && state.chainId === GIWA_SEPOLIA_CHAIN_ID;
}

export function walletStatusLabel(status: WalletStatus): string {
  const labels: Record<WalletStatus, string> = {
    providerMissing: "Wallet provider not detected",
    disconnected: "Connect wallet",
    connecting: "Wallet request pending",
    connected: "Wallet connected",
    wrongChain: "Switch to GIWA Sepolia",
    requestRejected: "Wallet request rejected",
    switchRejected: "Network switch rejected",
    addChainRejected: "Network add rejected",
    accountChanged: "Wallet account changed",
    chainChanged: "Wallet chain changed",
    manifestInvalidated: "Manifest invalidated"
  };

  return labels[status];
}
```

- [ ] **Step 4: Run wallet type tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- walletTypes
```

Expected:

```text
PASS walletTypes.test.ts
```

## Task 3: EIP-1193 Provider Wrapper

**Files:**

- Create: `apps/web/src/lib/wallet/eip1193Provider.ts`
- Create: `apps/web/src/lib/wallet/eip1193Provider.test.ts`

- [ ] **Step 1: Write failing provider wrapper tests**

Create `apps/web/src/lib/wallet/eip1193Provider.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { createEip1193WalletAdapter } from "./eip1193Provider.ts";

type Listener = (value: unknown) => void;

class MockProvider {
  public requests: Array<{ method: string; params?: unknown[] }> = [];
  private listeners = new Map<string, Listener[]>();

  constructor(private readonly responses: Record<string, unknown>) {}

  async request(input: { method: string; params?: unknown[] }): Promise<unknown> {
    this.requests.push(input);
    const value = this.responses[input.method];
    if (value instanceof Error) throw value;
    return value;
  }

  on(event: string, listener: Listener): void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
  }

  removeListener(event: string, listener: Listener): void {
    this.listeners.set(
      event,
      (this.listeners.get(event) ?? []).filter((candidate) => candidate !== listener)
    );
  }

  emit(event: string, value: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) listener(value);
  }
}

describe("EIP-1193 wallet adapter", () => {
  it("requests accounts and normalizes the selected wallet", async () => {
    const provider = new MockProvider({
      eth_requestAccounts: ["0x00000000000000000000000000000000000000A1"]
    });
    const wallet = createEip1193WalletAdapter(provider);

    await expect(wallet.requestAccounts()).resolves.toEqual(["0x00000000000000000000000000000000000000a1"]);
    expect(provider.requests[0]).toMatchObject({ method: "eth_requestAccounts" });
  });

  it("reads chain id from hex provider response", async () => {
    const provider = new MockProvider({ eth_chainId: "0x164ce" });
    const wallet = createEip1193WalletAdapter(provider);

    await expect(wallet.getChainId()).resolves.toBe(91342);
  });

  it("subscribes and unsubscribes account and chain listeners", () => {
    const provider = new MockProvider({});
    const wallet = createEip1193WalletAdapter(provider);
    const observed: string[] = [];

    const stopAccounts = wallet.onAccountsChanged((accounts) => observed.push(accounts[0] ?? "none"));
    const stopChain = wallet.onChainChanged((chainId) => observed.push(String(chainId)));

    provider.emit("accountsChanged", ["0x00000000000000000000000000000000000000B2"]);
    provider.emit("chainChanged", "0x164ce");
    stopAccounts();
    stopChain();
    provider.emit("chainChanged", "0x1");

    expect(observed).toEqual(["0x00000000000000000000000000000000000000b2", "91342"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- eip1193Provider
```

Expected:

```text
FAIL because apps/web/src/lib/wallet/eip1193Provider.ts does not exist.
```

- [ ] **Step 3: Implement provider wrapper**

Create `apps/web/src/lib/wallet/eip1193Provider.ts`:

```typescript
import { normalizeWalletAccount } from "./walletTypes.ts";

export type Eip1193Provider = {
  request(input: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (value: unknown) => void): void;
  removeListener?(event: string, listener: (value: unknown) => void): void;
};

export type Eip1193WalletAdapter = {
  requestAccounts(): Promise<`0x${string}`[]>;
  getChainId(): Promise<number>;
  requestSwitchChain(chainIdHex: string): Promise<void>;
  requestAddChain(params: Record<string, unknown>): Promise<void>;
  onAccountsChanged(listener: (accounts: `0x${string}`[]) => void): () => void;
  onChainChanged(listener: (chainId: number) => void): () => void;
};

function chainIdFromHex(value: unknown): number {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/u.test(value)) {
    throw new Error("provider chain id must be 0x-prefixed hex");
  }

  return Number.parseInt(value, 16);
}

function accountsFromProvider(value: unknown): `0x${string}`[] {
  if (!Array.isArray(value)) throw new Error("provider accounts response must be an array");
  return value.map((account) => normalizeWalletAccount(String(account)));
}

export function createEip1193WalletAdapter(provider: Eip1193Provider): Eip1193WalletAdapter {
  return {
    async requestAccounts() {
      return accountsFromProvider(await provider.request({ method: "eth_requestAccounts" }));
    },
    async getChainId() {
      return chainIdFromHex(await provider.request({ method: "eth_chainId" }));
    },
    async requestSwitchChain(chainIdHex) {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
    },
    async requestAddChain(params) {
      await provider.request({ method: "wallet_addEthereumChain", params: [params] });
    },
    onAccountsChanged(listener) {
      const wrapped = (value: unknown) => listener(accountsFromProvider(value));
      provider.on?.("accountsChanged", wrapped);
      return () => provider.removeListener?.("accountsChanged", wrapped);
    },
    onChainChanged(listener) {
      const wrapped = (value: unknown) => listener(chainIdFromHex(value));
      provider.on?.("chainChanged", wrapped);
      return () => provider.removeListener?.("chainChanged", wrapped);
    }
  };
}
```

- [ ] **Step 4: Run provider tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- eip1193Provider
```

Expected:

```text
PASS eip1193Provider.test.ts
```

## Task 4: GIWA Sepolia Chain Gate

**Files:**

- Create: `apps/web/src/lib/wallet/giwaChainGate.ts`
- Create: `apps/web/src/lib/wallet/giwaChainGate.test.ts`

- [ ] **Step 1: Write failing chain gate tests**

Create `apps/web/src/lib/wallet/giwaChainGate.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { GIWA_SEPOLIA_CHAIN_HEX, GIWA_SEPOLIA_CHAIN_ID } from "./walletTypes.ts";
import { buildGiwaAddChainRequest, evaluateGiwaChainGate } from "./giwaChainGate.ts";

describe("GIWA Sepolia chain gate", () => {
  it("allows manifest issuance only on GIWA Sepolia", () => {
    expect(evaluateGiwaChainGate({ account: "0x0000000000000000000000000000000000000001", chainId: 91342 })).toEqual({
      status: "connected",
      account: "0x0000000000000000000000000000000000000001",
      chainId: GIWA_SEPOLIA_CHAIN_ID
    });
    expect(evaluateGiwaChainGate({ account: "0x0000000000000000000000000000000000000001", chainId: 1 })).toMatchObject({
      status: "wrongChain",
      chainId: 1
    });
  });

  it("builds the wallet add-chain payload without private RPC values", () => {
    expect(buildGiwaAddChainRequest()).toMatchObject({
      chainId: GIWA_SEPOLIA_CHAIN_HEX,
      chainName: "GIWA Sepolia",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://sepolia-rpc.giwa.io"],
      blockExplorerUrls: ["https://sepolia-explorer.giwa.io"]
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- giwaChainGate
```

Expected:

```text
FAIL because apps/web/src/lib/wallet/giwaChainGate.ts does not exist.
```

- [ ] **Step 3: Implement chain gate**

Create `apps/web/src/lib/wallet/giwaChainGate.ts`:

```typescript
import {
  GIWA_SEPOLIA_CHAIN_HEX,
  GIWA_SEPOLIA_CHAIN_ID,
  type WalletReadinessState,
  normalizeWalletAccount
} from "./walletTypes.ts";

export function evaluateGiwaChainGate(input: { account: string | null; chainId: number | null }): WalletReadinessState {
  if (input.account === null) {
    return { status: "disconnected", account: null, chainId: input.chainId };
  }

  const account = normalizeWalletAccount(input.account);
  if (input.chainId !== GIWA_SEPOLIA_CHAIN_ID) {
    return { status: "wrongChain", account, chainId: input.chainId };
  }

  return { status: "connected", account, chainId: GIWA_SEPOLIA_CHAIN_ID };
}

export function buildGiwaAddChainRequest(): Record<string, unknown> {
  return {
    chainId: GIWA_SEPOLIA_CHAIN_HEX,
    chainName: "GIWA Sepolia",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://sepolia-rpc.giwa.io"],
    blockExplorerUrls: ["https://sepolia-explorer.giwa.io"]
  };
}
```

- [ ] **Step 4: Run chain gate tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- giwaChainGate
```

Expected:

```text
PASS giwaChainGate.test.ts
```

## Task 5: Live Manifest Issuer

**Files:**

- Create: `apps/web/src/lib/live/liveManifestIssuer.ts`
- Create: `apps/web/src/lib/live/liveManifestIssuer.test.ts`

- [ ] **Step 1: Write failing manifest issuer tests**

Create `apps/web/src/lib/live/liveManifestIssuer.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { keccak256, stringToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import deployment from "../../generated/deployment.json";
import { createLiveManifestIssuer } from "./liveManifestIssuer.ts";

const account = privateKeyToAccount(keccak256(stringToBytes("giwa sprint 9 manifest issuer test signer")));

describe("live manifest issuer", () => {
  it("issues a protocol-backed manifest bound to the connected wallet", async () => {
    const issuer = createLiveManifestIssuer({
      campaignSignerAccount: account,
      deployment,
      nowSeconds: () => 1790000000,
      nonceSource: () => "nonce-wallet-bound"
    });

    const issued = await issuer.issue({
      wallet: "0x00000000000000000000000000000000000000A1",
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: "qr-judge-demo"
    });

    expect(issued.manifest.wallet).toBe("0x00000000000000000000000000000000000000a1");
    expect(issued.manifest.chainId).toBe(91342);
    expect(issued.verifyingContract).toBe(deployment.intentRailAddress);
    expect(issued.intentHash).toMatch(/^0x[a-f0-9]{64}$/u);
    expect(issued.manifestSignature).toMatch(/^0x[a-f0-9]+$/u);
    expect(issued.preview).toMatchObject({
      target: deployment.mockVaultAddress,
      selector: "0xb6b55f25",
      asset: deployment.mockTokenAddress,
      amountBaseUnits: "1000000000000000000",
      spender: deployment.mockVaultAddress,
      maxAllowanceBaseUnits: "1000000000000000000",
      expiryUnix: 1790003600,
      intentHash: issued.intentHash
    });
  });

  it("rejects a deployment with the wrong GIWA chain id", () => {
    expect(() =>
      createLiveManifestIssuer({
        campaignSignerAccount: account,
        deployment: { ...deployment, chainId: 1 },
        nowSeconds: () => 1790000000,
        nonceSource: () => "nonce"
      })
    ).toThrow("deployment chainId must be 91342");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveManifestIssuer
```

Expected:

```text
FAIL because apps/web/src/lib/live/liveManifestIssuer.ts does not exist.
```

- [ ] **Step 3: Implement protocol-backed issuer**

Create `apps/web/src/lib/live/liveManifestIssuer.ts`:

```typescript
import {
  ACTION_TYPE,
  GIWA_SEPOLIA_CHAIN_ID,
  MANIFEST_VERSION,
  signManifest,
  type ActionManifest,
  type Address,
  type Hex,
  type SignedManifest
} from "../../../../../packages/protocol/src/index.ts";
import type { PrivateKeyAccount } from "viem/accounts";

export type LiveDeployment = {
  chainId: number;
  mockTokenAddress: string;
  mockVaultAddress: string;
  intentRailAddress: string;
};

export type LiveManifestIssueInput = {
  wallet: string;
  campaignId: string;
  missionId: string;
  referralCode: string | null;
};

export type LiveManifestPreview = {
  target: Address;
  selector: Hex;
  asset: Address;
  amountBaseUnits: string;
  spender: Address;
  maxAllowanceBaseUnits: string;
  expiryUnix: number;
  intentHash: Hex;
};

export type IssuedLiveManifest = SignedManifest & {
  preview: LiveManifestPreview;
  manifestJson: string;
};

export type LiveManifestIssuer = {
  issue(input: LiveManifestIssueInput): Promise<IssuedLiveManifest>;
};

export function createLiveManifestIssuer({
  campaignSignerAccount,
  deployment,
  nowSeconds,
  nonceSource
}: {
  campaignSignerAccount: PrivateKeyAccount;
  deployment: LiveDeployment;
  nowSeconds: () => number;
  nonceSource: () => string;
}): LiveManifestIssuer {
  if (deployment.chainId !== GIWA_SEPOLIA_CHAIN_ID) {
    throw new Error("deployment chainId must be 91342");
  }

  return {
    async issue(input) {
      const expiryUnix = nowSeconds() + 3600;
      const manifest: ActionManifest = {
        manifestVersion: MANIFEST_VERSION,
        chainId: GIWA_SEPOLIA_CHAIN_ID,
        nonce: nonceSource(),
        expiryUnix,
        campaignId: input.campaignId,
        missionId: input.missionId,
        wallet: input.wallet as Address,
        actionType: ACTION_TYPE,
        target: deployment.mockVaultAddress as Address,
        selector: "0xb6b55f25",
        asset: deployment.mockTokenAddress as Address,
        amountBaseUnits: "1000000000000000000",
        spender: deployment.mockVaultAddress as Address,
        maxAllowanceBaseUnits: "1000000000000000000",
        ...(input.referralCode === null ? {} : { referralCode: input.referralCode })
      };

      const signed = await signManifest({
        manifest,
        verifyingContract: deployment.intentRailAddress as Address,
        account: campaignSignerAccount
      });

      return {
        ...signed,
        manifestJson: JSON.stringify(signed.manifest),
        preview: {
          target: signed.manifest.target,
          selector: signed.manifest.selector,
          asset: signed.manifest.asset,
          amountBaseUnits: signed.manifest.amountBaseUnits,
          spender: signed.manifest.spender,
          maxAllowanceBaseUnits: signed.manifest.maxAllowanceBaseUnits,
          expiryUnix: signed.manifest.expiryUnix,
          intentHash: signed.intentHash
        }
      };
    }
  };
}
```

- [ ] **Step 4: Run manifest issuer tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveManifestIssuer
```

Expected:

```text
PASS liveManifestIssuer.test.ts
```

## Task 6: Server-Only Manifest Signing Integration

**Files:**

- Modify: `apps/web/scripts/serve-live.mjs`
- Modify: `apps/web/src/lib/live/liveEnv.ts`
- Modify: `apps/web/src/lib/live/liveEnv.test.ts`

- [ ] **Step 1: Write failing env and server integration tests**

Extend `apps/web/src/lib/live/liveEnv.test.ts`:

```typescript
it("keeps the campaign signer material server-only while exposing no raw value in readiness", () => {
  const readiness = buildRedactedLiveEnvReadiness({
    GIWA_SEPOLIA_RPC_URL: "https://sepolia-rpc.giwa.io",
    GIWA_EXPLORER_TX_URL_TEMPLATE: "https://sepolia-explorer.giwa.io/tx/{txHash}",
    GIWA_EXPLORER_ADDRESS_URL_TEMPLATE: "https://sepolia-explorer.giwa.io/address/{address}",
    CAMPAIGN_SIGNER_PRIVATE_KEY: `0x${"1".repeat(64)}`,
    INTENT_SUBMITTER_PRIVATE_KEY: `0x${"2".repeat(64)}`,
    VERIFIER_PRIVATE_KEY: `0x${"3".repeat(64)}`,
    GIWA_LIVE_DB_PATH: "apps/web/.data/live-mvp.sqlite"
  });

  expect(readiness.ok).toBe(true);
  expect(JSON.stringify(readiness)).not.toContain("1111111111111111111111111111111111111111111111111111111111111111");
  expect(readiness.keys.CAMPAIGN_SIGNER_PRIVATE_KEY).toMatchObject({ state: "set", format: "hex32", length: 66 });
});
```

Record this server smoke command in the Sprint 9 implementation handoff after `apps/web/scripts/serve-live.mjs` is changed:

```powershell
$env:GIWA_LIVE_MOCK_MODE="1"
$env:PORT="4177"
pnpm --filter @giwa/web --fail-if-no-match serve:live
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4177/api/partner/runs
```

Expected:

```text
HTTP 200 JSON response. Server logs show redacted env readiness only.
```

- [ ] **Step 2: Run test to verify baseline**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveEnv
```

Expected:

```text
PASS after the added readiness assertion because Sprint 8 already redacts key values.
```

- [ ] **Step 3: Replace non-mock issueManifest in live server**

Modify `apps/web/scripts/serve-live.mjs` so `GIWA_LIVE_MOCK_MODE=1` keeps the Sprint 8 mock issuer, and non-mock mode uses the protocol-backed manifest issuer:

```javascript
import { privateKeyToAccount } from "viem/accounts";
import deployment from "../src/generated/deployment.json" with { type: "json" };
import { requireLiveServerEnv } from "../src/lib/live/liveEnv.ts";
import { createLiveManifestIssuer } from "../src/lib/live/liveManifestIssuer.ts";

const serverEnv = mockMode ? null : requireLiveServerEnv({ ...process.env, GIWA_LIVE_DB_PATH: dbPath });

const manifestIssuer = mockMode
  ? null
  : createLiveManifestIssuer({
      campaignSignerAccount: privateKeyToAccount(serverEnv.campaignSignerPrivateKey),
      deployment,
      nowSeconds: () => Math.floor(Date.now() / 1000),
      nonceSource: () => `live-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    });

const api = createLiveApiHandler({
  store,
  now: () => new Date().toISOString(),
  issueManifest: mockMode
    ? async (input) => {
        const issuedAt = Date.now();
        return {
          runId: `live-${issuedAt.toString(36)}`,
          nonce: `nonce-${issuedAt.toString(36)}`,
          intentHash: `intent-${issuedAt.toString(36)}`,
          manifestJson: JSON.stringify(input),
          manifestSignature: "signature-not-issued-in-sprint-8",
          expiryUnix: Math.floor(issuedAt / 1000) + 3600,
          preview: null
        };
      }
    : async (input) => {
        const issued = await manifestIssuer.issue(input);
        return {
          runId: issued.intentHash,
          nonce: issued.manifest.nonce,
          intentHash: issued.intentHash,
          manifestJson: issued.manifestJson,
          manifestSignature: issued.manifestSignature,
          expiryUnix: issued.manifest.expiryUnix,
          preview: issued.preview
        };
      }
});
```

If the local Node runtime rejects JSON import assertions in `.mjs`, use `readFileSync` plus `JSON.parse` inside `serve-live.mjs` instead of adding a dependency.

- [ ] **Step 4: Run server syntax and manifest tests**

Run:

```powershell
node --check apps/web/scripts/serve-live.mjs
pnpm --filter @giwa/web --fail-if-no-match test -- liveEnv
pnpm --filter @giwa/web --fail-if-no-match test -- liveManifestIssuer
```

Expected:

```text
All commands exit 0.
```

## Task 7: Live API `/api/runs` Manifest Behavior

**Files:**

- Modify: `apps/web/src/lib/live/liveTypes.ts`
- Modify: `apps/web/src/lib/live/liveTypes.test.ts`
- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`

- [ ] **Step 1: Write failing API tests**

Extend `apps/web/src/lib/live/liveApi.test.ts`:

```typescript
it("requires GIWA Sepolia chain id before issuing a live manifest", async () => {
  const api = createLiveApiHandler({
    store: createMemoryLiveStore(),
    now: () => "2026-06-17T00:00:00.000Z",
    issueManifest: async () => {
      throw new Error("issuer should not run on wrong chain");
    }
  });

  const response = await api({
    method: "POST",
    pathname: "/api/runs",
    body: {
      wallet: "0x1111111111111111111111111111111111111111",
      chainId: 1,
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null
    }
  });

  expect(response.status).toBe(409);
  expect(response.body.error).toBe("wrong_chain");
});

it("returns signed manifest preview fields from the live issuer", async () => {
  const mockIntentHash = `0x${"a".repeat(64)}`;
  const api = createLiveApiHandler({
    store: createMemoryLiveStore(),
    now: () => "2026-06-17T00:00:00.000Z",
    issueManifest: async () => ({
      runId: "run-1",
      nonce: "nonce-1",
      intentHash: mockIntentHash,
      manifestJson: "{\"wallet\":\"0x1111111111111111111111111111111111111111\"}",
      manifestSignature: "0xsig",
      expiryUnix: 1790003600,
      preview: {
        target: "0x2222222222222222222222222222222222222222",
        selector: "0xb6b55f25",
        asset: "0x3333333333333333333333333333333333333333",
        amountBaseUnits: "1000000000000000000",
        spender: "0x2222222222222222222222222222222222222222",
        maxAllowanceBaseUnits: "1000000000000000000",
        expiryUnix: 1790003600,
        intentHash: mockIntentHash
      }
    })
  });

  const response = await api({
    method: "POST",
    pathname: "/api/runs",
    body: {
      wallet: "0x1111111111111111111111111111111111111111",
      chainId: 91342,
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null
    }
  });

  expect(response.status).toBe(201);
  expect(response.body.manifestPreview).toMatchObject({
    target: "0x2222222222222222222222222222222222222222",
    selector: "0xb6b55f25",
    intentHash: mockIntentHash
  });
  expect(response.body.approveAction).toMatchObject({ enabled: false, nextSprint: "Sprint 10" });
  expect(response.body.depositAction).toMatchObject({ enabled: false, nextSprint: "Sprint 10" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
FAIL because Sprint 8 /api/runs does not check chainId and does not return manifestPreview.
```

- [ ] **Step 3: Extend API request and response types**

Modify `apps/web/src/lib/live/liveApi.ts`:

```typescript
const GIWA_SEPOLIA_CHAIN_ID = 91342;

function optionalNumber(body: Record<string, unknown>, key: string): number | null {
  const value = body[key];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(`${key} must be an integer`);
  return value;
}
```

Update the `/api/runs` branch:

```typescript
const chainId = optionalNumber(body, "chainId");
if (chainId !== null && chainId !== GIWA_SEPOLIA_CHAIN_ID) {
  return { status: 409, body: { error: "wrong_chain", expectedChainId: GIWA_SEPOLIA_CHAIN_ID, receivedChainId: chainId } };
}

const issued = await deps.issueManifest(input);
```

Update `runResponse` to include preview and disabled transaction actions when present:

```typescript
function runResponse(run: LiveRunRecord, issued?: ManifestIssueResult): Record<string, unknown> {
  return {
    runId: run.runId,
    wallet: run.wallet,
    campaignId: run.campaignId,
    missionId: run.missionId,
    status: run.status,
    intentHash: run.intentHash,
    expiryUnix: run.expiryUnix,
    manifestPreview: issued?.preview ?? null,
    approveAction: { enabled: false, reason: "approve_disabled_until_sprint_10", nextSprint: "Sprint 10" },
    depositAction: { enabled: false, reason: "deposit_disabled_until_sprint_10", nextSprint: "Sprint 10" },
    createdAt: run.createdAt,
    updatedAt: run.updatedAt
  };
}
```

- [ ] **Step 4: Run API tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
PASS liveApi.test.ts
```

## Task 8: UI State Model and Manifest Preview

**Files:**

- Create: `apps/web/src/lib/live/liveFlowState.ts`
- Create: `apps/web/src/lib/live/liveFlowState.test.ts`
- Create: `apps/web/public/live.html`
- Create: `apps/web/public/live-flow.js`
- Modify: `apps/web/scripts/serve-live.mjs`
- Modify: `apps/web/public/styles.css`

- [ ] **Step 1: Write failing UI state tests**

Create `apps/web/src/lib/live/liveFlowState.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { buildLiveFlowViewModel } from "./liveFlowState.ts";

const preview = {
  target: "0x2222222222222222222222222222222222222222",
  selector: "0xb6b55f25",
  asset: "0x3333333333333333333333333333333333333333",
  amountBaseUnits: "1000000000000000000",
  spender: "0x2222222222222222222222222222222222222222",
  maxAllowanceBaseUnits: "1000000000000000000",
  expiryUnix: 1790003600,
  intentHash: `0x${"a".repeat(64)}`
};

describe("Sprint 9 live flow state", () => {
  it("shows connect wallet before an account is available", () => {
    const model = buildLiveFlowViewModel({ wallet: { status: "disconnected", account: null, chainId: null }, run: null });

    expect(model.primaryAction).toMatchObject({ kind: "connectWallet", enabled: true });
    expect(model.manifestPreview.visible).toBe(false);
  });

  it("blocks manifest issuance on the wrong chain", () => {
    const model = buildLiveFlowViewModel({
      wallet: { status: "wrongChain", account: "0x1111111111111111111111111111111111111111", chainId: 1 },
      run: null
    });

    expect(model.primaryAction).toMatchObject({ kind: "switchNetwork", enabled: true });
    expect(model.blockers).toContain("wrong_chain");
  });

  it("shows manifest preview and keeps transaction actions disabled", () => {
    const model = buildLiveFlowViewModel({
      wallet: { status: "connected", account: "0x1111111111111111111111111111111111111111", chainId: 91342 },
      run: { status: "manifestIssued", manifestPreview: preview }
    });

    expect(model.manifestPreview).toMatchObject({ visible: true, fields: preview });
    expect(model.approveAction).toMatchObject({ enabled: false, label: "Approve in Sprint 10" });
    expect(model.depositAction).toMatchObject({ enabled: false, label: "Deposit in Sprint 10" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveFlowState
```

Expected:

```text
FAIL because apps/web/src/lib/live/liveFlowState.ts does not exist.
```

- [ ] **Step 3: Implement UI state model**

Create `apps/web/src/lib/live/liveFlowState.ts`:

```typescript
import type { WalletReadinessState } from "../wallet/walletTypes.ts";

export type LiveManifestPreviewFields = {
  target: string;
  selector: string;
  asset: string;
  amountBaseUnits: string;
  spender: string;
  maxAllowanceBaseUnits: string;
  expiryUnix: number;
  intentHash: string;
};

export type LiveFlowInput = {
  wallet: WalletReadinessState;
  run: null | {
    status: string;
    manifestPreview: LiveManifestPreviewFields | null;
  };
};

export function buildLiveFlowViewModel(input: LiveFlowInput) {
  const wrongChain = input.wallet.status === "wrongChain";
  const previewVisible = input.run?.status === "manifestIssued" && input.run.manifestPreview !== null;

  return {
    screenKind: "live-wallet-manifest-flow" as const,
    blockers: wrongChain ? ["wrong_chain"] : [],
    primaryAction:
      input.wallet.account === null
        ? { kind: "connectWallet" as const, enabled: true }
        : wrongChain
          ? { kind: "switchNetwork" as const, enabled: true }
          : { kind: "issueManifest" as const, enabled: input.wallet.status === "connected" },
    manifestPreview: {
      visible: previewVisible,
      fields: input.run?.manifestPreview ?? null
    },
    approveAction: { enabled: false, label: "Approve in Sprint 10" },
    depositAction: { enabled: false, label: "Deposit in Sprint 10" }
  };
}
```

- [ ] **Step 4: Add static live flow shell**

Create `apps/web/public/live.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GIWA Verified Intent Rail Live</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main id="app" class="app-shell"></main>
    <script src="/live-flow.js"></script>
  </body>
</html>
```

Create `apps/web/public/live-flow.js` with browser-safe wallet and API calls only. The file must not read server-only env values:

```javascript
const app = document.querySelector("#app");
const GIWA_CHAIN_ID = 91342;
const GIWA_CHAIN_HEX = "0x164ce";
const addChainRequest = {
  chainId: GIWA_CHAIN_HEX,
  chainName: "GIWA Sepolia",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia-rpc.giwa.io"],
  blockExplorerUrls: ["https://sepolia-explorer.giwa.io"]
};

let walletState = { status: "disconnected", account: null, chainId: null };
let runState = null;
let invalidationNotice = null;

function view(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function field(label, value) {
  return view("div", { className: "field" }, [
    view("span", { className: "field-label", text: label }),
    view("span", { className: "mono field-value", text: String(value ?? "pending") })
  ]);
}

function normalizeAccount(account) {
  if (typeof account !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(account)) {
    throw new Error("wallet account must be a valid address");
  }
  return account.toLowerCase();
}

function parseChainId(value) {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]+$/.test(value)) {
    throw new Error("wallet chain id must be hex");
  }
  return Number.parseInt(value, 16);
}

function walletProvider() {
  return window.ethereum ?? null;
}

function walletCopy() {
  if (walletState.status === "wrongChain") return "Wrong network. Switch to GIWA Sepolia before requesting a manifest.";
  if (walletState.status === "manifestInvalidated") return "Wallet or chain changed. Request a fresh manifest before continuing.";
  if (walletState.account === null) return "Connect a wallet to start a live manifest preview.";
  return "Wallet connected on GIWA Sepolia. Manifest issuance is available.";
}

function renderManifestPreview() {
  const preview = runState?.manifestPreview ?? null;
  if (preview === null) {
    return view("section", { className: "panel" }, [
      view("div", { className: "panel-heading" }, [
        view("p", { className: "eyebrow", text: "Manifest preview" }),
        view("h2", { text: "Locked" })
      ]),
      view("p", { className: "muted", text: "Preview appears after wallet connect and GIWA Sepolia chain check." })
    ]);
  }

  return view("section", { className: "panel" }, [
    view("div", { className: "panel-heading" }, [
      view("p", { className: "eyebrow", text: "Manifest preview" }),
      view("h2", { text: "Wallet-bound action" })
    ]),
    field("Target", preview.target),
    field("Selector", preview.selector),
    field("Asset", preview.asset),
    field("Amount", preview.amountBaseUnits),
    field("Spender", preview.spender),
    field("Max allowance", preview.maxAllowanceBaseUnits),
    field("Expiry", preview.expiryUnix),
    field("Intent hash", preview.intentHash),
    view("p", { className: "notice", text: "Approve and deposit are disabled until Sprint 10." })
  ]);
}

function render() {
  app.textContent = "";
  app.append(
    view("section", { className: "hero-flow" }, [
      view("div", { className: "hero-copy" }, [
        view("p", { className: "eyebrow", text: "GIWA Sepolia live preview" }),
        view("h1", { text: "Review a wallet-bound manifest" }),
        view("p", { className: "lead", text: "Connect a wallet, confirm GIWA Sepolia, and preview the signed manifest. Approve and deposit remain disabled for Sprint 10." }),
        view("p", { className: "muted", text: walletCopy() }),
        invalidationNotice === null ? view("span") : view("p", { className: "notice", text: invalidationNotice }),
        view("div", { className: "hero-actions" }, [
          view("button", { type: "button", id: "primary-wallet-action", text: walletState.account ? "Issue manifest" : "Connect wallet" }),
          view("button", { type: "button", disabled: "true", text: "Approve in Sprint 10" }),
          view("button", { type: "button", disabled: "true", text: "Deposit in Sprint 10" })
        ])
      ]),
      renderManifestPreview()
    ])
  );
  document.querySelector("#primary-wallet-action")?.addEventListener("click", onPrimaryAction);
}

async function connectWallet(provider) {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const chainId = parseChainId(await provider.request({ method: "eth_chainId" }));
  walletState = {
    status: chainId === GIWA_CHAIN_ID ? "connected" : "wrongChain",
    account: normalizeAccount(accounts[0]),
    chainId
  };
}

async function switchToGiwa(provider) {
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: GIWA_CHAIN_HEX }] });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 4902) {
      await provider.request({ method: "wallet_addEthereumChain", params: [addChainRequest] });
    } else {
      throw error;
    }
  }
  const chainId = parseChainId(await provider.request({ method: "eth_chainId" }));
  walletState = { ...walletState, status: chainId === GIWA_CHAIN_ID ? "connected" : "wrongChain", chainId };
}

async function issueManifest() {
  if (walletState.account === null || walletState.chainId !== GIWA_CHAIN_ID) return;
  const response = await fetch("/api/runs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet: walletState.account,
      chainId: walletState.chainId,
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null
    })
  });
  runState = await response.json();
  invalidationNotice = null;
}

async function invalidateCurrentRun(reason) {
  if (!runState?.runId) return;
  await fetch(`/api/runs/${runState.runId}/invalidate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason })
  });
  runState = { ...runState, status: "manifestInvalidated", manifestPreview: null };
  walletState = { ...walletState, status: "manifestInvalidated" };
  invalidationNotice = reason === "account_changed" ? "Wallet account changed. Manifest invalidated." : "Wallet chain changed. Manifest invalidated.";
}

async function onPrimaryAction() {
  const provider = walletProvider();
  if (provider === null) {
    walletState = { status: "providerMissing", account: null, chainId: null };
    render();
    return;
  }

  if (walletState.account === null) await connectWallet(provider);
  if (walletState.status === "wrongChain") await switchToGiwa(provider);
  if (walletState.status === "connected") await issueManifest();
  render();
}

const provider = walletProvider();
if (provider?.on) {
  provider.on("accountsChanged", async (accounts) => {
    const nextAccount = Array.isArray(accounts) && accounts[0] ? normalizeAccount(accounts[0]) : null;
    if (runState !== null && nextAccount !== walletState.account) await invalidateCurrentRun("account_changed");
    walletState = { ...walletState, account: nextAccount, status: nextAccount === null ? "disconnected" : walletState.status };
    render();
  });
  provider.on("chainChanged", async (chainIdHex) => {
    const nextChainId = parseChainId(chainIdHex);
    if (runState !== null && nextChainId !== walletState.chainId) await invalidateCurrentRun("chain_changed");
    walletState = { ...walletState, chainId: nextChainId, status: nextChainId === GIWA_CHAIN_ID ? "connected" : "wrongChain" };
    render();
  });
}

render();
```

Modify `apps/web/scripts/serve-live.mjs` so `/live` returns `/live.html`:

```javascript
const requested =
  decoded === "/live"
    ? "/live.html"
    : decoded === "/" || decoded === "/partner" || decoded.startsWith("/receipt/")
      ? "/index.html"
      : decoded;
```

- [ ] **Step 5: Run UI state and syntax checks**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveFlowState
node --check apps/web/public/live-flow.js
node --check apps/web/scripts/serve-live.mjs
```

Expected:

```text
All commands exit 0.
```

## Task 9: Manifest Invalidation on Account or Chain Change

**Files:**

- Create: `apps/web/src/lib/live/liveManifestState.ts`
- Create: `apps/web/src/lib/live/liveManifestState.test.ts`
- Modify: `apps/web/src/lib/live/liveTypes.ts`
- Modify: `apps/web/src/lib/live/liveTypes.test.ts`
- Modify: `apps/web/src/lib/live/liveApi.ts`
- Modify: `apps/web/src/lib/live/liveApi.test.ts`
- Modify: `apps/web/public/live-flow.js`

- [ ] **Step 1: Write failing invalidation tests**

Create `apps/web/src/lib/live/liveManifestState.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { invalidateManifestForWalletChange } from "./liveManifestState.ts";

const run = {
  runId: "run-1",
  wallet: "0x1111111111111111111111111111111111111111",
  chainId: 91342,
  status: "manifestIssued",
  intentHash: `0x${"a".repeat(64)}`
};

describe("manifest invalidation", () => {
  it("invalidates a manifest when the account changes", () => {
    expect(
      invalidateManifestForWalletChange(run, {
        account: "0x2222222222222222222222222222222222222222",
        chainId: 91342
      })
    ).toMatchObject({
      status: "manifestInvalidated",
      reason: "account_changed"
    });
  });

  it("invalidates a manifest when the chain changes", () => {
    expect(
      invalidateManifestForWalletChange(run, {
        account: "0x1111111111111111111111111111111111111111",
        chainId: 1
      })
    ).toMatchObject({
      status: "manifestInvalidated",
      reason: "chain_changed"
    });
  });

  it("keeps the manifest valid when account and chain are unchanged", () => {
    expect(
      invalidateManifestForWalletChange(run, {
        account: "0x1111111111111111111111111111111111111111",
        chainId: 91342
      })
    ).toMatchObject({ status: "manifestIssued", reason: null });
  });
});
```

Extend `apps/web/src/lib/live/liveTypes.test.ts`:

```typescript
it("treats manifestInvalidated as non-terminal and receipt-locked", () => {
  expect(isTerminalLiveRunStatus("manifestInvalidated")).toBe(false);
  expect(canOpenReceiptRoute({ status: "manifestInvalidated", receiptHash: "0xreceipt" })).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveManifestState
pnpm --filter @giwa/web --fail-if-no-match test -- liveTypes
```

Expected:

```text
First command fails because liveManifestState.ts does not exist.
Second command fails until manifestInvalidated is added to LIVE_RUN_STATUSES.
```

- [ ] **Step 3: Implement invalidation helpers and status**

Modify `apps/web/src/lib/live/liveTypes.ts`:

```typescript
export const LIVE_RUN_STATUSES = [
  "created",
  "walletConnected",
  "wrongChain",
  "manifestIssued",
  "manifestInvalidated",
  "intentSubmitted",
  "approveRequired",
  "approveSubmitted",
  "approveConfirmed",
  "depositReady",
  "depositSubmitted",
  "depositConfirmed",
  "verifierChecking",
  "matched",
  "mismatched",
  "failed",
  "timeout"
] as const;
```

Create `apps/web/src/lib/live/liveManifestState.ts`:

```typescript
export type ManifestInvalidationRun = {
  runId: string;
  wallet: string;
  chainId: number;
  status: string;
  intentHash: string;
};

export type ManifestInvalidationWallet = {
  account: string | null;
  chainId: number | null;
};

export function invalidateManifestForWalletChange(
  run: ManifestInvalidationRun,
  wallet: ManifestInvalidationWallet
): ManifestInvalidationRun & { reason: "account_changed" | "chain_changed" | null } {
  if (wallet.account === null || wallet.account.toLowerCase() !== run.wallet.toLowerCase()) {
    return { ...run, status: "manifestInvalidated", reason: "account_changed" };
  }

  if (wallet.chainId !== run.chainId) {
    return { ...run, status: "manifestInvalidated", reason: "chain_changed" };
  }

  return { ...run, reason: null };
}
```

- [ ] **Step 4: Add API invalidation endpoint**

Extend `apps/web/src/lib/live/liveApi.test.ts`:

```typescript
it("marks a run manifest invalidated without sending a chain transaction", async () => {
  const store = createMemoryLiveStore();
  const mockIntentHash = `0x${"a".repeat(64)}`;
  const api = createLiveApiHandler({
    store,
    now: () => "2026-06-17T00:00:00.000Z",
    issueManifest: async () => ({
      runId: "run-1",
      nonce: "nonce-1",
      intentHash: mockIntentHash,
      manifestJson: "{}",
      manifestSignature: "0xsig",
      expiryUnix: 1790003600,
      preview: null
    })
  });

  await api({
    method: "POST",
    pathname: "/api/runs",
    body: {
      wallet: "0x1111111111111111111111111111111111111111",
      chainId: 91342,
      campaignId: "gasok-demo",
      missionId: "first-mock-vault-deposit",
      referralCode: null
    }
  });

  const response = await api({
    method: "POST",
    pathname: "/api/runs/run-1/invalidate",
    body: { reason: "account_changed" }
  });

  expect(response.status).toBe(200);
  expect(response.body.status).toBe("manifestInvalidated");
  expect(store.getRun("run-1")?.status).toBe("manifestInvalidated");
});
```

Modify `apps/web/src/lib/live/liveApi.ts`:

```typescript
const invalidateRunId = request.method === "POST" ? runIdFrom(request.pathname, "/invalidate") : undefined;
if (invalidateRunId !== undefined) {
  const run = deps.store.getRun(invalidateRunId);
  if (run === undefined) return { status: 404, body: { error: "run_not_found" } };
  const updated = deps.store.updateRunStatus(invalidateRunId, "manifestInvalidated", deps.now());
  return { status: 200, body: { ...runResponse(updated), invalidationAccepted: true } };
}
```

- [ ] **Step 5: Wire browser invalidation**

In `apps/web/public/live-flow.js`, account and chain event handlers must clear `runState`, show invalidated copy, and call `/api/runs/:runId/invalidate` when a run exists:

```javascript
async function invalidateCurrentRun(reason) {
  if (!runState?.runId) return;
  await fetch(`/api/runs/${runState.runId}/invalidate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason })
  });
  runState = { ...runState, status: "manifestInvalidated", invalidationReason: reason };
  render();
}
```

This handler must not call `eth_sendTransaction`.

- [ ] **Step 6: Run invalidation tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- liveManifestState
pnpm --filter @giwa/web --fail-if-no-match test -- liveTypes
pnpm --filter @giwa/web --fail-if-no-match test -- liveApi
```

Expected:

```text
All commands exit 0.
```

## Task 10: Static Fallback and Sprint 8 Mock API Regression

**Files:**

- Modify: `apps/web/scripts/serve-live.mjs`
- Verify: `apps/web/public/index.html`
- Verify: `apps/web/public/flow.js`
- Verify: `apps/web/public/partner-snapshot.json`

- [ ] **Step 1: Write regression checks**

Before modifying public routing further, run:

```powershell
node --check apps/web/public/flow.js
node --check apps/web/public/live-flow.js
node --check apps/web/scripts/serve-live.mjs
```

Expected:

```text
All syntax checks exit 0.
```

- [ ] **Step 2: Smoke Sprint 8 mock mode**

Run in a separate shell:

```powershell
$env:GIWA_LIVE_MOCK_MODE="1"
$env:PORT="4177"
pnpm --filter @giwa/web --fail-if-no-match serve:live
```

Then run:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4177/api/partner/runs
```

Expected:

```text
HTTP 200 JSON response with source live and rows array.
```

- [ ] **Step 3: Smoke Sprint 7 static fallback**

Run:

```powershell
$env:PORT="4176"
pnpm --filter @giwa/web --fail-if-no-match serve
```

Open or request:

```text
http://127.0.0.1:4176/
http://127.0.0.1:4176/partner
http://127.0.0.1:4176/partner-snapshot.json
```

Expected:

```text
All routes return HTTP 200 and continue to show recorded fixture evidence.
```

- [ ] **Step 4: Confirm transaction methods are absent**

Run:

```powershell
rg -n "eth_sendTransaction|approve\\(|deposit\\(" apps\web\public\live-flow.js apps\web\src\lib\wallet apps\web\src\lib\live -g "*.js" -g "*.ts"
```

Expected:

```text
No matches for transaction-sending calls introduced by Sprint 9.
```

## Task 11: Final Verification and Safety Scans

**Files:**

- Verify: `docs/superpowers/plans/2026-06-17-sprint-9-wallet-and-manifest-issuance.md`
- Verify: `docs/superpowers/plans/2026-06-16-giwa-mvp-sprint-index.md`
- Verify: `docs/implementation/giwa-live-mvp-runtime-gate.md`
- Verify: `apps/web/src/lib/wallet/*`
- Verify: `apps/web/src/lib/live/*`
- Verify: `apps/web/public/*`

- [ ] **Step 1: Run Sprint 9 focused tests**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test -- wallet
pnpm --filter @giwa/web --fail-if-no-match test -- manifest
```

Expected:

```text
Wallet tests pass.
Manifest tests pass.
```

- [ ] **Step 2: Run web and workspace verification**

Run:

```powershell
pnpm --filter @giwa/web --fail-if-no-match test
pnpm --filter @giwa/web --fail-if-no-match typecheck
pnpm --filter @giwa/web --fail-if-no-match build
pnpm test
pnpm build
node --check apps/web/public/flow.js
node --check apps/web/scripts/serve-live.mjs
```

Expected:

```text
All commands exit 0. Node experimental warnings are acceptable only when they come from the existing Sprint 8 Node runtime boundaries.
```

- [ ] **Step 3: Run safe scans without reading real env files**

Run:

```powershell
$docPattern = "TO" + "DO|FIX" + "ME|TB" + "D"
$riskPattern = ("instant final" + "ity") + "|" + ("200ms confirm" + "ed") + "|" + ("guarantee safe" + "ty") + "|" + ("perform K" + "YC") + "|" + ("real R" + "WA") + "|" + ("real y" + "ield")
$secretPattern = "0x[a-fA-F0-9]{64}|mnem" + "onic|seed ph" + "rase|Bear" + "er|api[_-]?ke" + "y|access[_-]?tok" + "en|NEXT_PUBLIC_.*(SECRET|PRIVATE|API[_-]?KEY)"
rg -n $docPattern docs\superpowers\plans\2026-06-17-sprint-9-wallet-and-manifest-issuance.md docs\implementation\giwa-live-mvp-runtime-gate.md docs\implementation\giwa-mvp-runbook.md apps\web\src apps\web\public -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
rg -n $riskPattern docs\superpowers\plans\2026-06-17-sprint-9-wallet-and-manifest-issuance.md docs\implementation apps\web\src apps\web\public -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
rg -n $secretPattern docs\superpowers\plans\2026-06-17-sprint-9-wallet-and-manifest-issuance.md docs\implementation apps\web\src apps\web\public -g "*.md" -g "*.ts" -g "*.js" -g "*.html" -g "*.css" -g "*.json" -g "!**/.env*"
```

Expected:

```text
Unfinished-marker scan has no matches in Sprint 9 code or Sprint 9 docs.
Forbidden-claim scan has no matches in user-facing Sprint 9 copy.
Secret-like scan has no live values. Pattern definitions, empty variable-name examples, and synthetic test strings are allowed only when no raw credential value is printed.
```

- [ ] **Step 4: Confirm Sprint 9 scope stop**

Run:

```powershell
rg -n "eth_sendTransaction|wallet_sendTransaction|approve\\(|deposit\\(|submitIntent|IntentSubmitted|IntentMatched" apps\web\src apps\web\public -g "*.ts" -g "*.js" -g "*.html"
```

Expected:

```text
No new Sprint 9 browser path sends approve or deposit transactions.
`IntentSubmitted` and `IntentMatched` may appear only in fixture display or existing verifier references, not as a Sprint 9 execution path.
```

## Sprint 9 Exit Gate

Sprint 9 is complete only when:

- user can connect an EIP-1193 wallet
- GIWA Sepolia chain id `91342` is detected
- wrong chain blocks manifest issuance
- connected wallet receives a signed manifest bound to that wallet
- manifest preview displays target, selector, asset, amount, spender, max allowance, expiry, and intent hash
- account or chain changes set the manifest state to invalidated
- approve and deposit actions remain disabled with Sprint 10 copy
- Sprint 7 static fallback still works
- Sprint 8 mock API still works
- no wallet transaction is sent

## Handoff

Sprint 9 completion report must include:

- files changed
- commands run
- live wallet URL
- static fallback URL
- manifest preview fields observed
- proof that approve and deposit remain disabled
- unresolved risks
- explicit next sprint document path: `docs/superpowers/plans/2026-06-17-sprint-10-live-approve-and-deposit.md`
