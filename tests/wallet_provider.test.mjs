import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  STUDIONET_ADD_PARAMS,
  STUDIONET_CHAIN_ID,
  bindProviderListeners,
  connectSelectedProvider,
  createChooserLifecycle,
  createProviderRegistry,
  createWalletSessionGuard,
  ensureStudionet,
  isStudionetChain,
  setInlineWalletError,
  submitSessionWrite,
} from "../frontend/wallet.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111";

function fakeProvider(requestImpl = async () => null) {
  const calls = [];
  const listeners = new Map();
  return {
    calls,
    async request(payload) {
      calls.push(payload);
      return requestImpl(payload, calls.length);
    },
    on(name, handler) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(handler);
    },
    removeListener(name, handler) {
      listeners.get(name)?.delete(handler);
    },
    emit(name, payload) {
      for (const handler of listeners.get(name) || []) handler(payload);
    },
    listenerCount(name) {
      return listeners.get(name)?.size || 0;
    },
  };
}

function detail(uuid, provider, name = uuid) {
  const suffix = [...uuid]
    .map((character) => character.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12)
    .padEnd(12, "0");
  const validUuid = `00000000-0000-4000-8000-${suffix}`;
  return { info: { uuid: validUuid, name, rdns: `org.example.${uuid}` }, provider };
}

test("registry covers zero, one, and two valid EIP-6963 providers", () => {
  const registry = createProviderRegistry(null);
  assert.deepEqual(registry.options(), []);
  const first = fakeProvider();
  const second = fakeProvider();
  assert.equal(registry.announce(detail("first", first)), true);
  assert.deepEqual(registry.options().map((entry) => entry.provider), [first]);
  assert.equal(registry.announce(detail("second", second)), true);
  assert.deepEqual(registry.options().map((entry) => entry.provider), [first, second]);
});

test("registry rejects malformed announcements and deduplicates UUID plus provider identity", () => {
  const registry = createProviderRegistry(null);
  const first = fakeProvider();
  const replacement = fakeProvider();
  assert.equal(registry.announce({ info: { uuid: "not-a-uuid", name: "Bad", rdns: "org.bad" }, provider: first }), false);
  assert.equal(
    registry.announce({
      info: { uuid: "00000000-0000-1000-8000-000000000001", name: "UUIDv1", rdns: "org.uuid.v1" },
      provider: first,
    }),
    false,
  );
  registry.announce(detail("same-uuid", first, "First name"));
  registry.announce(detail("same-uuid", replacement, "Updated name"));
  registry.announce(detail("new-uuid", replacement, "Same object"));
  assert.equal(registry.options().length, 1);
  assert.equal(registry.options()[0].info.uuid, detail("new-uuid", replacement).info.uuid);
  assert.equal(registry.options()[0].provider, replacement);
});

test("registry normalizes UUIDv4 case before deduplicating", () => {
  const registry = createProviderRegistry(null);
  const first = fakeProvider();
  const replacement = fakeProvider();
  const lower = detail("case", first);
  registry.announce(lower);
  registry.announce({
    info: { ...lower.info, uuid: lower.info.uuid.toUpperCase(), name: "Updated" },
    provider: replacement,
  });
  assert.equal(registry.options().length, 1);
  assert.equal(registry.options()[0].provider, replacement);
  assert.equal(registry.options()[0].info.uuid, lower.info.uuid);
});

test("legacy provider is bounded fallback and disappears after first valid announcement", () => {
  const legacy = fakeProvider();
  const announced = fakeProvider();
  const registry = createProviderRegistry(legacy);
  assert.deepEqual(registry.options().map((entry) => entry.provider), [legacy]);
  registry.announce(detail("announced", announced));
  assert.deepEqual(registry.options().map((entry) => entry.provider), [announced]);
});

test("explicit selection requests accounts, switches Studionet, and binds the exact provider", async () => {
  const selected = fakeProvider(async ({ method }) => {
    if (method === "eth_requestAccounts") return [ACCOUNT];
    if (method === "wallet_switchEthereumChain") return null;
    throw new Error(`Unexpected method ${method}`);
  });
  const globalProvider = fakeProvider();
  let clientArgs;
  const result = await connectSelectedProvider(detail("selected", selected), async (...args) => {
    clientArgs = args;
    return { write: true };
  });
  assert.deepEqual(selected.calls.map(({ method }) => method), [
    "eth_requestAccounts",
    "wallet_switchEthereumChain",
  ]);
  assert.deepEqual(selected.calls[1].params, [{ chainId: STUDIONET_CHAIN_ID }]);
  assert.deepEqual(clientArgs, [selected, ACCOUNT]);
  assert.equal(result.provider, selected);
  assert.equal(globalProvider.calls.length, 0);
});

