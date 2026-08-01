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

  it("reads the latest native balance as a bigint", async () => {
    const provider = new MockProvider({ eth_getBalance: "0xde0b6b3a7640000" });
    const wallet = createEip1193WalletAdapter(provider);

    await expect(wallet.getBalance("0x1111111111111111111111111111111111111111")).resolves.toBe(
      1_000_000_000_000_000_000n
    );
    expect(provider.requests[0]).toEqual({
      method: "eth_getBalance",
      params: ["0x1111111111111111111111111111111111111111", "latest"]
    });

    await expect(
      createEip1193WalletAdapter(new MockProvider({ eth_getBalance: "0x0" })).getBalance(
        "0x1111111111111111111111111111111111111111"
      )
    ).resolves.toBe(0n);
    await expect(
      createEip1193WalletAdapter(new MockProvider({ eth_getBalance: `0x${"f".repeat(64)}` })).getBalance(
        "0x1111111111111111111111111111111111111111"
      )
    ).resolves.toBe((1n << 256n) - 1n);
  });

  it("rejects non-canonical or out-of-range native balance quantities", async () => {
    const account = "0x1111111111111111111111111111111111111111";
    const malformedQuantities = [
      "0x00",
      "0x01",
      `0x1${"0".repeat(64)}`,
      "0x",
      "-0x1",
      " 0x1",
      "0x1 ",
      "0xgg"
    ];

    for (const value of malformedQuantities) {
      await expect(
        createEip1193WalletAdapter(new MockProvider({ eth_getBalance: value })).getBalance(account)
      ).rejects.toThrow("provider balance must be a canonical uint256 quantity");
    }
  });

  it("reads an ERC-20 call result as a bigint", async () => {
    const provider = new MockProvider({
      eth_call: `0x${BigInt(10).toString(16).padStart(64, "0")}`
    });
    const wallet = createEip1193WalletAdapter(provider);
    const call = {
      to: "0x2222222222222222222222222222222222222222" as const,
      data: "0x70a082310000000000000000000000001111111111111111111111111111111111111111" as const
    };

    await expect(wallet.call(call)).resolves.toBe(10n);
    expect(provider.requests[0]).toEqual({ method: "eth_call", params: [call, "latest"] });
  });

  it("rejects call results that are not exactly one 32-byte ABI word", async () => {
    const call = {
      to: "0x2222222222222222222222222222222222222222" as const,
      data: "0x70a08231" as const
    };
    const malformedData = ["0x1", "0xabc", `0x${"1".repeat(66)}`, "0x", "0xnot-hex"];

    for (const value of malformedData) {
      await expect(createEip1193WalletAdapter(new MockProvider({ eth_call: value })).call(call)).rejects.toThrow(
        "provider call result must be 32-byte ABI data"
      );
    }
  });

  it("distinguishes pending, successful, and reverted transaction receipts", async () => {
    const transactionHash = `0x${"a".repeat(64)}` as const;

    const pendingProvider = new MockProvider({ eth_getTransactionReceipt: null });
    await expect(createEip1193WalletAdapter(pendingProvider).getTransactionReceipt(transactionHash)).resolves.toEqual({
      status: "pending"
    });
    expect(pendingProvider.requests[0]).toEqual({
      method: "eth_getTransactionReceipt",
      params: [transactionHash]
    });

    const successReceipt = { transactionHash: `0x${"A".repeat(64)}`, status: "0x1", blockNumber: "0x2" };
    const successResult = await createEip1193WalletAdapter(
      new MockProvider({ eth_getTransactionReceipt: successReceipt })
    ).getTransactionReceipt(transactionHash);
    expect(successResult).toEqual({
      status: "success",
      receipt: { transactionHash, status: "0x1" }
    });
    if (successResult.status !== "success") throw new Error("expected a successful receipt");
    expect(successResult.receipt).not.toHaveProperty("blockNumber");

    const revertedReceipt = { transactionHash, status: "0x0", blockNumber: "0x2" };
    await expect(
      createEip1193WalletAdapter(new MockProvider({ eth_getTransactionReceipt: revertedReceipt })).getTransactionReceipt(
        transactionHash
      )
    ).resolves.toEqual({ status: "reverted", receipt: { transactionHash, status: "0x0" } });
  });

  it("rejects receipts without a matching bytes32 transaction hash", async () => {
    const transactionHash = `0x${"a".repeat(64)}` as const;

    for (const malformedReceipt of [{ status: "0x1" }, { transactionHash: "0x1234", status: "0x1" }]) {
      await expect(
        createEip1193WalletAdapter(
          new MockProvider({ eth_getTransactionReceipt: malformedReceipt })
        ).getTransactionReceipt(transactionHash)
      ).rejects.toThrow("provider receipt transaction hash must be bytes32 hex");
    }

    await expect(
      createEip1193WalletAdapter(
        new MockProvider({
          eth_getTransactionReceipt: { transactionHash: `0x${"b".repeat(64)}`, status: "0x1" }
        })
      ).getTransactionReceipt(transactionHash)
    ).rejects.toThrow("provider receipt transaction hash must match requested transaction hash");
  });

  it("rejects malformed read-call data and receipt statuses with bounded errors", async () => {
    const account = "0x1111111111111111111111111111111111111111";
    await expect(createEip1193WalletAdapter(new MockProvider({ eth_getBalance: "one" })).getBalance(account)).rejects.toThrow(
      "provider balance must be a canonical uint256 quantity"
    );

    await expect(
      createEip1193WalletAdapter(new MockProvider({ eth_call: "0xnot-hex" })).call({
        to: "0x2222222222222222222222222222222222222222",
        data: "0x70a08231"
      })
    ).rejects.toThrow("provider call result must be 32-byte ABI data");

    const transactionHash = `0x${"a".repeat(64)}` as const;
    for (const malformedReceipt of ["not-an-object", []]) {
      await expect(
        createEip1193WalletAdapter(
          new MockProvider({ eth_getTransactionReceipt: malformedReceipt })
        ).getTransactionReceipt(transactionHash)
      ).rejects.toThrow("provider receipt must be an object");
    }
    for (const malformedReceipt of [
      { transactionHash },
      { transactionHash, status: "0x2" }
    ]) {
      await expect(
        createEip1193WalletAdapter(
          new MockProvider({ eth_getTransactionReceipt: malformedReceipt })
        ).getTransactionReceipt(transactionHash)
      ).rejects.toThrow("provider receipt status must be 0x1 or 0x0");
    }
  });
});
