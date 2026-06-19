import { describe, expect, it } from "vitest";
import { keccak256, stringToBytes, toFunctionSelector, zeroHash, type Hex } from "viem";

import { closeTestContext, createTestContext, deployContract } from "./helpers.js";

const amount = 1_000_000_000_000_000_000n;

function bytes32FromText(value: string): Hex {
  return keccak256(stringToBytes(value.trim()));
}

function fakeHash(tag: string): Hex {
  return keccak256(stringToBytes(tag));
}

describe("MockIntentToken", () => {
  it("mints tokens and emits approval and transfer logs for transferFrom", async () => {
    const ctx = await createTestContext();
    try {
      const [owner, spender, recipient] = ctx.accounts;
      const token = await deployContract(ctx, "MockIntentToken", ["Mock Intent Token", "MIT"]);

      await ctx.publicClient.waitForTransactionReceipt({
        hash: await token.write.mint([owner, amount])
      });
      expect(await token.read.balanceOf([owner])).toBe(amount);

      const approvalReceipt = await ctx.publicClient.waitForTransactionReceipt({
        hash: await token.write.approve([spender, amount], { account: owner })
      });
      const transferReceipt = await ctx.publicClient.waitForTransactionReceipt({
        hash: await token.write.transferFrom([owner, recipient, amount], { account: spender })
      });

      expect(await token.read.balanceOf([recipient])).toBe(amount);
      expect(await token.read.allowance([owner, spender])).toBe(0n);

      const approvalLogs = await ctx.publicClient.getContractEvents({
        address: token.address,
        abi: token.abi,
        eventName: "Approval",
        fromBlock: approvalReceipt.blockNumber,
        toBlock: approvalReceipt.blockNumber,
        strict: true
      });
      expect(approvalLogs[0]?.args).toMatchObject({ owner, spender, amount });

      const transferLogs = await ctx.publicClient.getContractEvents({
        address: token.address,
        abi: token.abi,
        eventName: "Transfer",
        fromBlock: transferReceipt.blockNumber,
        toBlock: transferReceipt.blockNumber,
        strict: true
      });
      expect(transferLogs[0]?.args).toMatchObject({ from: owner, to: recipient, amount });
    } finally {
      await closeTestContext(ctx);
    }
  });
});

describe("MockVault", () => {
  it("rejects zero deposits", async () => {
    const ctx = await createTestContext();
    try {
      const token = await deployContract(ctx, "MockIntentToken", ["Mock Intent Token", "MIT"]);
      const vault = await deployContract(ctx, "MockVault");

      await expect(vault.write.deposit([token.address, 0n])).rejects.toThrow(/AmountZero/);
    } finally {
      await closeTestContext(ctx);
    }
  });

  it("transfers mock tokens into the vault and emits deposit evidence", async () => {
    const ctx = await createTestContext();
    try {
      const [wallet] = ctx.accounts;
      const token = await deployContract(ctx, "MockIntentToken", ["Mock Intent Token", "MIT"]);
      const vault = await deployContract(ctx, "MockVault");

      await ctx.publicClient.waitForTransactionReceipt({
        hash: await token.write.mint([wallet, amount])
      });
      await ctx.publicClient.waitForTransactionReceipt({
        hash: await token.write.approve([vault.address, amount], { account: wallet })
      });
      const depositReceipt = await ctx.publicClient.waitForTransactionReceipt({
        hash: await vault.write.deposit([token.address, amount], { account: wallet })
      });

      expect(await token.read.balanceOf([vault.address])).toBe(amount);
      expect(await vault.read.depositBalanceOf([wallet, token.address])).toBe(amount);

      const depositLogs = await ctx.publicClient.getContractEvents({
        address: vault.address,
        abi: vault.abi,
        eventName: "MockDeposit",
        fromBlock: depositReceipt.blockNumber,
        toBlock: depositReceipt.blockNumber,
        strict: true
      });
      expect(depositLogs[0]?.args).toMatchObject({
        wallet,
        asset: token.address,
        amount
      });
    } finally {
      await closeTestContext(ctx);
    }
  });
});

