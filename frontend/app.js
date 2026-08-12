import {
  CONTRACT_KEY,
  PENDING_KEY,
  isContractAddress,
  makePendingIntent,
  normalizeClaim,
  parsePendingIntent,
  positiveId,
  receiptSucceeded,
  registrationArgs,
  toDisplay,
} from "./core.js";
import {
  createWalletClient,
  readClaim,
  readClaimIdByIntent,
  submitWrite,
  waitFinalized,
} from "./rpc.js";

const byId = (id) => document.getElementById(id);
const contractInput = byId("contract-address");
const readStatus = byId("read-status");
const writeStatus = byId("write-status");
const walletDialog = byId("wallet-dialog");
const providerList = byId("provider-list");
const providers = new Map();

let selectedProvider = null;
let selectedAccount = null;
let writeClient = null;

function status(element, message, tone = "neutral") {
  element.dataset.tone = tone;
  element.replaceChildren(Object.assign(document.createElement("p"), { textContent: message }));
}

function contractAddress() {
  const address = contractInput.value.trim();
  if (!isContractAddress(address)) {
    contractInput.setAttribute("aria-invalid", "true");
    contractInput.focus();
    throw new Error("Enter a valid deployed contract address before continuing.");
  }
  contractInput.removeAttribute("aria-invalid");
  return address;
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.dataset.state = busy ? "loading" : "default";
  if (label) button.textContent = label;
}

function renderClaim(raw) {
  const claim = normalizeClaim(raw);
  byId("claim-sheet").hidden = false;
  byId("claim-number").textContent = `#${toDisplay(claim.claim_id)}`;
  byId("claim-verdict").textContent = claim.verdict || claim.state;
  byId("claim-text").textContent = claim.claim_text;
  byId("claim-explanation").textContent = claim.explanation || "Assessment has not been completed.";
  byId("filing-link").href = claim.filing_url;
  byId("crosscheck-link").href = claim.crosscheck_url;

  const facts = [
    ["Lifecycle state", claim.state],
    ["EIN", claim.ein],
    ["Tax period", claim.tax_period],
    ["IRS Object ID", claim.object_id],
    ["Template", claim.template],
    ["Claimed basis points", claim.claimed_bps],
    ["Filing numerator", claim.numerator],
    ["Filing denominator", claim.denominator],
    ["Calculated basis points", claim.calculated_bps],
    ["Retries used", claim.retries],
    ["Successor claim", claim.successor_id],
    ["Client intent ID", claim.client_intent_id],
    ["Registrant", claim.registrant],
  ];
  const list = byId("claim-facts");
  list.replaceChildren();
  for (const [label, value] of facts) {
    const row = document.createElement("div");
    const term = Object.assign(document.createElement("dt"), { textContent: label });
    const detail = Object.assign(document.createElement("dd"), { textContent: toDisplay(value) });
    row.append(term, detail);
    list.append(row);
  }
  return claim;
}

async function loadClaim(id, target = readStatus) {
  status(target, "Reading authoritative contract state…");
  const claim = renderClaim(await readClaim(contractAddress(), id));
  status(target, `Claim #${toDisplay(claim.claim_id)} read from Studionet.`, "success");
  return claim;
}

function pendingIntent() {
  try {
    return parsePendingIntent(localStorage.getItem(PENDING_KEY));
  } catch (error) {
    status(writeStatus, error.message, "error");
    return { invalid: true };
  }
}

function refreshPendingControl() {
  const pending = pendingIntent();
  const button = byId("reconcile-button");
  button.hidden = !pending;
  document.querySelectorAll(".write-form button, .compact-form button").forEach((control) => {
    control.disabled = Boolean(pending);
  });
  if (pending && !pending.invalid) {
    status(
      writeStatus,
      pending.txHash
        ? `A ${pending.action} transaction is pending reconciliation: ${pending.txHash}`
        : `A ${pending.action} signing attempt has an unknown submission state. Do not retry yet.`,
    );
  }
}

