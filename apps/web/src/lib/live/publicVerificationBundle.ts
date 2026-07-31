import {
  canonicalManifestPayload,
  canonicalManifestPayloadBytesHex,
  canonicalReceiptPayload,
  canonicalReceiptPayloadBytesHex,
  canonicalVerifierInputPayload,
  canonicalVerifierInputPayloadBytesHex,
  normalizeManifest,
  normalizeReceiptPayload,
  normalizeVerifierInputPayload,
  type ActionManifest,
  type ReceiptPayload,
  type VerifierInputPayload
} from "../../../../../packages/protocol/src/index.ts";
import {
  normalizeAddress,
  normalizeBytes32,
  normalizeHex
} from "../../../../../packages/protocol/src/validation.ts";
import type { DecodedLogSnapshot } from "../verifier/decodeEvidence.ts";

export const PUBLIC_VERIFICATION_NOTICE =
  "GIWA Sepolia testnet \u00b7 Mock assets only \u00b7 No settlement or finality claim" as const;
export const PUBLIC_VERIFICATION_REPLAY_COMMAND =
  "pnpm --filter @giwa/web evidence:replay -- <bundle.json>" as const;

export type PublicVerificationBundleV1 = {
  schemaVersion: "1";
  source: "live";
  generatedAt: string;
  identity: {
    receiptHash: string;
    intentHash: string;
    depositTxHash: string;
  };
  manifest: {
    payload: ActionManifest;
    canonicalPayload: string;
    canonicalPayloadBytesHex: string;
    signature: string;
    signingDomain: {
      name: "GIWA Verified Intent Rail";
      version: "1";
      chainId: 91342;
      verifyingContract: string;
    };
    recoveredSigner: string;
  };
  verifierInput: {
    payload: VerifierInputPayload;
    canonicalPayload: string;
    canonicalPayloadBytesHex: string;
    verifierInputHash: string;
    verifierVersion: string;
  };
  verification: {
    depositBlockNumber: number;
    depositBlockHash: string;
    headBlockNumberAtVerification: number;
    confirmationDepth: number;
    standardRpcReceiptStatus: 1;
  };
  decodedLogs: DecodedLogSnapshot[];
  receipt: {
    payload: ReceiptPayload;
    canonicalPayload: string;
    canonicalPayloadBytesHex: string;
    receiptHash: string;
    schemaVersion: "1";
    verifierVersion: string;
  };
  replay: {
    algorithm: "keccak256-canonical-json+eip712";
    command: typeof PUBLIC_VERIFICATION_REPLAY_COMMAND;
  };
  notice: typeof PUBLIC_VERIFICATION_NOTICE;
};

type JsonRecord = Record<string, unknown>;
type PublicEventName = "Approval" | "Transfer" | "MockDeposit";

const PUBLIC_EVENT_NAMES = new Set<PublicEventName>([
  "Approval",
  "Transfer",
  "MockDeposit"
]);

function record(value: unknown, field: string): JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as JsonRecord;
}

function string(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function trimmedString(value: unknown, field: string): string {
  return string(value, field).trim();
}

function safeNonNegativeInteger(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(`${field} must be a non-negative safe integer`);
  }
  return value;
}

function safePositiveInteger(value: unknown, field: string): number {
  const normalized = safeNonNegativeInteger(value, field);
  if (normalized === 0) {
    throw new Error(`${field} must be a positive safe integer`);
  }
  return normalized;
}

function exact<T extends string | number>(
  value: unknown,
  expected: T,
  field: string
): T {
  if (value !== expected) {
    throw new Error(`${field} must be ${expected}`);
  }
  return expected;
}

function timestamp(value: unknown, field: string): string {
  const normalized = string(value, field);
  const date = new Date(normalized);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString() !== normalized
  ) {
    throw new Error(`${field} must be an ISO-8601 UTC timestamp`);
  }
  return normalized;
}

function signature(value: unknown, field: string): string {
  const normalized = string(value, field);
  if (!/^0x[a-fA-F0-9]{130}$/u.test(normalized)) {
    throw new Error(`${field} must be a 65-byte signature`);
  }
  return normalized.toLowerCase();
}