test("empty or malformed account fails before network switch and client creation", async () => {
  for (const accounts of [[], ["not-an-address"]]) {
    const provider = fakeProvider(async () => accounts);
    let created = false;
    await assert.rejects(
      connectSelectedProvider(detail("empty", provider), async () => { created = true; }),
      /no valid account/,
    );
    assert.equal(provider.calls.length, 1);
    assert.equal(created, false);
  }
});

test("unknown chain adds Studionet then retries switch", async () => {
  let switches = 0;
  const provider = fakeProvider(async ({ method }) => {
    if (method === "wallet_switchEthereumChain" && switches++ === 0) {
      throw Object.assign(new Error("unknown chain"), { code: 4902 });
    }
    return null;
  });
  await ensureStudionet(provider);
  assert.deepEqual(provider.calls.map(({ method }) => method), [
    "wallet_switchEthereumChain",
    "wallet_addEthereumChain",
    "wallet_switchEthereumChain",
  ]);
  assert.deepEqual(provider.calls[1].params, [STUDIONET_ADD_PARAMS]);
});

test("rejected connection and non-unknown switch errors never add a chain", async () => {
  const rejection = fakeProvider(async () => {
    throw Object.assign(new Error("User rejected"), { code: 4001 });
  });
  await assert.rejects(connectSelectedProvider(detail("reject", rejection), () => ({})), /User rejected/);

  const switchFailure = fakeProvider(async ({ method }) => {
    if (method === "eth_requestAccounts") return [ACCOUNT];
    throw Object.assign(new Error("Switch denied"), { code: 4001 });
  });
  await assert.rejects(connectSelectedProvider(detail("switch", switchFailure), () => ({})), /Switch denied/);
  assert.deepEqual(switchFailure.calls.map(({ method }) => method), [
    "eth_requestAccounts",
    "wallet_switchEthereumChain",
  ]);
});

test("account change/removal events are observed and every provider listener is cleaned up", () => {
  const provider = fakeProvider();
  const accountEvents = [];
  const chainEvents = [];
  const cleanup = bindProviderListeners(provider, {
    accountsChanged: (accounts) => accountEvents.push(accounts),
    chainChanged: (chain) => chainEvents.push(chain),
  });
  provider.emit("accountsChanged", [ACCOUNT]);
  provider.emit("accountsChanged", []);
  provider.emit("chainChanged", STUDIONET_CHAIN_ID);
  assert.deepEqual(accountEvents, [[ACCOUNT], []]);
  assert.deepEqual(chainEvents, [STUDIONET_CHAIN_ID]);
  cleanup();
  assert.equal(provider.listenerCount("accountsChanged"), 0);
  assert.equal(provider.listenerCount("chainChanged"), 0);
});

test("session guard clears active account/client on account changes and non-Studionet chains", () => {
  const provider = fakeProvider();
  const invalidations = [];
  const session = createWalletSessionGuard({
    provider,
    account: ACCOUNT,
    client: { write: true },
    onInvalidated: (event) => invalidations.push(event),
  });
  assert.equal(session.active.account, ACCOUNT);
  provider.emit("accountsChanged", ["0x2222222222222222222222222222222222222222"]);
  assert.equal(session.active, null);
  assert.equal(invalidations[0].type, "accountsChanged");
  session.cleanup();
  const removed = createWalletSessionGuard({
    provider,
    account: ACCOUNT,
    client: { write: true },
    onInvalidated: (event) => invalidations.push(event),
  });
  provider.emit("accountsChanged", []);
  assert.equal(removed.active, null);
  assert.deepEqual(invalidations.at(-1).accounts, []);
  removed.cleanup();
  const second = createWalletSessionGuard({
    provider,
    account: ACCOUNT,
    client: { write: true },
    onInvalidated: (event) => invalidations.push(event),
  });
  provider.emit("chainChanged", "0x1");
  assert.equal(second.active, null);
  assert.equal(invalidations.at(-1).type, "chainChanged");
  second.cleanup();
});

test("application write helper uses the selected session client, never a global fallback", async () => {
  const provider = fakeProvider();
  const selectedClient = { name: "selected" };
  const globalClient = { name: "global" };
  const session = createWalletSessionGuard({ provider, account: ACCOUNT, client: selectedClient });
  const usedClients = [];
  const hash = await submitSessionWrite(session, async (client, address, method, args) => {
    usedClients.push(client);
    assert.deepEqual([address, method, args], [ACCOUNT, "record", [1n]]);
    return "0xhash";
  }, ACCOUNT, "record", [1n]);
  assert.equal(hash, "0xhash");
  assert.deepEqual(usedClients, [selectedClient]);
  assert.equal(usedClients.includes(globalClient), false);
  session.cleanup();
  assert.throws(() => submitSessionWrite(session, () => null), /Choose a wallet provider/);
});

