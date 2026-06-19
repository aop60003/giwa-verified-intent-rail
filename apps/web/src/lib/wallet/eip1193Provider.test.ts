import { describe, expect, it } from "vitest";

import { createEip1193WalletAdapter } from "./eip1193Provider.ts";

type Listener = (value: unknown) => void;

class MockProvider {
  public requests: Array<{ method: string; params?: unknown[] }> = [];
  private readonly listeners = new Map<string, Listener[]>();

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

  it("sends a transaction request through the browser wallet and normalizes the returned hash", async () => {
    const provider = new MockProvider({
      eth_sendTransaction: `0x${"A".repeat(64)}`
    });
    const wallet = createEip1193WalletAdapter(provider);

    await expect(
      wallet.sendTransaction({
        from: "0x1111111111111111111111111111111111111111",
        to: "0x2222222222222222222222222222222222222222",
        data: "0x095ea7b3",
        value: "0x0"
      })
    ).resolves.toBe(`0x${"a".repeat(64)}`);
    expect(provider.requests[0]).toEqual({
      method: "eth_sendTransaction",
      params: [
        {
          from: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          data: "0x095ea7b3",
          value: "0x0"
        }
      ]
    });
  });

  it("rejects malformed transaction hashes from the wallet provider", async () => {
    const provider = new MockProvider({ eth_sendTransaction: "0x1234" });
    const wallet = createEip1193WalletAdapter(provider);

    await expect(
      wallet.sendTransaction({
        from: "0x1111111111111111111111111111111111111111",
        to: "0x2222222222222222222222222222222222222222",
        data: "0x095ea7b3",
        value: "0x0"
      })
    ).rejects.toThrow("provider transaction hash must be bytes32 hex");
  });
});
