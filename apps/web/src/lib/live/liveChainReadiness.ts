export type LiveChainReadinessClient = {
  getChainId(): Promise<number>;
  getBytecode(input: { address: `0x${string}` }): Promise<`0x${string}` | undefined>;
};

type LiveContractName = "mockToken" | "mockVault" | "intentRail";
type LiveContractReadiness = "ok" | "missing" | "unavailable";

export type LiveChainReadiness = {
  ok: boolean;
  chainId: "ok" | "wrong" | "unavailable";
  contracts: Record<LiveContractName, LiveContractReadiness>;
};

export type LiveChainReadinessInput = {
  client: LiveChainReadinessClient;
  expectedChainId: number;
  contracts: Record<LiveContractName, `0x${string}`>;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 8_000;

function unavailableReadiness(): LiveChainReadiness {
  return {
    ok: false,
    chainId: "unavailable",
    contracts: { mockToken: "unavailable", mockVault: "unavailable", intentRail: "unavailable" }
  };
}

async function probeChain(input: LiveChainReadinessInput): Promise<LiveChainReadiness["chainId"]> {
  try {
    return (await input.client.getChainId()) === input.expectedChainId ? "ok" : "wrong";
  } catch (_error) {
    return "unavailable";
  }
}

async function probeContract(
  client: LiveChainReadinessClient,
  address: `0x${string}`
): Promise<LiveContractReadiness> {
  try {
    const bytecode = await client.getBytecode({ address });
    return bytecode === undefined || bytecode === "0x" ? "missing" : "ok";
  } catch (_error) {
    return "unavailable";
  }
}

async function performProbe(input: LiveChainReadinessInput): Promise<LiveChainReadiness> {
  const [chainId, mockToken, mockVault, intentRail] = await Promise.all([
    probeChain(input),
    probeContract(input.client, input.contracts.mockToken),
    probeContract(input.client, input.contracts.mockVault),
    probeContract(input.client, input.contracts.intentRail)
  ]);
  const contracts = { mockToken, mockVault, intentRail };
  return {
    ok: chainId === "ok" && Object.values(contracts).every((state) => state === "ok"),
    chainId,
    contracts
  };
}

export async function probeLiveChainReadiness(input: LiveChainReadinessInput): Promise<LiveChainReadiness> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<LiveChainReadiness>((resolve) => {
    timeoutId = setTimeout(() => resolve(unavailableReadiness()), timeoutMs);
  });

  try {
    return await Promise.race([performProbe(input), timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
