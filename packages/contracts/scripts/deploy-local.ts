import { artifacts, network } from "hardhat";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  getAddress,
  getContract,
  keccak256,
  stringToBytes,
  toFunctionSelector,
  type Abi,
  type Address,
  type Hex
} from "viem";

const amount = 1_000_000_000_000_000_000n;
const issuedAt = 1_790_000_010n;

type ContractCallOptions = {
  account?: Address;
};

type ContractWrite = (args?: readonly unknown[], options?: ContractCallOptions) => Promise<Hex>;

type LocalContract = {
  address: Address;
  abi: Abi;
  write: Record<string, ContractWrite> & {
    approve: ContractWrite;
    deposit: ContractWrite;
    emitMatched: ContractWrite;
    mint: ContractWrite;
    submitIntent: ContractWrite;
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

function bytes32FromText(value: string): Hex {
  return keccak256(stringToBytes(value.trim()));
}

function normalizeForJson(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "string") {
    if (/^0x[a-fA-F0-9]{40}$/.test(value) || /^0x[a-fA-F0-9]{64}$/.test(value)) {
      return value.toLowerCase();
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForJson(item));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeForJson(entry)])
    );
  }

  return value;
}

function formatEvent(eventName: string, event: { address: Address; logIndex: number; args: object }) {
  return normalizeForJson({
    eventName,
    contractAddress: event.address,
    logIndex: event.logIndex,
    args: event.args
  });
}

