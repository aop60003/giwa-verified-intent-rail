export const GASOK_CAMPAIGN_ID = "gasok-demo";
export const GASOK_MISSION_ID = "first-mock-vault-deposit";
export const GASOK_DEMO_AMOUNT_BASE_UNITS = "1000000000000000000";

type Address = `0x${string}`;

export type LivePublicConfig = {
  chainId: 91342;
  chainName: "GIWA Sepolia";
  explorerTxBaseUrl: string;
  faucetHelpUrl: string;
  minGasBalanceWei: string;
  demoAmountBaseUnits: typeof GASOK_DEMO_AMOUNT_BASE_UNITS;
  contracts: {
    mockToken: Address;
    mockVault: Address;
    intentRail: Address;
  };
};

export type LivePublicConfigInput = {
  chainId: number;
  txExplorerTemplate: string;
  faucetHelpUrl: string;
  minGasBalanceWei: string;
  deployment: {
    mockTokenAddress: string;
    mockVaultAddress: string;
    intentRailAddress: string;
  };
};

const GIWA_SEPOLIA_CHAIN_ID = 91342 as const;
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/u;
const DECIMAL_PATTERN = /^(?:0|[1-9][0-9]*)$/u;

function requireAddress(value: string, field: string): Address {
  const trimmed = value.trim();
  if (!ADDRESS_PATTERN.test(trimmed)) throw new Error(`${field} must be an EVM address`);
  return trimmed.toLowerCase() as Address;
}

function requireDecimal(value: string, field: string, allowZero: boolean): string {
  const trimmed = value.trim();
  if (!DECIMAL_PATTERN.test(trimmed) || (!allowZero && trimmed === "0")) {
    throw new Error(`${field} must be a ${allowZero ? "nonnegative" : "positive"} decimal quantity`);
  }
  return trimmed;
}

function requireHttpsUrl(value: string, field: string): string {
  const trimmed = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (_error) {
    throw new Error(`${field} must be an HTTPS URL`);
  }
  if (parsed.protocol !== "https:" || parsed.username.length > 0 || parsed.password.length > 0) {
    throw new Error(`${field} must be an HTTPS URL`);
  }
  return trimmed;
}

function explorerBaseUrl(template: string): string {
  const trimmed = template.trim();
  const placeholder = "{txHash}";
  if (trimmed.split(placeholder).length !== 2 || !trimmed.endsWith(placeholder)) {
    throw new Error("txExplorerTemplate must end with one transaction placeholder");
  }
  const parsed = new URL(requireHttpsUrl(trimmed, "txExplorerTemplate"));
  if (parsed.search.length > 0 || parsed.hash.length > 0 || !parsed.pathname.endsWith("%7BtxHash%7D")) {
    throw new Error("txExplorerTemplate must end its pathname with one transaction placeholder");
  }
  return trimmed.slice(0, -placeholder.length);
}

export function buildLivePublicConfig(input: LivePublicConfigInput): LivePublicConfig {
  if (input.chainId !== GIWA_SEPOLIA_CHAIN_ID) throw new Error("chainId must be 91342");

  return {
    chainId: GIWA_SEPOLIA_CHAIN_ID,
    chainName: "GIWA Sepolia",
    explorerTxBaseUrl: explorerBaseUrl(input.txExplorerTemplate),
    faucetHelpUrl: requireHttpsUrl(input.faucetHelpUrl, "faucetHelpUrl"),
    minGasBalanceWei: requireDecimal(input.minGasBalanceWei, "minGasBalanceWei", true),
    demoAmountBaseUnits: requireDecimal(
      GASOK_DEMO_AMOUNT_BASE_UNITS,
      "demoAmountBaseUnits",
      false
    ) as typeof GASOK_DEMO_AMOUNT_BASE_UNITS,
    contracts: {
      mockToken: requireAddress(input.deployment.mockTokenAddress, "mockTokenAddress"),
      mockVault: requireAddress(input.deployment.mockVaultAddress, "mockVaultAddress"),
      intentRail: requireAddress(input.deployment.intentRailAddress, "intentRailAddress")
    }
  };
}