function canonicalBytes(value: unknown, field: string): string {
  const normalized = string(value, field);
  if (!/^0x(?:[a-fA-F0-9]{2})+$/u.test(normalized)) {
    throw new Error(`${field} must be non-empty byte-aligned hex`);
  }
  return normalizeHex(normalized, field);
}

function exactCanonicalText(
  value: unknown,
  expected: string,
  field: string
): string {
  if (string(value, field) !== expected) {
    throw new Error(`${field} must match the normalized payload`);
  }
  return expected;
}

function exactCanonicalBytes(
  value: unknown,
  expected: string,
  field: string
): string {
  if (canonicalBytes(value, field) !== expected) {
    throw new Error(`${field} must match the normalized payload`);
  }
  return expected;
}

function baseUnitString(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/u.test(value)) {
    throw new Error(`${field} must be a base-unit decimal string`);
  }
  return value;
}

function assertNoForbiddenKeys(
  value: unknown,
  path = "$",
  seen = new WeakSet<object>()
): void {
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) {
    throw new Error(`${path} must not contain circular data`);
  }
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoForbiddenKeys(entry, `${path}[${index}]`, seen)
    );
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = key.replace(/[^a-z0-9]/giu, "").toLowerCase();
    const forbidden =
      normalizedKey.includes("runid") ||
      normalizedKey.includes("capability") ||
      normalizedKey.includes("session") ||
      normalizedKey.includes("credential") ||
      normalizedKey.includes("privatekey") ||
      normalizedKey.includes("headers") ||
      normalizedKey.includes("privateerror") ||
      normalizedKey.includes("databasekey") ||
      normalizedKey.includes("dbkey") ||
      normalizedKey === "env" ||
      normalizedKey.startsWith("environment");
    if (forbidden) {
      throw new Error(`forbidden public bundle key at ${path}.${key}`);
    }
    assertNoForbiddenKeys(entry, `${path}.${key}`, seen);
  }
}

function normalizeManifestPayload(value: unknown): ActionManifest {
  const input = record(value, "manifest.payload");
  safePositiveInteger(input.expiryUnix, "manifest.payload.expiryUnix");
  return normalizeManifest(input as ActionManifest);
}

function normalizeVerifierPayload(value: unknown): VerifierInputPayload {
  const input = record(value, "verifierInput.payload");
  safeNonNegativeInteger(
    input.confirmationDepth,
    "verifierInput.payload.confirmationDepth"
  );
  safePositiveInteger(
    input.headBlockNumberAtVerification,
    "verifierInput.payload.headBlockNumberAtVerification"
  );
  const normalized = normalizeVerifierInputPayload(
    input as VerifierInputPayload
  );
  if (normalized.verifierVersion.length === 0) {
    throw new Error(
      "verifierInput.payload.verifierVersion must be a non-empty string"
    );
  }
  return normalized;
}

function normalizeReceiptPayloadForBundle(value: unknown): ReceiptPayload {
  const input = record(value, "receipt.payload");
  safePositiveInteger(
    input.depositBlockNumber,
    "receipt.payload.depositBlockNumber"
  );
  safePositiveInteger(input.issuedAt, "receipt.payload.issuedAt");
  if (typeof input.approvalRequired !== "boolean") {
    throw new Error("receipt.payload.approvalRequired must be a boolean");
  }
  if (
    input.verifiedProvider !== undefined &&
    input.verifiedProvider !== "Dojang" &&
    input.verifiedProvider !== "up.id"
  ) {
    throw new Error("receipt.payload.verifiedProvider must be Dojang or up.id");
  }
  return normalizeReceiptPayload(input as ReceiptPayload);
}

function normalizeTopics(value: unknown, field: string): readonly `0x${string}`[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }
  return value.map((topic, index) =>
    normalizeBytes32(string(topic, `${field}[${index}]`), `${field}[${index}]`)
  );
}