async function main() {
  const connection = await network.create("hardhatMainnet");

  try {
    const transport = custom(connection.provider);
    const accounts = ((await connection.provider.request({
      method: "eth_accounts"
    })) as Address[]).map((account) => getAddress(account));

    const [deployerAddress, demoUserAddress, verifierAddress, intentSubmitterAddress] = accounts;
    if (
      deployerAddress === undefined ||
      demoUserAddress === undefined ||
      verifierAddress === undefined ||
      intentSubmitterAddress === undefined
    ) {
      throw new Error("Hardhat local network did not expose required role accounts");
    }

    const publicClient = createPublicClient({
      chain: hardhatLocalChain,
      transport
    });
    const walletClient = createWalletClient({
      account: deployerAddress,
      chain: hardhatLocalChain,
      transport
    });

    async function deployContract(contractName: string, args: readonly unknown[] = []) {
      const artifact = await artifacts.readArtifact(contractName);
      const txHash = await walletClient.deployContract({
        account: deployerAddress,
        abi: artifact.abi as Abi,
        bytecode: artifact.bytecode as Hex,
        args
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.contractAddress == null) {
        throw new Error(`${contractName} deployment did not return a contract address`);
      }

      return {
        contract: getContract({
          address: getAddress(receipt.contractAddress),
          abi: artifact.abi as Abi,
          client: {
            public: publicClient,
            wallet: walletClient
          }
        }) as unknown as LocalContract,
        receipt,
        txHash
      };
    }

    const token = await deployContract("MockIntentToken", ["Mock Intent Token", "MIT"]);
    const vault = await deployContract("MockVault");
    const rail = await deployContract("IntentRail", [verifierAddress]);

    await publicClient.waitForTransactionReceipt({
      hash: await token.contract.write.mint([demoUserAddress, amount])
    });

    const approveReceipt = await publicClient.waitForTransactionReceipt({
      hash: await token.contract.write.approve([vault.contract.address, amount], {
        account: demoUserAddress
      })
    });

    const intentHash = bytes32FromText("local-happy-path-intent");
    const campaignIdBytes32 = bytes32FromText("gasok-demo");
    const missionIdBytes32 = bytes32FromText("first-mock-vault-deposit");
    const selector = toFunctionSelector("deposit(address,uint256)");

    const submitReceipt = await publicClient.waitForTransactionReceipt({
      hash: await rail.contract.write.submitIntent(
        [
          intentHash,
          campaignIdBytes32,
          missionIdBytes32,
          demoUserAddress,
          vault.contract.address,
          selector,
          token.contract.address,
          amount,
          vault.contract.address,
          amount,
          1_790_000_000n
        ],
        { account: intentSubmitterAddress }
      )
    });

    const depositReceipt = await publicClient.waitForTransactionReceipt({
      hash: await vault.contract.write.deposit([token.contract.address, amount], {
        account: demoUserAddress
      })
    });

    const receiptHash = bytes32FromText("local-happy-path-receipt");
    const decisionReceipt = await publicClient.waitForTransactionReceipt({
      hash: await rail.contract.write.emitMatched(
        [
          intentHash,
          receiptHash,
          demoUserAddress,
          approveReceipt.transactionHash,
          depositReceipt.transactionHash,
          depositReceipt.blockNumber,
          depositReceipt.blockHash,
          amount,
          issuedAt
        ],
        { account: verifierAddress }
      )
    });

    const [intentSubmitted] = await publicClient.getContractEvents({
      address: rail.contract.address,
      abi: rail.contract.abi,
      eventName: "IntentSubmitted",
      fromBlock: submitReceipt.blockNumber,
      toBlock: submitReceipt.blockNumber,
      strict: true
    });
    const [approval] = await publicClient.getContractEvents({
      address: token.contract.address,
      abi: token.contract.abi,
      eventName: "Approval",
      fromBlock: approveReceipt.blockNumber,
      toBlock: approveReceipt.blockNumber,
      strict: true
    });
    const [transfer] = await publicClient.getContractEvents({
      address: token.contract.address,
      abi: token.contract.abi,
      eventName: "Transfer",
      fromBlock: depositReceipt.blockNumber,
      toBlock: depositReceipt.blockNumber,
      strict: true
    });
    const [mockDeposit] = await publicClient.getContractEvents({
      address: vault.contract.address,
      abi: vault.contract.abi,
      eventName: "MockDeposit",
      fromBlock: depositReceipt.blockNumber,
      toBlock: depositReceipt.blockNumber,
      strict: true
    });
    const [intentMatched] = await publicClient.getContractEvents({
      address: rail.contract.address,
      abi: rail.contract.abi,
      eventName: "IntentMatched",
      fromBlock: decisionReceipt.blockNumber,
      toBlock: decisionReceipt.blockNumber,
      strict: true
    });

    if (
      intentSubmitted === undefined ||
      approval === undefined ||
      transfer === undefined ||
      mockDeposit === undefined ||
      intentMatched === undefined
    ) {
      throw new Error("Local happy path did not emit every required fixture event");
    }

    const fixture = normalizeForJson({
      schemaVersion: "sprint-2-local-chain-evidence-v1",
      network: {
        name: "Hardhat Local",
        chainId: 31_337
      },
      roles: {
        deployerAddress,
        demoUserAddress,
        verifierAddress,
        intentSubmitterAddress
      },
      contracts: {
        mockTokenAddress: token.contract.address,
        mockVaultAddress: vault.contract.address,
        intentRailAddress: rail.contract.address,
        mockTokenDeploymentTxHash: token.txHash,
        mockVaultDeploymentTxHash: vault.txHash,
        intentRailDeploymentTxHash: rail.txHash
      },
      transactions: {
        approveTxHash: approveReceipt.transactionHash,
        intentSubmittedTxHash: submitReceipt.transactionHash,
        depositTxHash: depositReceipt.transactionHash,
        decisionTxHash: decisionReceipt.transactionHash
      },
      decodedLogSnapshots: [
        formatEvent("IntentSubmitted", intentSubmitted),
        formatEvent("Approval", approval),
        formatEvent("Transfer", transfer),
        formatEvent("MockDeposit", mockDeposit),
        formatEvent("IntentMatched", intentMatched)
      ]
    });

    console.log(JSON.stringify(fixture, null, 2));
  } finally {
    await connection.close();
  }
}

await main();