test("chain validation accepts only Studionet representations", () => {
  assert.equal(isStudionetChain(STUDIONET_CHAIN_ID), true);
  assert.equal(isStudionetChain("61999"), true);
  assert.equal(isStudionetChain(61999), true);
  assert.equal(isStudionetChain("0x1"), false);
});

class FakeElement {
  constructor() {
    this.disabled = false;
    this.hidden = false;
    this.inert = false;
    this.focused = false;
    this.listeners = new Map();
  }
  addEventListener(name, handler) { this.listeners.set(name, handler); }
  removeEventListener(name, handler) {
    if (this.listeners.get(name) === handler) this.listeners.delete(name);
  }
  dispatch(name, event = {}) { this.listeners.get(name)?.(event); }
  focus() { this.focused = true; }
  getAttribute() { return null; }
}

class FakeDialog extends FakeElement {
  constructor(focusables) {
    super();
    this.open = false;
    this.focusables = focusables;
  }
  querySelectorAll() { return this.focusables; }
  showModal() { this.open = true; }
  close() {
    this.open = false;
    this.dispatch("close");
  }
}

test("opening/cancelling chooser performs zero RPC, makes background inert, and restores focus", () => {
  const provider = fakeProvider();
  const first = new FakeElement();
  const cancel = new FakeElement();
  const dialog = new FakeDialog([first, cancel]);
  const background = new FakeElement();
  const opener = new FakeElement();
  const chooser = createChooserLifecycle({ dialog, backgroundElements: [background], schedule: (run) => run() });
  chooser.open(opener);
  assert.equal(provider.calls.length, 0);
  assert.equal(first.focused, true);
  assert.equal(background.inert, true);
  chooser.close();
  assert.equal(provider.calls.length, 0);
  assert.equal(background.inert, false);
  assert.equal(opener.focused, true);
});

test("chooser traps Tab and Shift+Tab and Escape closes it", () => {
  const first = new FakeElement();
  const last = new FakeElement();
  const dialog = new FakeDialog([first, last]);
  const chooser = createChooserLifecycle({ dialog, backgroundElements: [], schedule: (run) => run() });
  chooser.open(new FakeElement());
  let prevented = 0;
  dialog.dispatch("keydown", { key: "Tab", target: last, shiftKey: false, preventDefault: () => prevented++ });
  assert.equal(first.focused, true);
  dialog.dispatch("keydown", { key: "Tab", target: first, shiftKey: true, preventDefault: () => prevented++ });
  assert.equal(last.focused, true);
  dialog.dispatch("keydown", { key: "Escape", target: first, preventDefault: () => prevented++ });
  assert.equal(dialog.open, false);
  assert.equal(prevented, 3);
  chooser.destroy();
  assert.equal(dialog.listeners.size, 0);
});

test("permitted backdrop action closes the chooser", () => {
  const dialog = new FakeDialog([new FakeElement()]);
  const opener = new FakeElement();
  const chooser = createChooserLifecycle({ dialog, backgroundElements: [], schedule: (run) => run() });
  chooser.open(opener);
  dialog.dispatch("click", { target: dialog });
  assert.equal(dialog.open, false);
  assert.equal(opener.focused, true);
  chooser.destroy();
});

test("wallet errors are inline role-alert content and clear without markup injection", () => {
  const element = { textContent: "", hidden: true };
  setInlineWalletError(element, "Connection rejected");
  assert.equal(element.textContent, "Connection rejected");
  assert.equal(element.hidden, false);
  setInlineWalletError(element, null);
  assert.equal(element.hidden, true);
  const html = readFileSync(new URL("../frontend/index.html", import.meta.url), "utf8");
  assert.match(html, /id="wallet-error" role="alert"/);
});

test("fresh app state stays disconnected and discovery listener precedes provider request", () => {
  const source = readFileSync(new URL("../frontend/app.js", import.meta.url), "utf8");
  assert.match(source, /let selectedProvider = null;\s+let selectedAccount = null;\s+let writeClient = null;/);
  assert.ok(
    source.indexOf('addEventListener("eip6963:announceProvider"') <
      source.indexOf('dispatchEvent(new Event("eip6963:requestProvider"'),
  );
});
