# Charity Program Claim Ledger

Charity Program Claim Ledger freezes a public charity claim and records how the exact IRS Form 990 filing supports, qualifies, or contradicts it.

## Verified links

- Live app: https://charity-program-claim-ledger.vercel.app
- Studionet contract: `0xa5754435B7411Faa56de25D1311Ff2E3B4356b2B`
- Explorer: https://explorer-studio.genlayer.com/address/0xa5754435B7411Faa56de25D1311Ff2E3B4356b2B
- Network target: Studionet, chain ID `61999`

## Trust problem

Donors and public-interest researchers can see a charity claim, but the claimant controls its wording while filing data is long, period-specific, and easy to cite selectively. A later web edit can also erase what was originally claimed. The ledger binds the exact claim text to one EIN, tax period, IRS Object ID, and comparison template before assessment.

## Why GenLayer is essential

The decisive step requires reading an IRS Form 990 and, for narrative claims, interpreting Part III and Schedule O in context. A GenLayer Intelligent Contract fetches the Object-ID-bound IRS filing rendering plus a fixed ProPublica identity cross-check. Numeric Part IX values are extracted deterministically; an LLM evaluates only bounded narrative evidence. Validators independently refetch and rederive the complete consequential result before it is stored on chain.

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
- The IRS Form 990 content rendered by ProPublica is the primary evidence. ProPublica's organization API is the structured EIN and filing-period cross-check.

There is no backend database and no off-chain authoritative claim state.

## Intelligent Contract

The public write methods are `register_claim`, `assess_claim`, `retry_assessment`, `link_successor`, and `upgrade`. Views are `get_claim`, `get_claim_count`, and `get_claim_id_by_intent`.

Claims move through:

```text
FROZEN -> ASSESSED
FROZEN -> UNRESOLVED -> ASSESSED | UNRESOLVED
ASSESSED -> SUPERSEDED
```

The supported templates are `PROGRAM_SERVICE_SHARE`, `FUNDRAISING_SHARE`, and `NAMED_PROGRAM_SCOPE`. Numeric templates use integer basis points and deterministic Part IX extraction. Validator equivalence compares the consequential facts and normalized decision fields after each validator independently fetches and analyzes the fixed evidence.

This project has no token, payout, staking, fee-sharing, or other economic value flow.

## Transaction lifecycle

The frontend never auto-selects an injected wallet. Before signing, it stores a client intent locally. After submission it waits for explicit `FINALIZED`, requires successful leader execution, and performs authoritative contract readback. An unknown submission state remains pending: reconciliation checks authoritative state first and may resubmit only the exact stored action and arguments when no effect is found. Registration and retry are duplicate-safe through wallet-bound client intents; assessment is guarded by lifecycle state; and retry readback also compares the stored prior retry count. Registration never guesses an ID from the global claim count.

## Run locally

Prerequisites already used for this revision are Node.js 22, Python 3.13, and an existing GenLayer CLI/GenVM lint installation. No package installation is required.

```powershell
npm run serve
```

Open `http://localhost:4173/frontend/` and use public lookup or explicitly choose a wallet for writes. The verified release address is preloaded; no `.env` file is required.

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

Current local result: 32 contract behavior tests passed, 29 frontend tests passed, JavaScript syntax checks passed, and GenVM lint plus semantic validation passed. The remediated contract source is deployed with byte-for-byte parity. The complete Studionet contract matrix passed, including invalid input, threshold boundaries, all three templates, replay safety, authorization controls, and isolated upgrade recovery.

## Deployment

The release target is Studionet only:

- RPC: `https://studio.genlayer.com/api`
- Chain ID: `61999`
- Explorer: `https://explorer-studio.genlayer.com`

The contract is classified `UPGRADABLE`. Its constructor records the deployment sender as the upgrader, and `upgrade` replaces the Root Slot code under GenVM's locked-slot authorization. Storage field order and types must remain compatible across upgrades. Exact-source PRE_DEPLOY review approved commit `56a93a329403ac6ad94770380a1c1e6acbf68588`; transaction `0xd0118fde73e016cf6dee278866251cc656cd83350c1cb35712fe3fef30165336` deployed the reviewed source to `0xa5754435B7411Faa56de25D1311Ff2E3B4356b2B`. Readback shows `FINALIZED`, leader `SUCCESS`, no disagreeing validator vote, and deployed source parity at 26,893 bytes / SHA-256 `df1636384d1037575c4eec9d9d902fdc4db528d212bb5109958339806efecc24`.

## Security and trust boundaries

- Evidence hosts and paths are constructed by the contract; claimants cannot supply a replacement URL.
- An unavailable, rate-limited, unusable, or validator-disputed source cannot become a positive or adverse factual verdict.
- LLM output does not control numeric arithmetic or thresholds.
- Client receipts and SDK payload casing are treated as untrusted; writes require finality, successful execution, and readback.
- Wallet choice is explicit, and public reads require no wallet.
- The contract records a bounded filing comparison, not truth about the charity beyond that filing.
- Upgrade authority is limited to the recorded Studio account. If that account becomes unavailable, the contract cannot be upgraded; if Studionet resets, its address and state cannot be recovered and a replacement must be deployed from the recorded source and manifest.

## Known limitations

- The Object-ID-bound full-text route, matching organization identity, threshold matrix, all supported templates, negative controls, replay behavior, and isolated upgrade rehearsal passed with terminal receipts and authoritative readback. The pre-release tree passed anonymous `POST_DEPLOY_TEST`; the rewritten final Git identity revision still requires the final exact-revision review before submission.
- Filing layouts and narrative quality vary; unusable evidence resolves to `UNRESOLVED` rather than a guessed verdict.
- The frontend depends on the deployed Studionet receipt shape and will fail closed if explicit finality or execution success is absent.
- The accepted release contract, expanded live proof matrix, public hosting, and user-signed production Vercel E2E evidence are complete.
