import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canonicalManifestPayload,
  canonicalManifestPayloadBytesHex,
  canonicalReceiptPayload,
  canonicalReceiptPayloadBytesHex,
  canonicalVerifierInputPayload,
  canonicalVerifierInputPayloadBytesHex,
  computeIntentHash,
  computeReceiptHash,
  computeVerifierInputHash,
  type ActionManifest,
  type Address,
  type Hex,
  type ReceiptPayload,
  type VerifierInputPayload
} from "../../../../../packages/protocol/src/index.ts";
import { hashEvidenceJson } from "../verifier/decodeEvidence.ts";
import { stringToHex } from "viem";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

function standaloneFunction<T extends (...args: never[]) => unknown>(
  source: string,
  name: string
): T {
  const start = source.indexOf(`function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      return Function(
        `"use strict"; return (${source.slice(start, index + 1)});`
      )() as T;
    }
  }
  throw new Error(`unterminated function ${name}`);
}

function standaloneFunctions<
  T extends Record<string, (...args: never[]) => unknown>
>(source: string, names: string[]): T {
  const declarations = names.map((name) =>
    String(standaloneFunction(source, name))
  );
  return Function(
    `"use strict"; ${declarations.join("\n")}; return { ${names.join(", ")} };`
  )() as T;
}

const depositTxHash = `0x${"c".repeat(64)}` as Hex;
const blockHash = `0x${"e".repeat(64)}` as Hex;
const approveTxHash = `0x${"f".repeat(64)}` as Hex;
const approvalBlockHash = `0x${"9".repeat(64)}` as Hex;
const walletAddress = `0x${"1".repeat(40)}` as Address;
const contractAddress = `0x${"2".repeat(40)}` as Address;
const assetAddress = `0x${"3".repeat(40)}` as Address;
const generatedAt = "2026-07-31T00:00:00.000Z";
const replayCommand =
  "pnpm --filter @giwa/web evidence:replay -- <bundle.json>";
const bundleNotice =
  "GIWA Sepolia testnet · Mock assets only · No settlement or finality claim";

function makeBundle() {
  const manifestPayload: ActionManifest = {
    manifestVersion: "1",
    chainId: 91342,
    nonce: "release-2-browser-boundary",
    expiryUnix: 1_900_000_000,
    campaignId: "gasok-demo",
    missionId: "first-mock-vault-deposit",
    wallet: walletAddress,
    actionType: "mockVaultDeposit",
    target: contractAddress,
    selector: "0x47e7ef24",
    asset: assetAddress,
    amountBaseUnits: "1000000",
    spender: contractAddress,
    maxAllowanceBaseUnits: "1000000",
    referralCode: "judge"
  };
  const intentHash = computeIntentHash(manifestPayload);
  const decodedLogs = [
    {
      eventName: "Approval",
      contractAddress: assetAddress,
      logIndex: 0,
      sourceTxHash: approveTxHash,
      blockNumber: 32_034_049,
      blockHash: approvalBlockHash,
      args: {
        owner: walletAddress,
        spender: contractAddress,
        amount: "1000000"
      }
    },
    {
      eventName: "Transfer",
      contractAddress: assetAddress,
      logIndex: 1,
      sourceTxHash: depositTxHash,
      blockNumber: 32_034_050,
      blockHash,
      args: {
        from: walletAddress,
        to: contractAddress,
        amount: "1000000"
      }
    },
    {
      eventName: "MockDeposit",
      contractAddress,
      logIndex: 2,
      sourceTxHash: depositTxHash,
      blockNumber: 32_034_050,
      blockHash,
      args: {
        wallet: walletAddress,
        asset: assetAddress,
        amount: "1000000"
      }
    }
  ];
  const verifierPayload: VerifierInputPayload = {
    schemaVersion: "1",
    chainId: 91342,
    intentHash,
    depositTxHash,
    depositTransactionSnapshotHash: `0x${"4".repeat(64)}`,
    depositReceiptSnapshotHash: `0x${"5".repeat(64)}`,
    decodedLogSnapshotHash: hashEvidenceJson(decodedLogs),
    confirmationDepth: 4,
    headBlockNumberAtVerification: 32_034_053,
    verifierVersion: "1.0.0"
  };
  const receiptPayload: ReceiptPayload = {
    schemaVersion: "1",
    verifierVersion: "1.0.0",
    intentHash,
    chainId: 91342,
    networkName: "GIWA Sepolia",
    status: "matched",
    actionType: "mockVaultDeposit",
    asset: assetAddress,
    amountBaseUnits: "1000000",
    target: contractAddress,
    spender: contractAddress,
    maxAllowanceBaseUnits: "1000000",
    allowanceUsedBaseUnits: "1000000",
    approvalRequired: true,
    approveTxHash,
    depositTxHash,
    depositBlockNumber: 32_034_050,
    depositBlockHash: blockHash,
    campaignId: "gasok-demo",
    missionId: "first-mock-vault-deposit",
    wallet: walletAddress,
    verifiedState: "guest",
    testnetDepositAmountDelta: "1000000",
    issuedAt: 1_800_000_000,
    issuer: "GIWA Verified Intent Rail MVP",
    safetyNotice: "Testnet-only. No real asset, no yield, no RWA claim."
  };
  const receiptHash = computeReceiptHash(receiptPayload);
  const verifierInputHash = computeVerifierInputHash(verifierPayload);
  return {
    schemaVersion: "1",
    source: "live",
    generatedAt,
    identity: { receiptHash, intentHash, depositTxHash },
    manifest: {
      payload: manifestPayload,
      canonicalPayload: canonicalManifestPayload(manifestPayload),
      canonicalPayloadBytesHex:
        canonicalManifestPayloadBytesHex(manifestPayload),
      signature: `0x${"1".repeat(130)}`,
      signingDomain: {
        name: "GIWA Verified Intent Rail",
        version: "1",
        chainId: 91342,
        verifyingContract: contractAddress
      },
      recoveredSigner: walletAddress
    },
    verifierInput: {
      payload: verifierPayload,
      canonicalPayload: canonicalVerifierInputPayload(verifierPayload),
      canonicalPayloadBytesHex:
        canonicalVerifierInputPayloadBytesHex(verifierPayload),
      verifierInputHash,
      verifierVersion: "1.0.0"
    },
    verification: {
      depositBlockNumber: 32_034_050,
      depositBlockHash: blockHash,
      headBlockNumberAtVerification: 32_034_053,
      confirmationDepth: 4,
      standardRpcReceiptStatus: 1
    },
    decodedLogs,
    receipt: {
      payload: receiptPayload,
      canonicalPayload: canonicalReceiptPayload(receiptPayload),
      canonicalPayloadBytesHex:
        canonicalReceiptPayloadBytesHex(receiptPayload),
      receiptHash,
      schemaVersion: "1",
      verifierVersion: "1.0.0"
    },
    replay: {
      algorithm: "keccak256-canonical-json+eip712",
      command: replayCommand
    },
    notice: bundleNotice
  };
}

const validBundle = makeBundle();
const receiptHash = validBundle.identity.receiptHash;
const intentHash = validBundle.identity.intentHash;
const verifierInputHash = validBundle.verifierInput.verifierInputHash;
const proofFixture = {
  screenKind: "public-matched-proof",
  source: "live",
  queryKind: "receipt",
  campaignId: "gasok-demo",
  missionId: "first-mock-vault-deposit",
  policyVersion: null,
  policyStatus: "fixed-unversioned",
  networkName: "GIWA Sepolia",
  walletLabel: "0x111111…1111",
  receiptHash,
  intentHash,
  depositTxHash,
  verifierInputHash,
  blockNumber: 32_034_050,
  blockHash,
  confirmationDepth: 4,
  receiptPath: `/receipt/${receiptHash}`,
  participantReceiptPath: `/user/receipt/${receiptHash}`,
  explorerUrl: `https://sepolia-explorer.giwa.io/tx/0x${"c".repeat(64)}`,
  testnetNotice: "GIWA Sepolia testnet · Mock assets only",
  bundle: validBundle
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function providerBackedProofFixture() {
  const value = clone(proofFixture);
  value.bundle.receipt.payload.verifiedProvider = "Dojang";
  value.bundle.receipt.canonicalPayload = canonicalReceiptPayload(
    value.bundle.receipt.payload
  );
  value.bundle.receipt.canonicalPayloadBytesHex =
    canonicalReceiptPayloadBytesHex(value.bundle.receipt.payload);
  const providerReceiptHash = computeReceiptHash(
    value.bundle.receipt.payload
  );
  value.bundle.receipt.receiptHash = providerReceiptHash;
  value.bundle.identity.receiptHash = providerReceiptHash;
  value.receiptHash = providerReceiptHash;
  value.receiptPath = `/receipt/${providerReceiptHash}`;
  value.participantReceiptPath = `/user/receipt/${providerReceiptHash}`;
  return value;
}

function projectProof(
  source: string,
  name: "projectPublicMatchedProof" | "projectPublicVerificationBundleResponse",
  body: unknown,
  expectedHash = receiptHash
): Record<string, unknown> | null {
  const functions = standaloneFunctions<
    Record<string, (body: unknown, expectedHash: string) => Record<string, unknown> | null>
  >(source, ["keccak256Utf8", "normalizePublicVerificationResponse", name]);
  return functions[name]!(body, expectedHash);
}

describe("public Proof Ledger presentation", () => {
  const source = readWebFile("public/flow.js");
  const participantSource = readWebFile("public/user-flow.js");

  it("renders exact-hash search without wallet discovery", () => {
    expect(source).toContain("renderPublicEvidenceSearch");
    expect(source).toContain("projectPublicMatchedProof");
    expect(source).toContain("fetchPublicMatchedProof");
    expect(source).toContain(
      'document.title = "Proof Ledger · GIWA Verified Intent Rail"'
    );
    expect(source).toContain('name: "proof"');
    expect(source).toContain("Receipt, 트랜잭션 또는 Intent hash");
    expect(source).toContain(
      "올바른 0x 형식의 32-byte hash를 입력해 주세요."
    );
    expect(source).toContain(
      "찾을 수 없거나 공개되지 않은 증거"
    );
    expect(source).not.toContain(
      "대기·실패·불일치 실행은 공개되지 않습니다."
    );
    expect(source).not.toContain("wallet profile");
  });

  it("separates malformed input from fail-closed public absence", () => {
    const project = standaloneFunction<
      (
        query: string,
        proof: typeof proofFixture | null
      ) => "idle" | "malformed" | "not-found-or-not-public" | "matched"
    >(source, "projectProofSearchState");
    const copy = standaloneFunction<
      (
        state: "idle" | "malformed" | "not-found-or-not-public"
      ) => { title: string; body: string }
    >(source, "proofSearchEmptyCopy");

    expect(project("", null)).toBe("idle");
    expect(project("0x123", null)).toBe("malformed");
    expect(project(receiptHash, null)).toBe("not-found-or-not-public");
    expect(project(receiptHash, proofFixture)).toBe("matched");
    expect(copy("malformed").body).toContain(
      "올바른 0x 형식의 32-byte hash"
    );
    expect(copy("not-found-or-not-public").body).toContain(
      "찾을 수 없거나 공개되지 않은 증거"
    );
  });

  it("rejects any proof that is not the exact live response identity", () => {
    expect(projectProof(source, "projectPublicMatchedProof", proofFixture)).not.toBeNull();
    expect(
      projectProof(
        source,
        "projectPublicMatchedProof",
        proofFixture,
        `0x${"8".repeat(64)}`
      )
    ).toBeNull();
    expect(projectProof(source, "projectPublicMatchedProof", { ...proofFixture, receiptHash: "bad" })).toBeNull();
    expect(projectProof(source, "projectPublicMatchedProof", { ...proofFixture, source: "fixture" })).toBeNull();
    expect(
      projectProof(
        source,
        "projectPublicMatchedProof",
        {
          ...proofFixture,
          walletLabel: "0x1111111111111111111111111111111111111111"
        }
      )
    ).toBeNull();
    expect(
      projectProof(source, "projectPublicMatchedProof", { ...proofFixture, blockHash: null })
    ).toBeNull();
  });

  it("accepts only a complete, identity-consistent public bundle", () => {
    expect(projectProof(source, "projectPublicMatchedProof", proofFixture)?.bundle).toMatchObject({
      schemaVersion: "1",
      source: "live",
      generatedAt,
      replay: { command: replayCommand }
    });
    expect(
      projectProof(
        source,
        "projectPublicMatchedProof",
        {
          ...proofFixture,
          bundle: {
            ...proofFixture.bundle,
            manifest: {
              ...proofFixture.bundle.manifest,
              canonicalPayload: undefined
            }
          }
        }
      )
    ).toBeNull();
    expect(
      projectProof(
        source,
        "projectPublicMatchedProof",
        {
          ...proofFixture,
          bundle: {
            ...proofFixture.bundle,
            identity: {
              ...proofFixture.bundle.identity,
              receiptHash: `0x${"f".repeat(64)}`
            }
          }
        }
      )
    ).toBeNull();
    expect(
      projectProof(
        source,
        "projectPublicMatchedProof",
        {
          ...proofFixture,
          bundle: { ...proofFixture.bundle, generatedAt: "yesterday" }
        }
      )
    ).toBeNull();
    expect(
      projectProof(
        source,
        "projectPublicMatchedProof",
        {
          ...proofFixture,
          bundle: {
            ...proofFixture.bundle,
            receipt: { ...proofFixture.bundle.receipt, schemaVersion: "2" }
          }
        }
      )
    ).toBeNull();
    expect(
      projectProof(
        source,
        "projectPublicMatchedProof",
        {
          ...proofFixture,
          bundle: {
            ...proofFixture.bundle,
            decodedLogs: [
              {
                ...proofFixture.bundle.decodedLogs[0],
                eventName: "AdminChanged"
              }
            ]
          }
        }
      )
    ).toBeNull();
    expect(
      projectProof(
        source,
        "projectPublicMatchedProof",
        {
          ...proofFixture,
          bundle: {
            ...proofFixture.bundle,
            manifest: {
              ...proofFixture.bundle.manifest,
              runCapability: "must-not-cross-public-boundary"
            }
          }
        }
      )
    ).toBeNull();
  });

  it("recomputes protocol Keccak hashes and canonical UTF-8 bytes in both browser surfaces", () => {
    for (const [candidateSource, name] of [
      [source, "projectPublicMatchedProof"],
      [participantSource, "projectPublicVerificationBundleResponse"]
    ] as const) {
      expect(projectProof(candidateSource, name, proofFixture)).not.toBeNull();

      const badBytes = clone(proofFixture);
      badBytes.bundle.manifest.canonicalPayloadBytesHex =
        canonicalManifestPayloadBytesHex({
          ...badBytes.bundle.manifest.payload,
          nonce: "different"
        });
      expect(projectProof(candidateSource, name, badBytes)).toBeNull();

      const badIntent = clone(proofFixture);
      badIntent.bundle.identity.intentHash = `0x${"8".repeat(64)}`;
      badIntent.intentHash = badIntent.bundle.identity.intentHash;
      badIntent.bundle.verifierInput.payload.intentHash =
        badIntent.bundle.identity.intentHash;
      badIntent.bundle.receipt.payload.intentHash =
        badIntent.bundle.identity.intentHash;
      badIntent.bundle.verifierInput.canonicalPayload =
        canonicalVerifierInputPayload(badIntent.bundle.verifierInput.payload);
      badIntent.bundle.verifierInput.canonicalPayloadBytesHex =
        canonicalVerifierInputPayloadBytesHex(
          badIntent.bundle.verifierInput.payload
        );
      badIntent.bundle.receipt.canonicalPayload =
        canonicalReceiptPayload(badIntent.bundle.receipt.payload);
      badIntent.bundle.receipt.canonicalPayloadBytesHex =
        canonicalReceiptPayloadBytesHex(badIntent.bundle.receipt.payload);
      expect(projectProof(candidateSource, name, badIntent)).toBeNull();

      const badDecodedHash = clone(proofFixture);
      badDecodedHash.bundle.verifierInput.payload.decodedLogSnapshotHash =
        `0x${"7".repeat(64)}`;
      badDecodedHash.bundle.verifierInput.canonicalPayload =
        canonicalVerifierInputPayload(
          badDecodedHash.bundle.verifierInput.payload
        );
      badDecodedHash.bundle.verifierInput.canonicalPayloadBytesHex =
        canonicalVerifierInputPayloadBytesHex(
          badDecodedHash.bundle.verifierInput.payload
        );
      badDecodedHash.bundle.verifierInput.verifierInputHash =
        computeVerifierInputHash(badDecodedHash.bundle.verifierInput.payload);
      badDecodedHash.verifierInputHash =
        badDecodedHash.bundle.verifierInput.verifierInputHash;
      expect(projectProof(candidateSource, name, badDecodedHash)).toBeNull();
    }
  });

  it("rejects every cross-reference and decoded-log cardinality mutation", () => {
    const mutations: Array<(value: typeof proofFixture) => void> = [
      (value) => {
        value.bundle.receipt.payload.campaignId = "other-campaign";
      },
      (value) => {
        value.bundle.receipt.payload.wallet = `0x${"8".repeat(40)}`;
      },
      (value) => {
        value.bundle.receipt.payload.asset = contractAddress;
      },
      (value) => {
        value.bundle.receipt.payload.amountBaseUnits = "999";
      },
      (value) => {
        value.bundle.receipt.payload.target = assetAddress;
      },
      (value) => {
        value.bundle.receipt.payload.spender = assetAddress;
      },
      (value) => {
        value.bundle.receipt.payload.depositBlockHash = approvalBlockHash;
      },
      (value) => {
        value.bundle.decodedLogs[0]!.args.owner = contractAddress;
      },
      (value) => {
        value.bundle.decodedLogs.push(clone(value.bundle.decodedLogs[1]!));
      },
      (value) => {
        value.bundle.decodedLogs = value.bundle.decodedLogs.filter(
          (log) => log.eventName !== "MockDeposit"
        );
      }
    ];

    for (const mutate of mutations) {
      const candidate = clone(proofFixture);
      mutate(candidate);
      expect(projectProof(source, "projectPublicMatchedProof", candidate)).toBeNull();
      expect(
        projectProof(
          participantSource,
          "projectPublicVerificationBundleResponse",
          candidate
        )
      ).toBeNull();
    }
  });

  it("uses exact allowlists and rejects public-state and capability aliases", () => {
    const mutations: Array<(value: typeof proofFixture) => void> = [
      (value) => {
        Object.assign(value, { visibility: "public" });
      },
      (value) => {
        Object.assign(value.bundle, { state: "pending" });
      },
      (value) => {
        Object.assign(value.bundle.manifest, { privateTrace: "canary" });
      },
      (value) => {
        Object.assign(value.bundle.receipt.payload, { secret: "canary" });
      },
      (value) => {
        Object.assign(value.bundle.verifierInput, { accessToken: "canary" });
      },
      (value) => {
        Object.assign(value.bundle.replay, { authorization: "canary" });
      },
      (value) => {
        Object.assign(value.bundle.identity, { runAccess: "canary" });
      },
      (value) => {
        Object.assign(value.bundle.verification, { unexpected: true });
      },
      (value) => {
        (value.bundle.receipt.payload as { status: string }).status = "pending";
      }
    ];

    for (const mutate of mutations) {
      const candidate = clone(proofFixture);
      mutate(candidate);
      expect(projectProof(source, "projectPublicMatchedProof", candidate)).toBeNull();
      expect(
        projectProof(
          participantSource,
          "projectPublicVerificationBundleResponse",
          candidate
        )
      ).toBeNull();
    }
  });

  it("accepts protocol-ordered provider-backed Receipts on both public surfaces", () => {
    const providerProof = providerBackedProofFixture();
    for (const [candidateSource, name] of [
      [source, "projectPublicMatchedProof"],
      [participantSource, "projectPublicVerificationBundleResponse"]
    ] as const) {
      const projected = projectProof(
        candidateSource,
        name,
        providerProof,
        providerProof.receiptHash
      );
      expect(projected).toMatchObject({
        receiptHash: providerProof.receiptHash,
        bundle: {
          receipt: {
            payload: { verifiedProvider: "Dojang" },
            receiptHash: providerProof.receiptHash
          },
          replay: { command: replayCommand }
        }
      });
    }

    const wrongOrder = providerBackedProofFixture();
    wrongOrder.bundle.receipt.canonicalPayload = JSON.stringify(
      wrongOrder.bundle.receipt.payload
    );
    wrongOrder.bundle.receipt.canonicalPayloadBytesHex = stringToHex(
      wrongOrder.bundle.receipt.canonicalPayload
    );
    expect(
      projectProof(
        source,
        "projectPublicMatchedProof",
        wrongOrder,
        wrongOrder.receiptHash
      )
    ).toBeNull();
    expect(
      projectProof(
        participantSource,
        "projectPublicVerificationBundleResponse",
        wrongOrder,
        wrongOrder.receiptHash
      )
    ).toBeNull();
  });

  it("ships independent replay and progressive disclosure without a raw JSON dump", () => {
    const labels = [
      "Manifest 및 서명",
      "Verifier input",
      "Decoded logs",
      "Receipt canonical payload",
      "독립 재검증"
    ];
    for (const label of labels) expect(source).toContain(label);
    for (let index = 1; index < labels.length; index += 1) {
      expect(source.indexOf(labels[index - 1]!)).toBeLessThan(
        source.indexOf(labels[index]!)
      );
    }
    expect(source).toContain("검증 번들 JSON 받기");
    expect(source).toContain(replayCommand);
    expect(source).toContain("6개 무결성 검사를 직접 재계산할 수 있습니다");
    expect(source).toContain('download: "giwa-verification-bundle.json"');
    expect(source).toContain("?download=1");
    expect(source).toContain("GIWA Explorer");
    expect(source).toContain("Generated at");
    expect(source).toContain("Schema version");
    expect(source).toContain("Verifier version");
    expect(source).not.toContain(
      'text: proof.bundle.receipt.canonicalPayload'
    );
  });

  it("keeps unavailable bundle actions inert and long hashes bounded", () => {
    const styles = readWebFile("public/styles.css");
    expect(source).toContain("검증 번들을 사용할 수 없습니다");
    expect(source).toContain("disabled: true");
    expect(styles).toContain(".verification-bundle-disclosure");
    expect(styles).toContain("outline-offset: -3px");
    expect(styles).toContain("overflow-wrap: anywhere");
    expect(styles).toContain("overflow-x: auto");
    expect(styles).toContain("min-width: 0");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("uses semantic definition-list children for bundle metadata", () => {
    expect(source).toContain("verificationBundleMetadata");
    expect(participantSource).toContain("verificationBundleMetadata");
    expect(source).toContain('el("dt"');
    expect(source).toContain('el("dd"');
    expect(participantSource).toContain('view("dt"');
    expect(participantSource).toContain('view("dd"');
  });
});
