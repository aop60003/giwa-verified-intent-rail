import { normalizeWalletAccount } from "./walletTypes.ts";

export type Eip1193Provider = {
  request(input: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (value: unknown) => void): void;
  removeListener?(event: string, listener: (value: unknown) => void): void;
};

export type Eip1193WalletAdapter = {
  requestAccounts(): Promise<`0x${string}`[]>;
  getChainId(): Promise<number>;
  getBalance(account: `0x${string}`): Promise<bigint>;
  call(request: Eip1193CallRequest): Promise<bigint>;
  getTransactionReceipt(transactionHash: `0x${string}`): Promise<Eip1193ReceiptPollResult>;
  requestSwitchChain(chainIdHex: string): Promise<void>;
  requestAddChain(params: Record<string, unknown>): Promise<void>;
  sendTransaction(request: Eip1193TransactionRequest): Promise<`0x${string}`>;
  onAccountsChanged(listener: (accounts: `0x${string}`[]) => void): () => void;
  onChainChanged(listener: (chainId: number) => void): () => void;
};

export type Eip1193TransactionRequest = {
  from: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
  value: "0x0";
};

export type Eip1193CallRequest = {
  to: `0x${string}`;
  data: `0x${string}`;
};

export type Eip1193TransactionReceipt = Record<string, unknown> & {
  status: "0x1" | "0x0";
};

export type Eip1193ReceiptPollResult =
  | { status: "pending" }
  | { status: "success"; receipt: Eip1193TransactionReceipt }
  | { status: "reverted"; receipt: Eip1193TransactionReceipt };

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

function txHashFromProvider(value: unknown): `0x${string}` {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{64}$/u.test(value)) {
    throw new Error("provider transaction hash must be bytes32 hex");
  }

  return value.toLowerCase() as `0x${string}`;
}

function bigintFromProviderHex(value: unknown, field: string): bigint {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/u.test(value)) {
    throw new Error(`${field} must be 0x-prefixed hex`);
  }

  return BigInt(value);
}

function receiptFromProvider(value: unknown): Eip1193ReceiptPollResult {
  if (value === null) return { status: "pending" };
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("provider receipt status must be 0x1 or 0x0");
  }

  const receipt = value as Record<string, unknown>;
  if (receipt.status !== "0x1" && receipt.status !== "0x0") {
    throw new Error("provider receipt status must be 0x1 or 0x0");
  }

  return receipt.status === "0x1"
    ? { status: "success", receipt: receipt as Eip1193TransactionReceipt }
    : { status: "reverted", receipt: receipt as Eip1193TransactionReceipt };
}

export function createEip1193WalletAdapter(provider: Eip1193Provider): Eip1193WalletAdapter {
  return {
    async requestAccounts() {
      return accountsFromProvider(await provider.request({ method: "eth_requestAccounts" }));
    },
    async getChainId() {
      return chainIdFromHex(await provider.request({ method: "eth_chainId" }));
    },
    async getBalance(account) {
      return bigintFromProviderHex(
        await provider.request({ method: "eth_getBalance", params: [account, "latest"] }),
        "provider balance"
      );
    },
    async call(request) {
      return bigintFromProviderHex(
        await provider.request({ method: "eth_call", params: [request, "latest"] }),
        "provider call result"
      );
    },
    async getTransactionReceipt(transactionHash) {
      return receiptFromProvider(
        await provider.request({ method: "eth_getTransactionReceipt", params: [transactionHash] })
      );
    },
    async requestSwitchChain(chainIdHex) {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
    },
    async requestAddChain(params) {
      await provider.request({ method: "wallet_addEthereumChain", params: [params] });
    },
    async sendTransaction(request) {
      return txHashFromProvider(await provider.request({ method: "eth_sendTransaction", params: [request] }));
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