async function authoritativeReadback(intent) {
  const address = intent.contractAddress;
  if (intent.action === "register_claim") {
    const claimId = BigInt(
      await readClaimIdByIntent(address, intent.expected.registrant, intent.expected.clientIntentId),
    );
    if (claimId <= 0n) throw new Error("Finalized receipt has no claim bound to this client intent.");
    const claim = normalizeClaim(await readClaim(address, claimId));
    if (
      claim.state !== "FROZEN" ||
      claim.ein !== intent.args[0] ||
      claim.object_id !== intent.args[2] ||
      claim.client_intent_id !== intent.expected.clientIntentId
    ) {
      throw new Error("New claim readback does not match the frozen registration intent.");
    }
    renderClaim(claim);
    return `Claim #${claimId} is finalized and frozen on-chain.`;
  }

  const primaryId = BigInt(intent.args[0]);
  const claim = normalizeClaim(await readClaim(address, primaryId));
  renderClaim(claim);
  if (intent.action === "assess_claim" && !["ASSESSED", "UNRESOLVED"].includes(claim.state)) {
    throw new Error("Assessment receipt finalized but claim state did not advance.");
  }
  if (intent.action === "retry_assessment" && !["ASSESSED", "UNRESOLVED"].includes(claim.state)) {
    throw new Error("Retry receipt finalized but claim state is not authoritative.");
  }
  if (intent.action === "link_successor") {
    if (claim.state !== "SUPERSEDED" || BigInt(claim.successor_id) !== BigInt(intent.args[1])) {
      throw new Error("Successor link readback does not match the submitted intent.");
    }
  }
  return `Transaction finalized; claim #${primaryId} readback is ${claim.state}.`;
}

async function reconcile(intent = pendingIntent()) {
  if (!intent || intent.invalid) return;
  if (!intent.txHash) {
    throw new Error("No transaction hash is available. Inspect the wallet activity before any retry.");
  }
  status(writeStatus, "Waiting for FINALIZED consensus…");
  const receipt = await waitFinalized(intent.txHash);
  const outcome = receiptSucceeded(receipt);
  if (!outcome.finalized) throw new Error("Receipt is not explicitly FINALIZED.");
  if (!outcome.executionSucceeded) {
    throw new Error(`Finalized transaction execution was ${outcome.execution || "not successful"}.`);
  }
  status(writeStatus, "Execution succeeded. Reading authoritative state…");
  const message = await authoritativeReadback(intent);
  localStorage.removeItem(PENDING_KEY);
  refreshPendingControl();
  status(writeStatus, message, "success");
}

function isUserRejection(error) {
  const message = String(error?.message || error).toLowerCase();
  return message.includes("user rejected") || message.includes("user denied") || error?.code === 4001;
}

async function executeWrite(action, args, expected = {}) {
  if (pendingIntent()) throw new Error("Reconcile the existing pending write before sending another.");
  if (!writeClient || !selectedAccount) throw new Error("Choose a wallet provider before writing.");
  const address = contractAddress();
  const intent = makePendingIntent({ contractAddress: address, action, args, expected });
  localStorage.setItem(PENDING_KEY, JSON.stringify(intent));
  refreshPendingControl();
  status(writeStatus, "Requesting an explicit wallet signature…");
  try {
    intent.txHash = await submitWrite(writeClient, address, action, args);
    localStorage.setItem(PENDING_KEY, JSON.stringify(intent));
    refreshPendingControl();
    await reconcile(intent);
  } catch (error) {
    if (!intent.txHash && isUserRejection(error)) {
      localStorage.removeItem(PENDING_KEY);
      refreshPendingControl();
    }
    throw error;
  }
}

function announceProvider(detail) {
  const key = detail.info?.uuid || detail.info?.rdns || detail.info?.name;
  if (key && detail.provider) providers.set(key, detail);
}

window.addEventListener("eip6963:announceProvider", (event) => announceProvider(event.detail));
window.dispatchEvent(new Event("eip6963:requestProvider"));
if (window.ethereum) {
  providers.set("legacy-injected", {
    info: { name: "Injected wallet", rdns: "legacy.injected" },
    provider: window.ethereum,
  });
}

function renderProviders() {
  providerList.replaceChildren();
  if (providers.size === 0) {
    providerList.append(
      Object.assign(document.createElement("p"), {
        textContent: "No injected wallet provider was detected. Install or enable one, then reopen this chooser.",
      }),
    );
    return;
  }
  for (const detail of providers.values()) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "button provider-option";
    option.textContent = detail.info.name || "Unnamed wallet";
    option.addEventListener("click", () => connectProvider(detail));
    providerList.append(option);
  }
}