describe("IntentRail", () => {
  it("emits manifest-covered IntentSubmitted fields with bytes32 campaign and mission ids", async () => {
    const ctx = await createTestContext();
    try {
      const [wallet, , verifier, submitter] = ctx.accounts;
      const rail = await deployContract(ctx, "IntentRail", [verifier]);
      const intentHash = fakeHash("intent");
      const campaignIdBytes32 = bytes32FromText("gasok-demo");
      const missionIdBytes32 = bytes32FromText("first-mock-vault-deposit");
      const selector = toFunctionSelector("deposit(address,uint256)");

      const receipt = await ctx.publicClient.waitForTransactionReceipt({
        hash: await rail.write.submitIntent(
          [
            intentHash,
            campaignIdBytes32,
            missionIdBytes32,
            wallet,
            rail.address,
            selector,
            rail.address,
            amount,
            rail.address,
            amount,
            1_790_000_000n
          ],
          { account: submitter }
        )
      });

      const logs = await ctx.publicClient.getContractEvents({
        address: rail.address,
        abi: rail.abi,
        eventName: "IntentSubmitted",
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
        strict: true
      });
      expect(logs[0]?.args).toMatchObject({
        intentHash,
        campaignIdBytes32,
        missionIdBytes32,
        wallet,
        selector,
        amountBaseUnits: amount,
        maxAllowanceBaseUnits: amount
      });
    } finally {
      await closeTestContext(ctx);
    }
  });

  it("allows only the verifier operator to emit matched or failed decisions", async () => {
    const ctx = await createTestContext();
    try {
      const [wallet, nonOperator, verifier] = ctx.accounts;
      const rail = await deployContract(ctx, "IntentRail", [verifier]);

      await expect(
        rail.write.emitMatched(
          [
            fakeHash("non-operator-match"),
            fakeHash("receipt"),
            wallet,
            zeroHash,
            fakeHash("deposit"),
            12_345n,
            fakeHash("block"),
            amount,
            1_790_000_010n
          ],
          { account: nonOperator }
        )
      ).rejects.toThrow(/NotVerifierOperator/);

      await expect(
        rail.write.emitFailed(
          [
            fakeHash("non-operator-fail"),
            wallet,
            fakeHash("deposit"),
            12_345n,
            fakeHash("block"),
            await rail.read.FAILED(),
            await rail.read.TX_FAILED(),
            1_790_000_011n
          ],
          { account: nonOperator }
        )
      ).rejects.toThrow(/NotVerifierOperator/);
    } finally {
      await closeTestContext(ctx);
    }
  });

  it("emits terminal decision events once per intentHash", async () => {
    const ctx = await createTestContext();
    try {
      const [wallet, , verifier] = ctx.accounts;
      const rail = await deployContract(ctx, "IntentRail", [verifier]);
      const intentHash = fakeHash("terminal-intent");
      const receiptHash = fakeHash("receipt");
      const depositTxHash = fakeHash("deposit");
      const blockHash = fakeHash("block");

      const matchedReceipt = await ctx.publicClient.waitForTransactionReceipt({
        hash: await rail.write.emitMatched(
          [
            intentHash,
            receiptHash,
            wallet,
            zeroHash,
            depositTxHash,
            12_345n,
            blockHash,
            amount,
            1_790_000_010n
          ],
          { account: verifier }
        )
      });

      const matchedLogs = await ctx.publicClient.getContractEvents({
        address: rail.address,
        abi: rail.abi,
        eventName: "IntentMatched",
        fromBlock: matchedReceipt.blockNumber,
        toBlock: matchedReceipt.blockNumber,
        strict: true
      });
      expect(matchedLogs[0]?.args).toMatchObject({
        intentHash,
        receiptHash,
        wallet,
        approveTxHash: zeroHash,
        depositTxHash,
        allowanceUsedBaseUnits: amount
      });

      await expect(
        rail.write.emitFailed(
          [
            intentHash,
            wallet,
            depositTxHash,
            12_346n,
            blockHash,
            await rail.read.MISMATCHED(),
            await rail.read.TARGET_MISMATCH(),
            1_790_000_011n
          ],
          { account: verifier }
        )
      ).rejects.toThrow(/IntentAlreadyDecided/);
    } finally {
      await closeTestContext(ctx);
    }
  });

  it("emits failed decisions from the verifier operator with bounded status and reason codes", async () => {
    const ctx = await createTestContext();
    try {
      const [wallet, , verifier] = ctx.accounts;
      const rail = await deployContract(ctx, "IntentRail", [verifier]);
      const intentHash = fakeHash("failed-intent");
      const depositTxHash = fakeHash("failed-deposit");
      const blockHash = fakeHash("failed-block");
      const status = await rail.read.FAILED();
      const failureReason = await rail.read.TX_FAILED();

      const failedReceipt = await ctx.publicClient.waitForTransactionReceipt({
        hash: await rail.write.emitFailed(
          [
            intentHash,
            wallet,
            depositTxHash,
            12_347n,
            blockHash,
            status,
            failureReason,
            1_790_000_012n
          ],
          { account: verifier }
        )
      });

      const failedLogs = await ctx.publicClient.getContractEvents({
        address: rail.address,
        abi: rail.abi,
        eventName: "IntentFailed",
        fromBlock: failedReceipt.blockNumber,
        toBlock: failedReceipt.blockNumber,
        strict: true
      });
      expect(failedLogs[0]?.args).toMatchObject({
        intentHash,
        wallet,
        depositTxHash,
        status,
        failureReason
      });
    } finally {
      await closeTestContext(ctx);
    }
  });

  it("rejects unrecognized failed decision status or reason codes", async () => {
    const ctx = await createTestContext();
    try {
      const [wallet, , verifier] = ctx.accounts;
      const rail = await deployContract(ctx, "IntentRail", [verifier]);

      await expect(
        rail.write.emitFailed(
          [
            fakeHash("bad-status"),
            wallet,
            fakeHash("deposit"),
            12_348n,
            fakeHash("block"),
            fakeHash("UNKNOWN_STATUS"),
            await rail.read.TX_FAILED(),
            1_790_000_013n
          ],
          { account: verifier }
        )
      ).rejects.toThrow(/InvalidDecisionStatus/);

      await expect(
        rail.write.emitFailed(
          [
            fakeHash("bad-reason"),
            wallet,
            fakeHash("deposit"),
            12_349n,
            fakeHash("block"),
            await rail.read.FAILED(),
            fakeHash("UNKNOWN_REASON"),
            1_790_000_014n
          ],
          { account: verifier }
        )
      ).rejects.toThrow(/InvalidFailureReason/);
    } finally {
      await closeTestContext(ctx);
    }
  });
});
