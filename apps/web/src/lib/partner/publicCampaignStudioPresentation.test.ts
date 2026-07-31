import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWebFile(path: string): string {
  const direct = join(process.cwd(), path);
  const workspace = join(process.cwd(), "apps/web", path);
  return readFileSync(existsSync(direct) ? direct : workspace, "utf8");
}

function standaloneFunction<T extends (...args: never[]) => unknown>(
  source: string,
  name: string,
  bindings: Record<string, unknown> = {}
): T {
  const start = source.indexOf(`function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      const names = Object.keys(bindings);
      return Function(
        ...names,
        `"use strict"; return (${source.slice(start, index + 1)});`
      )(...names.map((key) => bindings[key])) as T;
    }
  }
  throw new Error(`unterminated function ${name}`);
}

const receiptHash = `0x${"a".repeat(64)}`;
const campaignFixture = {
  screenKind: "public-campaign-studio",
  source: "live",
  generatedAt: "2026-07-30T00:00:00.000Z",
  eventCapture: {
    status: "captured",
    generatedAt: "2026-07-30T00:00:00.000Z"
  },
  campaign: {
    campaignId: "gasok-demo",
    missionId: "first-mock-vault-deposit",
    networkName: "GIWA Sepolia",
    actionName: "Mock USDC deposit",
    policyVersion: null,
    policyStatus: "fixed-unversioned",
    managedMode: true,
    testnetOnly: true
  },
  funnel: [
    {
      id: "campaignVisited",
      label: "캠페인 방문",
      count: 4,
      capture: "captured"
    },
    {
      id: "receiptIssued",
      label: "Receipt 발급",
      count: 1,
      capture: "derived"
    }
  ],
  approvalPaths: {
    exactApprovalSubmitted: 3,
    exactApprovalConfirmed: 2,
    approvalNotRequired: 1,
    depositSubmitted: 4
  },
  kpis: {
    uniqueCampaignVisitorCount: 4,
    uniqueWalletConnectSessionCount: 3,
    submittedDepositCount: 4,
    matchedReceiptCount: 1,
    matchedRate: {
      numerator: 1,
      denominator: 4,
      displayRate: "25%",
      definition: "Matched Receipts / submitted deposits"
    },
    uniqueParticipantCount: 1,
    repeatActivatorCount: 0,
    repeatActivationCount: 0
  },
  negativeControl: {
    label: "Recorded negative control",
    scenario: "TARGET_MISMATCH",
    scope: "controlled-demo-scenario",
    receiptIssued: false,
    publicReceiptAvailable: false,
    path: "/giwa-demo?example=mismatch"
  },
  mismatchBreakdown: [],
  receipts: [
    {
      source: "live",
      walletLabel: "0x111111…1111",
      receiptHash,
      intentHash: `0x${"b".repeat(64)}`,
      depositTxHash: `0x${"c".repeat(64)}`,
      verifierInputHash: `0x${"d".repeat(64)}`,
      receiptPath: `/receipt/${receiptHash}`,
      participantReceiptPath: `/user/receipt/${receiptHash}`,
      explorerUrl: `https://sepolia-explorer.giwa.io/tx/0x${"c".repeat(64)}`,
      updatedAt: "2026-07-30T00:00:00.000Z"
    }
  ]
};

