import { artifacts, network } from "hardhat";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  getAddress,
  getContract,
  type Abi,
  type Address,
  type Hex
} from "viem";

type TestContext = Awaited<ReturnType<typeof createTestContext>>;
type TestAccounts = readonly [Address, Address, Address, Address, Address, ...Address[]];

type ContractCallOptions = {
  account?: Address;
};

type ContractRead = (args?: readonly unknown[]) => Promise<unknown>;
type ContractWrite = (args?: readonly unknown[], options?: ContractCallOptions) => Promise<Hex>;

export type LocalContract = {
  address: Address;
  abi: Abi;
  read: Record<string, ContractRead> & {
    allowance: ContractRead;
    balanceOf: ContractRead;
    depositBalanceOf: ContractRead;
    FAILED: ContractRead;
    MISMATCHED: ContractRead;
    TARGET_MISMATCH: ContractRead;
    TX_FAILED: ContractRead;
  };
  write: Record<string, ContractWrite> & {
    approve: ContractWrite;
    deposit: ContractWrite;
    emitFailed: ContractWrite;
    emitMatched: ContractWrite;
    mint: ContractWrite;
    submitIntent: ContractWrite;
    transferFrom: ContractWrite;
  };
};

const hardhatLocalChain = defineChain({
  id: 31_337,
  name: "Hardhat Local",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH"
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1"]
    }
  }
});

export async function createTestContext() {
  const connection = await network.create("hardhatMainnet");
  const transport = custom(connection.provider);
  const accounts = ((await connection.provider.request({
    method: "eth_accounts"
  })) as Address[]).map((account) => getAddress(account));

  if (accounts.length < 5) {
    await connection.close();
    throw new Error("Hardhat local network did not expose enough test accounts");
  }
  const testAccounts = accounts as unknown as TestAccounts;

  const publicClient = createPublicClient({
    chain: hardhatLocalChain,
    transport
  });
  const walletClient = createWalletClient({
    account: testAccounts[0],
    chain: hardhatLocalChain,
    transport
  });

  return {
    accounts: testAccounts,
    connection,
    publicClient,
    walletClient
  };
}

export async function closeTestContext(ctx: TestContext) {
  await ctx.connection.close();
}

export async function deployContract(
  ctx: TestContext,
  contractName: string,
  args: readonly unknown[] = []
) {
  const artifact = await artifacts.readArtifact(contractName);
  const hash = await ctx.walletClient.deployContract({
    account: ctx.accounts[0],
    abi: artifact.abi as Abi,
    bytecode: artifact.bytecode as Hex,
    args
  });
  const receipt = await ctx.publicClient.waitForTransactionReceipt({ hash });

  if (receipt.contractAddress == null) {
    throw new Error(`${contractName} deployment did not return a contract address`);
  }

  return getContract({
    address: getAddress(receipt.contractAddress),
    abi: artifact.abi as Abi,
    client: {
      public: ctx.publicClient,
      wallet: ctx.walletClient
    }
  }) as unknown as LocalContract;
}
