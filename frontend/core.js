export const PENDING_KEY = "charity-ledger.pending-write.v1";
export const CONTRACT_KEY = "charity-ledger.contract-address.v1";

export function isContractAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || "").trim());
}

export function positiveId(value) {
  const text = String(value || "").trim();
  if (!/^[1-9][0-9]*$/.test(text)) throw new Error("Claim ID must be a positive whole number.");
  return BigInt(text);
}

export function registrationArgs(form) {
  const ein = String(form.ein || "").trim();
  const taxPeriod = String(form.taxPeriod || "").trim();
  const objectId = String(form.objectId || "").trim();
  const template = String(form.template || "");
  const claimText = String(form.claimText || "").trim();
  const claimedBps = String(form.claimedBps || "").trim();

  if (!/^\d{9}$/.test(ein)) throw new Error("EIN must contain exactly 9 digits.");
  if (!/^\d{6}$/.test(taxPeriod)) throw new Error("Tax period must use YYYYMM.");
  const month = Number(taxPeriod.slice(4));
  if (month < 1 || month > 12) throw new Error("Tax period month must be from 01 to 12.");
  if (!/^\d{8,32}$/.test(objectId)) throw new Error("IRS Object ID must contain 8–32 digits.");
  if (!["PROGRAM_SERVICE_SHARE", "FUNDRAISING_SHARE", "NAMED_PROGRAM_SCOPE"].includes(template)) {
    throw new Error("Choose one supported assessment template.");
  }
  if (claimText.length < 12 || claimText.length > 600) {
    throw new Error("Claim text must contain 12–600 characters.");
  }
  if (!/^\d+$/.test(claimedBps)) throw new Error("Claimed basis points must be a whole number.");
  const bps = BigInt(claimedBps);
  if (bps > 10000n) throw new Error("Claimed basis points cannot exceed 10000.");
  if (template === "NAMED_PROGRAM_SCOPE" && bps !== 0n) {
    throw new Error("Named-program scope must use 0 basis points.");
  }
  return [ein, taxPeriod, objectId, template, claimText, bps];
}

export function toDisplay(value) {
  if (typeof value === "bigint") return value.toString();
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function normalizeClaim(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("The contract returned an invalid claim payload.");
  }
  const required = [
    "claim_id", "registrant", "ein", "tax_period", "object_id", "template",
    "claim_text", "claimed_bps", "state", "verdict", "numerator", "denominator",
    "calculated_bps", "explanation", "filing_url", "crosscheck_url", "retries",
    "successor_id", "client_intent_id",
  ];
  for (const key of required) {
    if (!(key in raw)) throw new Error(`The claim payload is missing ${key}.`);
  }
  const state = String(raw.state);
  if (!["FROZEN", "ASSESSED", "UNRESOLVED", "SUPERSEDED"].includes(state)) {
    throw new Error("The claim payload contains an unknown lifecycle state.");
  }
  return Object.fromEntries(required.map((key) => [key, raw[key]]));
}

export function makePendingIntent({ contractAddress, action, args, expected }) {
  const jsonSafe = (value) => {
    if (typeof value === "bigint") return value.toString();
    if (Array.isArray(value)) return value.map(jsonSafe);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]));
    }
    return value;
  };
  return {
    version: 1,
    contractAddress,
    action,
    args: jsonSafe(args),
    expected: jsonSafe(expected),
    txHash: null,
    createdAt: new Date().toISOString(),
  };
}

export function parsePendingIntent(serialized) {
  if (!serialized) return null;
  const value = JSON.parse(serialized);
  const arity = {
    register_claim: 7,
    assess_claim: 1,
    retry_assessment: 2,
    link_successor: 2,
  };
  if (
    value?.version !== 1 ||
    !isContractAddress(value.contractAddress) ||
    !Object.hasOwn(arity, value.action) ||
    !Array.isArray(value.args) ||
    value.args.length !== arity[value.action] ||
    !value.expected ||
    typeof value.expected !== "object" ||
    (value.txHash !== null && (typeof value.txHash !== "string" || value.txHash.length < 3)) ||
    typeof value.createdAt !== "string"
  ) {
    throw new Error("The saved pending-write record is invalid.");
  }
  if (
    value.action === "register_claim" &&
    (!isContractAddress(value.expected.registrant) ||
      value.expected.clientIntentId !== value.args[6])
  ) {
    throw new Error("The saved registration intent is invalid.");
  }
  if (
    value.action === "retry_assessment" &&
    (!/^[0-2]$/.test(String(value.expected.previousRetries)) ||
      value.expected.clientIntentId !== value.args[1])
  ) {
    throw new Error("The saved retry baseline is invalid.");
  }
  return value;
}

export function receiptSucceeded(receipt) {
  const finalStatus = String(receipt?.statusName ?? receipt?.status ?? "").toUpperCase();
  const execution = String(
    receipt?.txExecutionResultName ?? receipt?.executionResultName ?? "",
  ).toUpperCase();
  return {
    finalized: finalStatus === "FINALIZED",
    executionSucceeded: execution === "FINISHED_WITH_RETURN" || execution === "SUCCESS",
    execution,
  };
}