function normalizeLogArgs(
  eventName: PublicEventName,
  value: unknown,
  field: string
): Record<string, unknown> {
  const args = record(value, field);

  if (eventName === "Approval") {
    return {
      owner: normalizeAddress(string(args.owner, `${field}.owner`), `${field}.owner`),
      spender: normalizeAddress(
        string(args.spender, `${field}.spender`),
        `${field}.spender`
      ),
      amount: baseUnitString(args.amount, `${field}.amount`)
    };
  }

  if (eventName === "Transfer") {
    return {
      from: normalizeAddress(string(args.from, `${field}.from`), `${field}.from`),
      to: normalizeAddress(string(args.to, `${field}.to`), `${field}.to`),
      amount: baseUnitString(args.amount, `${field}.amount`)
    };
  }

  return {
    wallet: normalizeAddress(
      string(args.wallet, `${field}.wallet`),
      `${field}.wallet`
    ),
    asset: normalizeAddress(string(args.asset, `${field}.asset`), `${field}.asset`),
    amount: baseUnitString(args.amount, `${field}.amount`)
  };
}

function normalizeDecodedLog(value: unknown, index: number): DecodedLogSnapshot {
  const field = `decodedLogs[${index}]`;
  const input = record(value, field);
  const eventName = string(input.eventName, `${field}.eventName`);
  if (!PUBLIC_EVENT_NAMES.has(eventName as PublicEventName)) {
    throw new Error(
      `${field}.eventName must be Approval, Transfer, or MockDeposit`
    );
  }

  const normalized: DecodedLogSnapshot = {
    eventName,
    contractAddress: normalizeAddress(
      string(input.contractAddress, `${field}.contractAddress`),
      `${field}.contractAddress`
    ),
    logIndex: safeNonNegativeInteger(input.logIndex, `${field}.logIndex`),
    sourceTxHash: normalizeBytes32(
      string(input.sourceTxHash, `${field}.sourceTxHash`),
      `${field}.sourceTxHash`
    ),
    blockNumber: safeNonNegativeInteger(
      input.blockNumber,
      `${field}.blockNumber`
    ),
    blockHash: normalizeBytes32(
      string(input.blockHash, `${field}.blockHash`),
      `${field}.blockHash`
    ),
    args: normalizeLogArgs(
      eventName as PublicEventName,
      input.args,
      `${field}.args`
    )
  };

  if (input.topics !== undefined) {
    normalized.topics = normalizeTopics(input.topics, `${field}.topics`);
  }

  return normalized;
}