describe("public Campaign Studio presentation", () => {
  const html = readWebFile("public/index.html");
  const source = readWebFile("public/flow.js");

  it("ships the Korean public proof shell and six-section Studio", () => {
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain("Pretendard");
    expect(html).toContain(
      "<title>Public Proof · GIWA Verified Intent Rail</title>"
    );
    expect(source).toContain("projectPublicCampaignStudio");
    expect(source).toContain("fetchPublicCampaignStudio");
    expect(source).toContain("renderPublicCampaignStudio");
    expect(source).toContain(
      'document.title = "Campaign Studio · GIWA Verified Intent Rail"'
    );
    expect(source).toContain("Campaign Brief");
    expect(source).toContain("Mission Policy");
    expect(source).toContain("Verified activation funnel");
    expect(source).toContain("Approval path");
    expect(source).toContain("정확한 승인 제출");
    expect(source).toContain("승인 확인");
    expect(source).toContain("기존 허용량으로 승인 생략");
    expect(source).toContain("Mismatch breakdown");
    expect(source).toContain("Proof Ledger");
    expect(source).toContain("Closeout");
    expect(source).toContain('step.count === null ? "—"');
    expect(source).toContain("Live");
    expect(source).toContain("Matched Receipts / submitted deposits");
    expect(source).toContain("Unique campaign visitors");
    expect(source).toContain("Unique wallet-connect sessions");
    expect(source).toContain("Unique participants");
    expect(source).toContain("Repeat activators");
    expect(source).toContain("Repeat activations");
    expect(source).toContain("Event capture");
    expect(source).toContain("Generated at");
    expect(source).toContain(
      "Distinct anonymous sessions with campaignVisited"
    );
    expect(source).toContain(
      "Distinct anonymous sessions with walletConnected"
    );
    expect(source).toContain(
      "Distinct normalized wallets among submitted deposits"
    );
    expect(source).toContain(
      "Wallets with at least 2 gated Matched Receipts"
    );
    expect(source).toContain(
      "Gated Matched Receipts after each wallet's first"
    );
    expect(source).toContain("Recorded");
    expect(source).toContain("Fixture");
    expect(source).not.toContain("force match");
    expect(source).not.toContain('"approveSubmitted"');
    expect(source).not.toContain('"approveConfirmed"');
  });

  it("uses only authoritative packet KPIs and never shortened or latest-20 rows", () => {
    const project = standaloneFunction<
      (body: unknown) => {
        model: {
          kpis: {
            submittedDepositCount: number | null;
            matchedReceiptCount: number | null;
            matchedRate: {
              numerator: number | null;
              denominator: number | null;
              displayRate: string | null;
              definition: string;
            };
            uniqueParticipantCount: number | null;
            repeatActivatorCount: number | null;
            repeatActivationCount: number | null;
          };
          receipts: Array<{ walletLabel: string }>;
        };
      } | null
    >(source, "projectFallbackCampaignStudio");
    const collidingWallets = [
      `0xabcdef${"1".repeat(30)}1234`,
      `0xabcdef${"2".repeat(30)}1234`
    ];
    const rows = Array.from({ length: 21 }, (_unused, index) => ({
      source: "live",
      status: "matched",
      wallet: collidingWallets[index % collidingWallets.length],
      receiptHash: `0x${(index + 1).toString(16).padStart(64, "0")}`,
      intentHash: `0x${(index + 101).toString(16).padStart(64, "0")}`,
      depositTxHash: `0x${(index + 201).toString(16).padStart(64, "0")}`,
      verifierInputHash: `0x${(index + 301)
        .toString(16)
        .padStart(64, "0")}`
    }));
    const body = {
      screenKind: "partner-proof-console",
      summary: {
        campaignId: "gasok-demo",
        missionId: "first-mock-vault-deposit"
      },
      evidencePacket: {
        rows,
        kpis: {
          submittedDepositCount: 25,
          matchedReceiptCount: 21
        }
      }
    };

    const unavailable = project(body);
    expect(unavailable?.model.receipts).toHaveLength(20);
    expect(
      new Set(
        unavailable?.model.receipts.map((receipt) => receipt.walletLabel)
      )
    ).toEqual(new Set(["0xabcdef…1234"]));
    expect(unavailable?.model.kpis).toMatchObject({
      submittedDepositCount: 25,
      matchedReceiptCount: 21,
      matchedRate: {
        numerator: null,
        denominator: null,
        displayRate: null,
        definition: "Matched Receipts / submitted deposits"
      },
      uniqueParticipantCount: null,
      repeatActivatorCount: null,
      repeatActivationCount: null
    });

    const authoritative = project({
      ...body,
      evidencePacket: {
        ...body.evidencePacket,
        kpis: {
          ...body.evidencePacket.kpis,
          matchedRate: {
            numerator: 21,
            denominator: 25,
            displayRate: "84%",
            definition: "Matched Receipts / submitted deposits"
          },
          uniqueParticipantCount: 21,
          repeatActivatorCount: 0,
          repeatActivationCount: 0
        }
      }
    });
    expect(authoritative?.model.kpis).toMatchObject({
      matchedRate: {
        numerator: 21,
        denominator: 25,
        displayRate: "84%",
        definition: "Matched Receipts / submitted deposits"
      },
      uniqueParticipantCount: 21,
      repeatActivatorCount: 0,
      repeatActivationCount: 0
    });

    const authoritativeKpis = {
      submittedDepositCount: 25,
      matchedReceiptCount: 21,
      matchedRate: {
        numerator: 21,
        denominator: 25,
        displayRate: "84%",
        definition: "Matched Receipts / submitted deposits"
      },
      uniqueParticipantCount: 20,
      repeatActivatorCount: 1,
      repeatActivationCount: 1
    };
    const projectKpis = (
      overrides: Record<string, unknown>
    ) =>
      project({
        ...body,
        evidencePacket: {
          ...body.evidencePacket,
          kpis: { ...authoritativeKpis, ...overrides }
        }
      })?.model.kpis;

    expect(
      projectKpis({
        matchedRate: {
          ...authoritativeKpis.matchedRate,
          displayRate: "83%"
        }
      })
    ).toMatchObject({
      submittedDepositCount: 25,
      matchedReceiptCount: 21,
      matchedRate: {
        numerator: null,
        denominator: null,
        displayRate: null
      },
      uniqueParticipantCount: 20,
      repeatActivatorCount: 1,
      repeatActivationCount: 1
    });
    expect(
      projectKpis({
        matchedReceiptCount: 26,
        matchedRate: {
          numerator: 26,
          denominator: 25,
          displayRate: "104%",
          definition: "Matched Receipts / submitted deposits"
        }
      })
    ).toMatchObject({
      submittedDepositCount: null,
      matchedReceiptCount: null,
      matchedRate: {
        numerator: null,
        denominator: null,
        displayRate: null
      },
      uniqueParticipantCount: null,
      repeatActivatorCount: null,
      repeatActivationCount: null
    });
    expect(projectKpis({ uniqueParticipantCount: 22 })).toMatchObject({
      uniqueParticipantCount: 22,
      repeatActivatorCount: 1,
      repeatActivationCount: 1
    });
    for (const participantContradiction of [
      { uniqueParticipantCount: 26 },
      { repeatActivatorCount: 2 },
      {
        uniqueParticipantCount: 21,
        repeatActivatorCount: 1,
        repeatActivationCount: 21
      }
    ]) {
      expect(projectKpis(participantContradiction)).toMatchObject({
        submittedDepositCount: 25,
        matchedReceiptCount: 21,
        matchedRate: authoritativeKpis.matchedRate,
        uniqueParticipantCount: null,
        repeatActivatorCount: null,
        repeatActivationCount: null
      });
    }
  });

  it("strictly projects shortened-wallet live evidence", () => {
    const project = standaloneFunction<
      (body: unknown) => typeof campaignFixture | null
    >(source, "projectPublicCampaignStudio");
    const projected = project({
      ...campaignFixture,
      manifestSignature: "discard"
    });

    expect(projected?.receipts[0]?.receiptHash).toBe(receiptHash);
    expect(projected?.receipts[0]?.walletLabel).toBe("0x111111…1111");
    expect(projected?.receipts[0]).not.toHaveProperty("runId");
    expect(projected?.approvalPaths).toEqual({
      exactApprovalSubmitted: 3,
      exactApprovalConfirmed: 2,
      approvalNotRequired: 1,
      depositSubmitted: 4
    });
    expect(projected?.negativeControl).toEqual(
      campaignFixture.negativeControl
    );
    expect(projected?.negativeControl).not.toHaveProperty("runId");
    expect(projected?.negativeControl).not.toHaveProperty("intentHash");
    expect(projected?.negativeControl).not.toHaveProperty("transactionHash");
    expect(projected?.negativeControl).not.toHaveProperty("failureTrace");
    expect(projected?.negativeControl).not.toHaveProperty("capability");
    expect(projected).not.toHaveProperty("manifestSignature");
    expect(projected?.eventCapture).toEqual(campaignFixture.eventCapture);
    expect(projected?.kpis).toEqual(campaignFixture.kpis);
    expect(projected?.approvalPaths).not.toHaveProperty("discard");
    expect(
      project({
        ...campaignFixture,
        receipts: [
          {
            ...campaignFixture.receipts[0],
            walletLabel: "0x1111111111111111111111111111111111111111"
          }
        ]
      })
    ).toBeNull();
    expect(
      project({
        ...campaignFixture,
        approvalPaths: {
          ...campaignFixture.approvalPaths,
          exactApprovalConfirmed: 4
        }
      })
    ).toBeNull();
    expect(
      project({
        ...campaignFixture,
        approvalPaths: {
          ...campaignFixture.approvalPaths,
          approvalNotRequired: 2
        }
      })
    ).toBeNull();
    expect(
      project({
        ...campaignFixture,
        approvalPaths: {
          ...campaignFixture.approvalPaths,
          discard: "private"
        }
      })?.approvalPaths
    ).toEqual(campaignFixture.approvalPaths);
    expect(project({ ...campaignFixture, source: "fixture" })).toBeNull();
    expect(
      project({
        ...campaignFixture,
        kpis: {
          ...campaignFixture.kpis,
          matchedRate: {
            ...campaignFixture.kpis.matchedRate,
            numerator: 2
          }
        }
      })
    ).toBeNull();
    expect(
      project({
        ...campaignFixture,
        negativeControl: {
          ...campaignFixture.negativeControl,
          path: "/giwa-demo?example=private",
          runId: "private-run"
        }
      })
    ).toBeNull();
  });

  it("keeps fragment and app links in the same document", () => {
    const opensInNewTab = standaloneFunction<(href: string) => boolean>(
      source,
      "opensInNewTab"
    );

    expect(opensInNewTab("#receipt-row-1")).toBe(false);
    expect(opensInNewTab("/partner?receipt=matched")).toBe(false);
    expect(
      opensInNewTab("https://sepolia-explorer.giwa.io/tx/0xabc")
    ).toBe(true);
  });

  it("shows a fresh Receipt only for an explicit one-shot issued handoff", () => {
    const project = standaloneFunction<
      (
        receipts: Array<{ receiptHash: string }>,
        selectedHash: string | null,
        matchedCount: number,
        handoffMarker: string | null
      ) => null | {
        index: number;
        latest: boolean;
        fresh: boolean;
        eyebrow: string;
        message: string;
      }
    >(source, "projectCampaignReceiptHandoff");
    const newest = `0x${"a".repeat(64)}`;
    const older = `0x${"b".repeat(64)}`;
    const receipts = [{ receiptHash: newest }, { receiptHash: older }];

    expect(project(receipts, newest, 4, "issued")).toMatchObject({
      index: 0,
      latest: true,
      fresh: true,
      eyebrow: "방금 발급된 Receipt",
      message: "방금 발급된 Receipt · 3 → 4"
    });
    expect(project(receipts, newest, 4, null)).toMatchObject({
      index: 0,
      latest: true,
      fresh: false,
      eyebrow: "선택한 Receipt",
      message: "선택한 Receipt · 현재 4건 중 포함"
    });
    expect(project(receipts, older, 4, "issued")).toMatchObject({
      index: 1,
      latest: false,
      fresh: false,
      eyebrow: "선택한 Receipt",
      message: "선택한 Receipt · 현재 4건 중 포함"
    });
    expect(project(receipts, null, 4, "issued")).toBeNull();
  });

  it("requires a matching session marker for an issued handoff", () => {
    const project = standaloneFunction<
      (href: string, storedReceiptHash: string | null) => {
        selectedHash: string | null;
        handoffMarker: string | null;
        fresh: boolean;
        consumeStoredMarker: boolean;
        replacementPath: string | null;
      }
    >(source, "projectCampaignHandoffRequest");
    const issuedUrl =
      `https://giwa.teckbrick.com/partner?receipt=${receiptHash}` +
      "&handoff=issued#receipt-ledger";

    expect(project(issuedUrl, receiptHash)).toEqual({
      selectedHash: receiptHash,
      handoffMarker: "issued",
      fresh: true,
      consumeStoredMarker: true,
      replacementPath: `/partner?receipt=${receiptHash}#receipt-ledger`
    });
    expect(project(issuedUrl, `0x${"b".repeat(64)}`)).toEqual({
      selectedHash: receiptHash,
      handoffMarker: null,
      fresh: false,
      consumeStoredMarker: false,
      replacementPath: `/partner?receipt=${receiptHash}#receipt-ledger`
    });
    expect(
      project(
        `https://giwa.teckbrick.com/partner?receipt=${receiptHash}#receipt-ledger`,
        receiptHash
      )
    ).toEqual({
      selectedHash: receiptHash,
      handoffMarker: null,
      fresh: false,
      consumeStoredMarker: false,
      replacementPath: null
    });
  });

  it("consumes only a matching marker and fails safe when storage is unavailable", () => {
    const project = standaloneFunction<
      (href: string, storedReceiptHash: string | null) => {
        selectedHash: string | null;
        handoffMarker: string | null;
        fresh: boolean;
        consumeStoredMarker: boolean;
        replacementPath: string | null;
      }
    >(source, "projectCampaignHandoffRequest");
    const consume = standaloneFunction<
      (options: {
        href: string;
        storage: {
          getItem(key: string): string | null;
          removeItem(key: string): void;
        };
        replacePath(path: string): void;
      }) => {
        selectedHash: string | null;
        handoffMarker: string | null;
        fresh: boolean;
      }
    >(source, "consumeCampaignHandoffRequest", {
      projectCampaignHandoffRequest: project
    });
    const issuedUrl =
      `https://giwa.teckbrick.com/partner?receipt=${receiptHash}` +
      "&handoff=issued";
    let storedMarker: string | null = receiptHash;
    const removedKeys: string[] = [];
    const replacements: string[] = [];
    const storage = {
      getItem: () => storedMarker,
      removeItem: (key: string) => {
        removedKeys.push(key);
        storedMarker = null;
      }
    };

    expect(
      consume({
        href: issuedUrl,
        storage,
        replacePath: (path) => replacements.push(path)
      })
    ).toMatchObject({
      selectedHash: receiptHash,
      handoffMarker: "issued",
      fresh: true
    });
    expect(removedKeys).toEqual(["giwa:campaignHandoffReceipt"]);
    expect(replacements).toEqual([`/partner?receipt=${receiptHash}`]);

    expect(
      consume({
        href: `https://giwa.teckbrick.com/partner?receipt=${receiptHash}`,
        storage,
        replacePath: (path) => replacements.push(path)
      })
    ).toMatchObject({
      selectedHash: receiptHash,
      handoffMarker: null,
      fresh: false
    });
    expect(removedKeys).toHaveLength(1);

    storedMarker = `0x${"b".repeat(64)}`;
    expect(
      consume({
        href: issuedUrl,
        storage,
        replacePath: (path) => replacements.push(path)
      })
    ).toMatchObject({
      handoffMarker: null,
      fresh: false
    });
    expect(storedMarker).toBe(`0x${"b".repeat(64)}`);
    expect(removedKeys).toHaveLength(1);

    expect(
      consume({
        href: issuedUrl,
        storage: {
          getItem: () => {
            throw new Error("storage unavailable");
          },
          removeItem: () => {
            throw new Error("must not be called");
          }
        },
        replacePath: (path) => replacements.push(path)
      })
    ).toMatchObject({
      handoffMarker: null,
      fresh: false
    });
  });

  it("builds public receipt row identity from receipt hash and display index", () => {
    const rowId = standaloneFunction<
      (receiptHash: string, index: number) => string
    >(source, "campaignReceiptRowId");

    expect(rowId(receiptHash, 3)).toBe("receipt-row-3-aaaaaaaaaaaa");
  });

  it("renders the handoff summary before focusing it", () => {
    expect(source).toContain("history.replaceState");
    expect(source).toContain('id: "campaign-receipt-handoff"');
    expect(source).toContain("href: `#${handoff.rowId}`");
    expect(source).toContain(
      'document.querySelector("#campaign-receipt-handoff")?.focus()'
    );
    expect(source).not.toContain(
      'document.querySelector(`#receipt-row-${index}`)?.focus()'
    );
  });

  it("preserves Receipt and Proof Ledger navigation beside bundle UX", () => {
    expect(source).toContain("공개 Receipt");
    expect(source).toContain("Proof Ledger");
    expect(source).toContain("GIWA Explorer");
    expect(source).toContain("검증 번들 JSON 받기");
    expect(source).toContain("Campaign");
  });

  it("renders one secondary negative-control card after positive Matched evidence", () => {
    expect(source).toContain("renderPublicNegativeControl");
    expect(source).toContain("불일치 대조 예시");
    expect(source).toContain(
      "Manifest는 하나의 실행 대상을 기대했지만, 통제된 실행은 다른 대상을 사용했습니다."
    );
    expect(source).toContain(
      "검증기는 Matched Receipt를 발급하지 않았습니다."
    );
    expect(source).toContain(
      "따라서 정확한 해시의 공개 Receipt 조회는 사용할 수 없습니다."
    );
    expect(source).toContain('className: "notice negative-control-card"');
    expect(source).toContain('href: control.path');
    expect(source).toContain('text: "불일치 예시 보기"');

    const campaignStart = source.indexOf(
      "function renderPublicCampaignStudio"
    );
    const campaignEnd = source.indexOf(
      "function projectProofSearchState",
      campaignStart
    );
    const campaignSource = source.slice(campaignStart, campaignEnd);
    expect(
      campaignSource.match(/renderPublicNegativeControl\(/gu)
    ).toHaveLength(1);
    expect(campaignSource.indexOf("model.receipts.map")).toBeLessThan(
      campaignSource.indexOf(
        "renderPublicNegativeControl(model.negativeControl)"
      )
    );

    const proofStart = source.indexOf("function renderPublicEvidenceSearch");
    const proofEnd = source.indexOf(
      "function appendPublicNegativeControl",
      proofStart
    );
    const proofSource = source.slice(proofStart, proofEnd);
    expect(proofSource.match(/renderPublicNegativeControl\(/gu)).toHaveLength(
      1
    );
    expect(proofSource).toContain('id: "proof-negative-control-slot"');
    expect(proofSource).toContain(
      'renderVerificationBundle(proof, { replayId: "copy-proof-replay" }),\n      negativeControlSlot'
    );
  });

  it("renders matched proof before a deferred secondary control resolves", async () => {
    expect(source).toContain("function loadPublicEvidenceRoute");
    expect(source).toContain(
      'new URLSearchParams(location.search).get("proof") ??\n      new URLSearchParams(location.search).get("hash")'
    );
    expect(source).toContain('name: "proof"');
    const loadRoute = standaloneFunction<
      (options: {
        query: string;
        fetchProof(hash: string): Promise<{ receiptHash: string }>;
        fetchCampaignStudio(): Promise<{
          negativeControl: typeof campaignFixture.negativeControl;
        }>;
        renderProof(input: {
          query: string;
          proof: { receiptHash: string } | null;
          state: string;
        }): { id: string };
        appendNegativeControl(
          slot: { id: string },
          control: typeof campaignFixture.negativeControl
        ): void;
      }) => Promise<{ secondary: Promise<void> }>
    >(source, "loadPublicEvidenceRoute", {
      projectProofSearchState: (
        query: string,
        proof: { receiptHash: string } | null
      ) => (query === "" ? "idle" : proof === null ? "not-found" : "matched")
    });
    const events: string[] = [];
    let resolveCampaign:
      | ((value: {
          negativeControl: typeof campaignFixture.negativeControl;
        }) => void)
      | undefined;
    const campaign = new Promise<{
      negativeControl: typeof campaignFixture.negativeControl;
    }>((resolve) => {
      resolveCampaign = resolve;
    });
    const proof = { receiptHash };

    const route = await loadRoute({
      query: receiptHash,
      fetchProof: async (hash) => {
        expect(hash).toBe(receiptHash);
        return proof;
      },
      fetchCampaignStudio: () => campaign,
      renderProof: (input) => {
        expect(input).toEqual({
          query: receiptHash,
          proof,
          state: "matched"
        });
        events.push("proof");
        return { id: "proof-negative-control-slot" };
      },
      appendNegativeControl: (slot, control) => {
        expect(slot.id).toBe("proof-negative-control-slot");
        expect(control).toEqual(campaignFixture.negativeControl);
        events.push("negative-control");
      }
    });

    expect(events).toEqual(["proof"]);
    resolveCampaign?.({ negativeControl: campaignFixture.negativeControl });
    await route.secondary;
    expect(events).toEqual(["proof", "negative-control"]);
  });

  it("keeps matched proof rendered when the secondary request fails", async () => {
    expect(source).toContain("function loadPublicEvidenceRoute");
    const loadRoute = standaloneFunction<
      (options: {
        query: string;
        fetchProof(hash: string): Promise<{ receiptHash: string }>;
        fetchCampaignStudio(): Promise<never>;
        renderProof(input: {
          query: string;
          proof: { receiptHash: string } | null;
          state: string;
        }): { id: string };
        appendNegativeControl(): void;
      }) => Promise<{ secondary: Promise<void> }>
    >(source, "loadPublicEvidenceRoute", {
      projectProofSearchState: (
        query: string,
        proof: { receiptHash: string } | null
      ) => (query === "" ? "idle" : proof === null ? "not-found" : "matched")
    });
    const events: string[] = [];

    const route = await loadRoute({
      query: receiptHash,
      fetchProof: async () => ({ receiptHash }),
      fetchCampaignStudio: async () => {
        throw new Error("secondary unavailable");
      },
      renderProof: () => {
        events.push("proof");
        return { id: "proof-negative-control-slot" };
      },
      appendNegativeControl: () => events.push("negative-control")
    });

    expect(events).toEqual(["proof"]);
    await expect(route.secondary).resolves.toBeUndefined();
    expect(events).toEqual(["proof"]);
  });
});
