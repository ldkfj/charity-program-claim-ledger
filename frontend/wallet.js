export const STUDIONET_CHAIN_ID = "0xf22f";

export const STUDIONET_ADD_PARAMS = Object.freeze({
  chainId: STUDIONET_CHAIN_ID,
  chainName: "GenLayer Studionet",
  nativeCurrency: Object.freeze({ name: "GEN Token", symbol: "GEN", decimals: 18 }),
  rpcUrls: Object.freeze(["https://studio.genlayer.com/api"]),
  blockExplorerUrls: Object.freeze(["https://explorer-studio.genlayer.com"]),
});

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function isInjectedProvider(provider) {
  return Boolean(
    provider &&
    typeof provider.request === "function" &&
    (provider.on === undefined || typeof provider.on === "function") &&
    (provider.removeListener === undefined || typeof provider.removeListener === "function"),
  );
}

function cleanText(value, maximum) {
  return typeof value === "string" && value.trim() && value.length <= maximum
    ? value.trim()
    : null;
}

export function normalizeAnnouncement(detail) {
  const uuid = cleanText(detail?.info?.uuid, 200);
  const name = cleanText(detail?.info?.name, 100);
  const rdns = cleanText(detail?.info?.rdns, 200);
  if (!uuid || !UUID_V4_PATTERN.test(uuid) || !name || !rdns || !isInjectedProvider(detail?.provider)) return null;
  return { info: { uuid: uuid.toLowerCase(), name, rdns }, provider: detail.provider };
}

export function createProviderRegistry(legacyProvider) {
  const announcements = [];
  const legacy = isInjectedProvider(legacyProvider)
    ? { info: { uuid: "legacy-injected", name: "Injected wallet", rdns: "legacy.injected" }, provider: legacyProvider }
    : null;

  return {
    announce(detail) {
      const normalized = normalizeAnnouncement(detail);
      if (!normalized) return false;
      const matchingIndexes = [];
      announcements.forEach((entry, index) => {
        if (entry.info.uuid === normalized.info.uuid || entry.provider === normalized.provider) {
          matchingIndexes.push(index);
        }
      });
      const insertionIndex = matchingIndexes[0] ?? announcements.length;
      for (let index = matchingIndexes.length - 1; index >= 0; index -= 1) {
        announcements.splice(matchingIndexes[index], 1);
      }
      announcements.splice(insertionIndex, 0, normalized);
      return true;
    },
    options() {
      return announcements.length ? [...announcements] : legacy ? [legacy] : [];
    },
  };
}

export function isWalletAccount(account) {
  return typeof account === "string" && ADDRESS_PATTERN.test(account);
}

function errorCodes(error) {
  const codes = new Set();
  let current = error;
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (current.code !== undefined) codes.add(Number(current.code));
    current = current.cause || current.data?.originalError || current.data;
  }
  return codes;
}

export function isUnknownChainError(error) {
  return errorCodes(error).has(4902);
}

export async function ensureStudionet(provider) {
  const switchRequest = {
    method: "wallet_switchEthereumChain",
    params: [{ chainId: STUDIONET_CHAIN_ID }],
  };
  try {
    await provider.request(switchRequest);
  } catch (error) {
    if (!isUnknownChainError(error)) throw error;
    await provider.request({ method: "wallet_addEthereumChain", params: [STUDIONET_ADD_PARAMS] });
    await provider.request(switchRequest);
  }
}

export async function connectSelectedProvider(detail, createClient) {
  if (!isInjectedProvider(detail?.provider)) throw new Error("The selected wallet provider is invalid.");
  const accounts = await detail.provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || !isWalletAccount(accounts[0])) {
    throw new Error("The wallet returned no valid account.");
  }
  await ensureStudionet(detail.provider);
  const account = accounts[0];
  return { provider: detail.provider, account, client: await createClient(detail.provider, account) };
}

export function bindProviderListeners(provider, handlers) {
  if (typeof provider.on !== "function" || typeof provider.removeListener !== "function") {
    return () => {};
  }
  const bindings = [
    ["accountsChanged", handlers.accountsChanged],
    ["chainChanged", handlers.chainChanged],
  ].filter(([, handler]) => typeof handler === "function");
  for (const [eventName, handler] of bindings) provider.on(eventName, handler);
  return () => {
    for (const [eventName, handler] of bindings) provider.removeListener(eventName, handler);
  };
}

export function createWalletSessionGuard({ provider, account, client, onInvalidated }) {
  let active = { provider, account, client };
  const cleanup = bindProviderListeners(provider, {
    accountsChanged(accounts) {
      active = null;
      onInvalidated?.({ type: "accountsChanged", accounts });
    },
    chainChanged(chainId) {
      if (!isStudionetChain(chainId)) {
        active = null;
        onInvalidated?.({ type: "chainChanged", chainId });
      }
    },
  });
  return {
    get active() { return active; },
    cleanup() {
      active = null;
      cleanup();
    },
  };
}

export function submitSessionWrite(session, submit, ...args) {
  const client = session?.active?.client;
  if (!client) throw new Error("Choose a wallet provider before writing.");
  return submit(client, ...args);
}

export function isStudionetChain(chainId) {
  if (typeof chainId === "number") return chainId === 61999;
  if (typeof chainId !== "string") return false;
  const normalized = chainId.toLowerCase();
  return normalized === STUDIONET_CHAIN_ID || normalized === "61999";
}

export function setInlineWalletError(element, error) {
  const message = error ? String(error.message || error) : "";
  element.textContent = message;
  element.hidden = !message;
}

export function createChooserLifecycle({ dialog, backgroundElements, schedule = queueMicrotask }) {
  let restoreFocus = null;
  let inertSnapshot = [];

  function focusableElements() {
    return [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
      (element) => !element.disabled && !element.hidden && element.getAttribute?.("aria-hidden") !== "true",
    );
  }

  function releaseModalState() {
    for (const [element, wasInert] of inertSnapshot) element.inert = wasInert;
    inertSnapshot = [];
    const target = restoreFocus;
    restoreFocus = null;
    target?.focus?.();
  }

  function close() {
    if (dialog.open) dialog.close();
    releaseModalState();
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = focusableElements();
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && event.target === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && event.target === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onCancel(event) {
    event.preventDefault();
    close();
  }

  function onBackdrop(event) {
    if (event.target === dialog) close();
  }

  dialog.addEventListener("keydown", onKeydown);
  dialog.addEventListener("cancel", onCancel);
  dialog.addEventListener("click", onBackdrop);
  dialog.addEventListener("close", releaseModalState);

  return {
    open(opener) {
      restoreFocus = opener || null;
      inertSnapshot = backgroundElements.map((element) => [element, Boolean(element.inert)]);
      for (const element of backgroundElements) element.inert = true;
      dialog.showModal();
      schedule(() => (focusableElements()[0] || dialog).focus());
    },
    close,
    destroy() {
      dialog.removeEventListener("keydown", onKeydown);
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("click", onBackdrop);
      dialog.removeEventListener("close", releaseModalState);
      close();
    },
  };
}
