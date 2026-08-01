import { describe, expect, it } from "vitest";

import {
  probeLiveChainReadiness,
  type LiveChainReadinessClient
} from "./liveChainReadiness.ts";

const contracts = {
  mockToken: "0x06a26a1182bd40ec38b38ee987a0a16cf572222f",
  mockVault: "0x94c7a4deb22318ff798cbe8340d7cc3365c405f6",
  intentRail: "0x5282325c5b82e9e3fb39050bdd8ec0f500185597"
} as const;

function clientWith(input?: {
  chainId?: number;
  bytecode?: Partial<Record<keyof typeof contracts, `0x${string}` | undefined>>;
  unavailable?: keyof typeof contracts;
}): LiveChainReadinessClient {
  const addresses = Object.fromEntries(Object.entries(contracts).map(([name, address]) => [address, name]));
  return {
    async getChainId() {
      return input?.chainId ?? 91342;
    },
    async getBytecode({ address }) {
      const name = addresses[address] as keyof typeof contracts;
      if (input?.unavailable === name) throw new Error("upstream detail must stay private");
      return input?.bytecode !== undefined && name in input.bytecode ? input.bytecode[name] : "0x6000";
    }
  };
}

describe("live chain readiness", () => {
  it("reports a wrong chain while still probing all configured contracts", async () => {
    const result = await probeLiveChainReadiness({
      client: clientWith({ chainId: 1 }),
      expectedChainId: 91342,
      contracts
    });

    expect(result).toEqual({
      ok: false,
      chainId: "wrong",
      contracts: { mockToken: "ok", mockVault: "ok", intentRail: "ok" }
    });
  });

  it("returns bounded missing and unavailable bytecode states", async () => {
    const result = await probeLiveChainReadiness({
      client: clientWith({ bytecode: { mockVault: undefined }, unavailable: "intentRail" }),
      expectedChainId: 91342,
      contracts
    });

    expect(result).toEqual({
      ok: false,
      chainId: "ok",
      contracts: { mockToken: "ok", mockVault: "missing", intentRail: "unavailable" }
    });
    expect(JSON.stringify(result)).not.toContain("upstream detail");
  });

  it("bounds the complete probe with a deterministic short timeout", async () => {
    const never = new Promise<number>(() => undefined);
    const client: LiveChainReadinessClient = {
      getChainId: () => never,
      async getBytecode() {
        return "0x6000";
      }
    };

    const result = await probeLiveChainReadiness({ client, expectedChainId: 91342, contracts, timeoutMs: 1 });

    expect(result).toEqual({
      ok: false,
      chainId: "unavailable",
      contracts: { mockToken: "unavailable", mockVault: "unavailable", intentRail: "unavailable" }
    });
  });
});
