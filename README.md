# Charity Program Claim Ledger

Charity Program Claim Ledger freezes a public charity claim and records how the exact IRS Form 990 filing supports, qualifies, or contradicts it.

## Verified links

- Live app: pending Studionet deployment
- Studionet contract and Explorer: pending deployment
- Network target: Studionet, chain ID `61999`

## Trust problem

Donors and public-interest researchers can see a charity claim, but the claimant controls its wording while filing data is long, period-specific, and easy to cite selectively. A later web edit can also erase what was originally claimed. The ledger binds the exact claim text to one EIN, tax period, IRS Object ID, and comparison template before assessment.

## Why GenLayer is essential

The decisive step requires reading an IRS Form 990 PDF and, for narrative claims, interpreting Part III and Schedule O in context. A GenLayer Intelligent Contract fetches the fixed IRS source plus a fixed ProPublica identity cross-check, uses an LLM to extract filing facts, and asks validators to rerun the complete evidence review independently. Deterministic contract code then calculates numeric ratios and applies the verdict thresholds before storing the consensus result on chain.

## How it works

1. Anyone reads an existing claim without connecting a wallet.
2. A registrant explicitly chooses a wallet, freezes the claim and its filing identity, then the frontend resolves the new claim ID through the wallet-bound client intent.
3. A user requests assessment. The contract retrieves the fixed evidence, reaches validator consensus, and records `ASSESSED` or `UNRESOLVED`.
4. An unresolved assessment can be retried at most twice. An assessed claim can link to a newer assessed successor for the same EIN and template.

The verdict is documentary. It is not a fraud finding, charity rating, endorsement, or custody decision.

## Architecture

- `contracts/charity_claim_ledger.py` is the source of truth for claims, lifecycle rules, evidence URLs, consensus, deterministic numeric evaluation, and intent-to-claim mapping.
- `frontend/` is a dependency-light browser client for public reads and explicitly selected EIP-1193 wallets.
- `tests/` contains contract behavior tests and frontend boundary tests.
- IRS Form 990 is the primary evidence. ProPublica is an identity and filing-period cross-check, not a replacement source.

There is no backend database and no off-chain authoritative claim state.

## Intelligent Contract

The public write methods are `register_claim`, `assess_claim`, `retry_assessment`, `link_successor`, and `upgrade`. Views are `get_claim`, `get_claim_count`, and `get_claim_id_by_intent`.

Claims move through:

```text
FROZEN -> ASSESSED
FROZEN -> UNRESOLVED -> ASSESSED | UNRESOLVED
ASSESSED -> SUPERSEDED
```

The supported templates are `PROGRAM_SERVICE_SHARE`, `FUNDRAISING_SHARE`, and `NAMED_PROGRAM_SCOPE`. Numeric templates use integer basis points. Validator equivalence compares the consequential extracted facts and normalized decision fields after each validator independently fetches and analyzes both fixed sources.

This project has no token, payout, staking, fee-sharing, or other economic value flow.

## Transaction lifecycle

The frontend never auto-selects an injected wallet. Before signing, it stores a client intent locally. After submission it waits for explicit `FINALIZED`, requires successful leader execution, and performs authoritative contract readback. An unknown submission state remains pending: reconciliation checks authoritative state first and may resubmit only the exact stored action and arguments when no effect is found. Registration and retry are duplicate-safe through wallet-bound client intents; assessment is guarded by lifecycle state; and retry readback also compares the stored prior retry count. Registration never guesses an ID from the global claim count.

## Run locally

Prerequisites already used for this revision are Node.js 22, Python 3.13, and an existing GenLayer CLI/GenVM lint installation. No package installation is required.

```powershell
npm run serve
```

Open `http://localhost:4173/frontend/`, enter a real deployed Studionet contract address, and use public lookup or explicitly choose a wallet for writes. The app intentionally ships without a placeholder contract address or `.env` requirement.

## Tests and verification

```powershell
$env:PYTHONUTF8='1'
py -3.13 -m pytest tests -q --disable-warnings --cache-clear
npm run test:frontend
node --check frontend/app.js
node --check frontend/core.js
node --check frontend/rpc.js
$env:GENVM_VERSION='v0.3.0-rc7'
genvm-lint check contracts/charity_claim_ledger.py --json
```

Current local result: 22 contract behavior tests passed, 9 frontend tests passed, JavaScript syntax checks passed, and GenVM lint plus semantic validation passed. Live Studionet evidence is intentionally not claimed yet.

## Deployment

The release target is Studionet only:

- RPC: `https://studio.genlayer.com/api`
- Chain ID: `61999`
- Explorer: `https://explorer-studio.genlayer.com`

The contract is classified `UPGRADABLE`. Its constructor records the Studio deployment sender as the upgrader, and `upgrade` replaces the Root Slot code under GenVM's locked-slot authorization. Storage field order and types must remain compatible across upgrades. Deployment is gated on an exact-source anonymous review, recorded Studio deployer/upgrader account, source-hash capture, Explorer verification, live write-path evidence, a separate safe upgrade rehearsal, and frontend configuration with the real contract address. No deployment has been made for this revision.

## Security and trust boundaries

- Evidence hosts and paths are constructed by the contract; claimants cannot supply a replacement URL.
- An unavailable, rate-limited, unusable, or validator-disputed source cannot become a positive or adverse factual verdict.
- LLM output does not control numeric arithmetic or thresholds.
- Client receipts and SDK payload casing are treated as untrusted; writes require finality, successful execution, and readback.
- Wallet choice is explicit, and public reads require no wallet.
- The contract records a bounded filing comparison, not truth about the charity beyond that filing.
- Upgrade authority is limited to the recorded Studio account. If that account becomes unavailable, the contract cannot be upgraded; if Studionet resets, its address and state cannot be recovered and a replacement must be deployed from the recorded source and manifest.

## Known limitations

- Current IRS PDF rendering and ProPublica access still require a live Studionet probe before deployment approval.
- Filing layouts and narrative quality vary; unusable evidence resolves to `UNRESOLVED` rather than a guessed verdict.
- The frontend depends on the deployed Studionet receipt shape and will fail closed if explicit finality or execution success is absent.
- No live contract, Explorer transaction, deployed-source parity record, or public app URL exists yet.