async function connectProvider(detail) {
  try {
    const accounts = await detail.provider.request({ method: "eth_requestAccounts" });
    if (!Array.isArray(accounts) || !accounts[0]) throw new Error("The wallet returned no account.");
    selectedProvider = detail.provider;
    selectedAccount = accounts[0];
    writeClient = await createWalletClient(selectedProvider, selectedAccount);
    selectedProvider.on?.("accountsChanged", handleAccountsChanged);
    selectedProvider.on?.("chainChanged", handleChainChanged);
    byId("wallet-status").textContent = `${detail.info.name}: ${selectedAccount}`;
    byId("wallet-button").textContent = "Switch wallet";
    byId("disconnect-button").hidden = false;
    walletDialog.close();
  } catch (error) {
    status(writeStatus, `Wallet was not connected: ${error.message}`, "error");
  }
}

function disconnectWallet() {
  selectedProvider?.removeListener?.("accountsChanged", handleAccountsChanged);
  selectedProvider?.removeListener?.("chainChanged", handleChainChanged);
  selectedProvider = null;
  selectedAccount = null;
  writeClient = null;
  byId("wallet-status").textContent = "No wallet selected.";
  byId("wallet-button").textContent = "Choose wallet";
  byId("disconnect-button").hidden = true;
}

function handleAccountsChanged(accounts) {
  if (!accounts?.[0]) return disconnectWallet();
  selectedAccount = null;
  writeClient = null;
  byId("wallet-status").textContent = "Wallet account changed. Choose the provider again to confirm it.";
}

function handleChainChanged() {
  writeClient = null;
  byId("wallet-status").textContent = "Wallet network changed. Choose the provider again to confirm Studionet.";
}

byId("contract-form").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const address = contractAddress();
    localStorage.setItem(CONTRACT_KEY, address);
    status(readStatus, "Studionet contract address saved for this browser.", "success");
  } catch (error) {
    status(readStatus, error.message, "error");
  }
});

byId("search-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = byId("lookup-button");
  setBusy(button, true, "Reading claim…");
  try {
    await loadClaim(positiveId(byId("claim-id").value));
  } catch (error) {
    status(readStatus, error.message, "error");
  } finally {
    setBusy(button, false, "Read claim");
  }
});

byId("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  setBusy(button, true, "Registering claim…");
  try {
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const clientIntentId = crypto.randomUUID();
    const args = [...registrationArgs(values), clientIntentId];
    await executeWrite("register_claim", args, {
      registrant: selectedAccount,
      clientIntentId,
    });
    event.currentTarget.reset();
  } catch (error) {
    status(writeStatus, error.message, "error");
  } finally {
    setBusy(button, false, "Register claim");
  }
});

byId("assess-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  const action = button.value === "retry" ? "retry_assessment" : "assess_claim";
  setBusy(button, true, action === "assess_claim" ? "Assessing claim…" : "Retrying assessment…");
  try {
    const claimId = positiveId(new FormData(event.currentTarget).get("claimId"));
    const current = normalizeClaim(await readClaim(contractAddress(), claimId));
    if (action === "assess_claim" && current.state !== "FROZEN") {
      throw new Error("Authoritative readback must show FROZEN before assessment.");
    }
    if (action === "retry_assessment" && current.state !== "UNRESOLVED") {
      throw new Error("Authoritative readback must show UNRESOLVED before retry.");
    }
    await executeWrite(action, [claimId]);
  } catch (error) {
    status(writeStatus, error.message, "error");
  } finally {
    setBusy(button, false, action === "assess_claim" ? "Assess claim" : "Retry unresolved");
  }
});

byId("successor-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.submitter;
  setBusy(button, true, "Linking successor…");
  try {
    const data = new FormData(event.currentTarget);
    const oldId = positiveId(data.get("oldId"));
    const newId = positiveId(data.get("newId"));
    await executeWrite("link_successor", [oldId, newId]);
  } catch (error) {
    status(writeStatus, error.message, "error");
  } finally {
    setBusy(button, false, "Link successor");
  }
});

byId("wallet-button").addEventListener("click", () => {
  renderProviders();
  walletDialog.showModal();
});
byId("wallet-cancel").addEventListener("click", () => walletDialog.close());
byId("disconnect-button").addEventListener("click", disconnectWallet);
byId("reconcile-button").addEventListener("click", async () => {
  try {
    await reconcile();
  } catch (error) {
    status(writeStatus, error.message, "error");
  }
});
byId("template").addEventListener("change", (event) => {
  if (event.target.value === "NAMED_PROGRAM_SCOPE") byId("claimed-bps").value = "0";
});

const savedAddress = localStorage.getItem(CONTRACT_KEY);
if (savedAddress && isContractAddress(savedAddress)) contractInput.value = savedAddress;
refreshPendingControl();