export function normalizePublicVerificationBundle(
  value: unknown
): PublicVerificationBundleV1 {
  assertNoForbiddenKeys(value);
  const input = record(value, "bundle");
  exact(input.schemaVersion, "1", "schemaVersion");
  exact(input.source, "live", "source");
  const identity = record(input.identity, "identity");
  const manifestSection = record(input.manifest, "manifest");
  const signingDomain = record(
    manifestSection.signingDomain,
    "manifest.signingDomain"
  );
  const verifierInput = record(input.verifierInput, "verifierInput");
  const verification = record(input.verification, "verification");
  const receipt = record(input.receipt, "receipt");
  const replay = record(input.replay, "replay");

  if (!Array.isArray(input.decodedLogs)) {
    throw new Error("decodedLogs must be an array");
  }

  const manifestPayload = normalizeManifestPayload(manifestSection.payload);
  const verifierPayload = normalizeVerifierPayload(verifierInput.payload);
  const receiptPayload = normalizeReceiptPayloadForBundle(receipt.payload);
  const manifestCanonicalPayload = canonicalManifestPayload(manifestPayload);
  const manifestCanonicalPayloadBytesHex =
    canonicalManifestPayloadBytesHex(manifestPayload);
  const verifierCanonicalPayload =
    canonicalVerifierInputPayload(verifierPayload);
  const verifierCanonicalPayloadBytesHex =
    canonicalVerifierInputPayloadBytesHex(verifierPayload);
  const receiptCanonicalPayload = canonicalReceiptPayload(receiptPayload);
  const receiptCanonicalPayloadBytesHex =
    canonicalReceiptPayloadBytesHex(receiptPayload);

  return {
    schemaVersion: "1",
    source: "live",
    generatedAt: timestamp(input.generatedAt, "generatedAt"),
    identity: {
      receiptHash: normalizeBytes32(
        string(identity.receiptHash, "identity.receiptHash"),
        "identity.receiptHash"
      ),
      intentHash: normalizeBytes32(
        string(identity.intentHash, "identity.intentHash"),
        "identity.intentHash"
      ),
      depositTxHash: normalizeBytes32(
        string(identity.depositTxHash, "identity.depositTxHash"),
        "identity.depositTxHash"
      )
    },
    manifest: {
      payload: manifestPayload,
      canonicalPayload: exactCanonicalText(
        manifestSection.canonicalPayload,
        manifestCanonicalPayload,
        "manifest.canonicalPayload"
      ),
      canonicalPayloadBytesHex: exactCanonicalBytes(
        manifestSection.canonicalPayloadBytesHex,
        manifestCanonicalPayloadBytesHex,
        "manifest.canonicalPayloadBytesHex"
      ),
      signature: signature(manifestSection.signature, "manifest.signature"),
      signingDomain: {
        name: exact(
          signingDomain.name,
          "GIWA Verified Intent Rail",
          "manifest.signingDomain.name"
        ),
        version: exact(
          signingDomain.version,
          "1",
          "manifest.signingDomain.version"
        ),
        chainId: exact(
          signingDomain.chainId,
          91342,
          "manifest.signingDomain.chainId"
        ),
        verifyingContract: normalizeAddress(
          string(
            signingDomain.verifyingContract,
            "manifest.signingDomain.verifyingContract"
          ),
          "manifest.signingDomain.verifyingContract"
        )
      },
      recoveredSigner: normalizeAddress(
        string(manifestSection.recoveredSigner, "manifest.recoveredSigner"),
        "manifest.recoveredSigner"
      )
    },
    verifierInput: {
      payload: verifierPayload,
      canonicalPayload: exactCanonicalText(
        verifierInput.canonicalPayload,
        verifierCanonicalPayload,
        "verifierInput.canonicalPayload"
      ),
      canonicalPayloadBytesHex: exactCanonicalBytes(
        verifierInput.canonicalPayloadBytesHex,
        verifierCanonicalPayloadBytesHex,
        "verifierInput.canonicalPayloadBytesHex"
      ),
      verifierInputHash: normalizeBytes32(
        string(verifierInput.verifierInputHash, "verifierInput.verifierInputHash"),
        "verifierInput.verifierInputHash"
      ),
      verifierVersion: trimmedString(
        verifierInput.verifierVersion,
        "verifierInput.verifierVersion"
      )
    },
    verification: {
      depositBlockNumber: safeNonNegativeInteger(
        verification.depositBlockNumber,
        "verification.depositBlockNumber"
      ),
      depositBlockHash: normalizeBytes32(
        string(verification.depositBlockHash, "verification.depositBlockHash"),
        "verification.depositBlockHash"
      ),
      headBlockNumberAtVerification: safeNonNegativeInteger(
        verification.headBlockNumberAtVerification,
        "verification.headBlockNumberAtVerification"
      ),
      confirmationDepth: safeNonNegativeInteger(
        verification.confirmationDepth,
        "verification.confirmationDepth"
      ),
      standardRpcReceiptStatus: exact(
        verification.standardRpcReceiptStatus,
        1,
        "verification.standardRpcReceiptStatus"
      )
    },
    decodedLogs: input.decodedLogs.map(normalizeDecodedLog),
    receipt: {
      payload: receiptPayload,
      canonicalPayload: exactCanonicalText(
        receipt.canonicalPayload,
        receiptCanonicalPayload,
        "receipt.canonicalPayload"
      ),
      canonicalPayloadBytesHex: exactCanonicalBytes(
        receipt.canonicalPayloadBytesHex,
        receiptCanonicalPayloadBytesHex,
        "receipt.canonicalPayloadBytesHex"
      ),
      receiptHash: normalizeBytes32(
        string(receipt.receiptHash, "receipt.receiptHash"),
        "receipt.receiptHash"
      ),
      schemaVersion: exact(
        receipt.schemaVersion,
        "1",
        "receipt.schemaVersion"
      ),
      verifierVersion: trimmedString(
        receipt.verifierVersion,
        "receipt.verifierVersion"
      )
    },
    replay: {
      algorithm: exact(
        replay.algorithm,
        "keccak256-canonical-json+eip712",
        "replay.algorithm"
      ),
      command: exact(
        replay.command,
        PUBLIC_VERIFICATION_REPLAY_COMMAND,
        "replay.command"
      )
    },
    notice: exact(input.notice, PUBLIC_VERIFICATION_NOTICE, "notice")
  };
}
