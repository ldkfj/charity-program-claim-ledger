import { createClient } from "https://esm.sh/genlayer-js@1.1.8";
import { studionet } from "https://esm.sh/genlayer-js@1.1.8/chains";
import { TransactionStatus } from "https://esm.sh/genlayer-js@1.1.8/types";

export const readClient = createClient({ chain: studionet });

export async function createWalletClient(provider, account) {
  const client = createClient({ chain: studionet, account, provider });
  await client.connect("studionet");
  return client;
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
  return readClient.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    fullTransaction: false,
  });
}
