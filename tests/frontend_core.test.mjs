import test from "node:test";
import assert from "node:assert/strict";

import {
  PENDING_KEY,
  RELEASE_CONTRACT_ADDRESS,
  clearFinalizedFailure,
  isContractAddress,
  makePendingIntent,
  normalizeClaim,
  parsePendingIntent,
  positiveId,
  receiptSucceeded,
  registrationArgs,
  waitForCanonicalReceipt,
} from "../frontend/core.js";

const ADDRESS = "0x1111111111111111111111111111111111111111";

test("contract address validation rejects placeholders and malformed input", () => {
  assert.equal(isContractAddress(ADDRESS), true);
  assert.equal(isContractAddress(RELEASE_CONTRACT_ADDRESS), true);
  assert.equal(isContractAddress("0x0000"), false);
  assert.equal(isContractAddress("YOUR_CONTRACT_ADDRESS"), false);
});

test("positiveId accepts only positive whole numbers", () => {
  assert.equal(positiveId("42"), 42n);
  assert.throws(() => positiveId("0"), /positive whole number/);
  assert.throws(() => positiveId("1.2"), /positive whole number/);
});

test("registrationArgs locks identifier formats and named-program basis points", () => {
  const args = registrationArgs({
    ein: "123456789",
    taxPeriod: "202312",
    objectId: "202441239349300001",
    template: "PROGRAM_SERVICE_SHARE",
    claimText: "The charity spent 70% on program services.",
    claimedBps: "7000",
  });
  assert.equal(args[5], 7000n);
  assert.throws(
    () => registrationArgs({
      ein: "123456789",
      taxPeriod: "202312",
      objectId: "202441239349300001",
      template: "NAMED_PROGRAM_SCOPE",
      claimText: "The charity operated a named food program.",
      claimedBps: "1",
    }),
    /must use 0/,
  );
});

test("pending intent round-trips bigint args without losing identity", () => {
  const intent = makePendingIntent({
    contractAddress: ADDRESS,
    action: "assess_claim",
    args: [7n],
    expected: {},
  });
  const parsed = parsePendingIntent(JSON.stringify(intent));
  assert.equal(parsed.args[0], "7");
  assert.equal(parsed.txHash, null);
});

test("pending retry intent preserves the authoritative retry baseline", () => {
  const intent = makePendingIntent({
    contractAddress: ADDRESS,
    action: "retry_assessment",
    args: [7n, "retry-intent-1234567890"],
    expected: { previousRetries: 1n, clientIntentId: "retry-intent-1234567890" },
  });
  const parsed = parsePendingIntent(JSON.stringify(intent));
  assert.equal(parsed.expected.previousRetries, "1");
  assert.equal(parsed.args[0], "7");
});

test("pending intent rejects unapproved methods and malformed recovery metadata", () => {
  const base = makePendingIntent({
    contractAddress: ADDRESS,
    action: "assess_claim",
    args: [7n],
    expected: {},
  });
  assert.throws(
    () => parsePendingIntent(JSON.stringify({ ...base, action: "upgrade" })),
    /invalid/,
  );
  const retry = {
    ...base,
    action: "retry_assessment",
    args: ["7", "retry-intent-1234567890"],
    expected: { previousRetries: "9", clientIntentId: "retry-intent-1234567890" },
  };
  assert.throws(() => parsePendingIntent(JSON.stringify(retry)), /retry baseline/);
});

test("receipt requires successful finalized execution", () => {
  assert.deepEqual(
    receiptSucceeded({ statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_RETURN" }),
    { finalized: true, executionSucceeded: true, execution: "FINISHED_WITH_RETURN" },
  );
  assert.equal(
    receiptSucceeded({ statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_ERROR" }).executionSucceeded,
    false,
  );
  assert.equal(
    receiptSucceeded({ statusName: "ACCEPTED", txExecutionResultName: "FINISHED_WITH_RETURN" }).finalized,
    false,
  );
});

test("normalizeClaim rejects incomplete and unknown-state payloads", () => {
  assert.throws(() => normalizeClaim({}), /missing claim_id/);
  const full = Object.fromEntries([
    "claim_id", "registrant", "ein", "tax_period", "object_id", "template", "claim_text",
    "claimed_bps", "state", "verdict", "numerator", "denominator", "calculated_bps",
    "explanation", "filing_url", "crosscheck_url", "retries", "successor_id", "client_intent_id",
  ].map((key) => [key, ""]));
  full.state = "MYSTERY";
  assert.throws(() => normalizeClaim(full), /unknown lifecycle state/);
});

test("receipt with missing status fails closed instead of assuming finality", () => {
  const result = receiptSucceeded({ txExecutionResultName: "FINISHED_WITH_RETURN" });
  assert.equal(result.finalized, false);
  assert.equal(result.executionSucceeded, true);
});

test("finality wait is followed by a canonical transaction read", async () => {
  const calls = [];
  const canonical = { statusName: "FINALIZED", txExecutionResultName: "SUCCESS" };
  const client = {
    async waitForTransactionReceipt(options) {
      calls.push(["wait", options]);
      return { transactionHash: options.hash };
    },
    async getTransaction(options) {
      calls.push(["get", options]);
      return canonical;
    },
  };
  assert.equal(await waitForCanonicalReceipt(client, "0xabc", "FINALIZED"), canonical);
  assert.deepEqual(calls, [
    ["wait", { hash: "0xabc", status: "FINALIZED", fullTransaction: false }],
    ["get", { hash: "0xabc" }],
  ]);
});

test("finalized execution error releases pending only after authoritative readback", () => {
  const storage = new Map([[PENDING_KEY, "pending"]]);
  storage.removeItem = storage.delete.bind(storage);
  const failed = { statusName: "FINALIZED", txExecutionResultName: "FINISHED_WITH_ERROR" };

  assert.equal(clearFinalizedFailure(storage, failed, false), false);
  assert.equal(storage.has(PENDING_KEY), true);
  assert.equal(clearFinalizedFailure(storage, failed, true), true);
  assert.equal(storage.has(PENDING_KEY), false);

  storage.set(PENDING_KEY, "pending");
  assert.equal(clearFinalizedFailure(storage, { ...failed, statusName: "ACCEPTED" }, true), false);
  assert.equal(storage.has(PENDING_KEY), true);
});
