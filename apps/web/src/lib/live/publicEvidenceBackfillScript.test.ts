import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const SCRIPT_PATH = "scripts/backfill-public-evidence.mjs";

describe("public evidence backfill operator script", () => {
  it("requires an explicit SQLite path and reads only the standard RPC URL from secure environment", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");

    expect(source).toContain('"--db"');
    expect(source).toContain("env.GIWA_SEPOLIA_RPC_URL");
    expect(source).toContain("env = process.env");
    expect(source).not.toContain("CAMPAIGN_SIGNER_PRIVATE_KEY");
    expect(source).not.toContain("INTENT_SUBMITTER_PRIVATE_KEY");
    expect(source).not.toContain("VERIFIER_PRIVATE_KEY");
    expect(source).toContain("createSqliteLiveStore");
    expect(source).toContain("createStandardRpcReceiptClient");
    expect(source).toContain("backfillPublicEvidence");
    expect(source).not.toMatch(/sendTransaction|writeContract|sendRawTransaction/u);
  });

  it("prints only bounded aggregate counts and closes the store", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");

    expect(source.match(/console\.(?:log|error)/gu)).toHaveLength(1);
    expect(source).toContain("JSON.stringify(counts)");
    expect(source).toContain("closeBackfillStore(store, counts)");
    expect(source).toContain("store.close()");
    expect(source).toContain("candidates");
    expect(source).toContain("saved");
    expect(source).toContain("alreadyPresent");
    expect(source).toContain("skippedIntegrityMismatch");
    expect(source).toContain("failedBoundedError");
    expect(source).not.toMatch(
      /console\.(?:log|error)\([^\n]*(?:hash|wallet|request|header|process\.env|rpcUrl|dbPath|error)/iu
    );
  });

  it("bounds a close failure, marks a nonzero exit, and preserves aggregate-only output", async () => {
    const script = (await import(
      // @ts-expect-error The operator entrypoint is intentionally a directly executed .mjs script.
      "../../../scripts/backfill-public-evidence.mjs"
    )) as unknown as {
      closeBackfillStore: (
        store: { close(): void },
        counts: {
          candidates: number;
          saved: number;
          alreadyPresent: number;
          skippedIntegrityMismatch: number;
          failedBoundedError: number;
        },
        markFailed: () => void
      ) => void;
    };
    const counts = {
      candidates: 3,
      saved: 1,
      alreadyPresent: 1,
      skippedIntegrityMismatch: 1,
      failedBoundedError: 0
    };
    let exitMarks = 0;
    const privateCloseError =
      "close failed for private path with hash and wallet canaries";

    script.closeBackfillStore(
      {
        close() {
          throw new Error(privateCloseError);
        }
      },
      counts,
      () => {
        exitMarks += 1;
      }
    );

    expect(counts).toEqual({
      candidates: 3,
      saved: 1,
      alreadyPresent: 1,
      skippedIntegrityMismatch: 1,
      failedBoundedError: 1
    });
    expect(exitMarks).toBe(1);
    expect(JSON.stringify(counts)).not.toContain(privateCloseError);
    expect(Object.keys(counts)).toEqual([
      "candidates",
      "saved",
      "alreadyPresent",
      "skippedIntegrityMismatch",
      "failedBoundedError"
    ]);
  });

  it("registers the exact package command", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["evidence:backfill"]).toBe(
      "node --experimental-strip-types scripts/backfill-public-evidence.mjs"
    );
  });
});
