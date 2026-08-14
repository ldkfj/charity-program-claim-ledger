import { createClient } from "https://esm.sh/genlayer-js@1.1.8";
import { studionet } from "https://esm.sh/genlayer-js@1.1.8/chains";
import { TransactionStatus } from "https://esm.sh/genlayer-js@1.1.8/types";
import { waitForCanonicalReceipt } from "./core.js";

export const readClient = createClient({ chain: studionet });

export function createWalletClient(provider, account) {
  return createClient({ chain: studionet, account, provider });
}

export async function readClaim(address, claimId) {
  return readClient.readContract({
    address,
    functionName: "get_claim",
    args: [claimId],
  });
}

export async function readClaimIdByIntent(address, registrant, clientIntentId) {
  return readClient.readContract({
    address,
    functionName: "get_claim_id_by_intent",
    args: [registrant, clientIntentId],
  });
}

export async function submitWrite(client, address, functionName, args) {
  return client.writeContract({
    address,
    functionName,
    args,
    value: 0n,
  });
}

export async function waitFinalized(hash) {
  return waitForCanonicalReceipt(readClient, hash, TransactionStatus.FINALIZED);
}
