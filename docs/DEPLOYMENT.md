# Deployment and Recovery Record

## PRE_DEPLOY classification

- Project: Charity Program Claim Ledger
- Submission category: `PROJECT`
- Contract: `CharityProgramClaimLedger`
- Classification: `UPGRADABLE`
- Intended network: Studionet
- RPC: `https://studio.genlayer.com/api`
- Chain ID: `61999`
- Explorer: `https://explorer-studio.genlayer.com`
- Constructor arguments: none
- Linked contracts: none
- Configuration transactions: none
- Contract source SHA-256: `df1636384d1037575c4eec9d9d902fdc4db528d212bb5109958339806efecc24`
- Source bytes: `26893`
- Exact reviewed commit: `56a93a329403ac6ad94770380a1c1e6acbf68588`
- Selected deployer/upgrader: `0x09Cdd3BeE61e0080cBD00ad61Bc1b44D3f1F289a`
- Deployment transaction: `0xd0118fde73e016cf6dee278866251cc656cd83350c1cb35712fe3fef30165336`
- Release contract: `0xa5754435B7411Faa56de25D1311Ff2E3B4356b2B`
- Explorer: https://explorer-studio.genlayer.com/address/0xa5754435B7411Faa56de25D1311Ff2E3B4356b2B

The primary AI selected the Task-local Studio account above after anonymous `PRE_DEPLOY` approval and used it as deployer and Root Slot upgrader. No account, credential, contract address, or deployment evidence from another Task was reused.

## Accepted deployment evidence

The fresh deployment transaction is `FINALIZED`; leader execution is `SUCCESS`; its recorded votes contain three `agree`, two `idle`, and no disagreement; and `from_address` equals the selected deployer. Contract-code readback decodes to exactly 26,893 bytes and the approved SHA-256 above. The earlier addresses `0x07Bca9edBCBEA28A4A3452126832cf5CE7962452`, `0x05FCf32aCa5265D733D4524D4346fDF4277fE100`, `0x18e78e546dEB4ABb28D7B4f306D056E860CE32b6`, and `0x33297B6C682B4FcE63bd0d26fd6842B79FB8a07B` are superseded diagnostic deployments and are not release evidence.

## Studionet live evidence ledger

The locked account `0x09Cdd3BeE61e0080cBD00ad61Bc1b44D3f1F289a` acted as deployer, upgrader, registrant, assessor, retry caller, and authorized successor caller. The negative authorization account was `0x458766D23AE2a78a89d09E19D9a06690a5586607`. Every PASS row has terminal receipt classification and authoritative pre/post readback; `3A/2I` means three `agree`, two `idle`, and no disagreement.

| Case | Caller role | Exact arguments | Expected | Receipt / consensus | Authoritative pre → post | Result |
|---|---|---|---|---|---|---|
| Deploy release `0xd0118f…65336` | Locked deployer/upgrader | 26,893-byte source; no constructor args | Successful exact-source deployment | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | No contract → `0xa575…6b2B`; code 26,893 bytes / `df1636…cc24` | PASS |
| Register wrong-period claim 1 `0x9569a8…0165` | Locked registrant | EIN `752616975`; period `202206`; Object ID `202441289349302619`; `PROGRAM_SERVICE_SHARE`; 6,911 bps; intent `cpc-live-old-20260814-0001` | New frozen claim | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `5A/0I` | count 0 → 1; intent 0 → 1; claim 1 absent → `FROZEN` | PASS |
| Assess wrong-period claim 1 `0x2f597c…8499` | Locked assessor | claim ID 1 | Identity mismatch | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | `FROZEN` → `ASSESSED/WRONG_PERIOD_OR_ENTITY` | PASS |
| Register correct claim 2 `0x4099ec…da18` | Locked registrant | EIN `752616975`; period `202306`; same Object ID/template; 6,911 bps; intent `cpc-live-new-20260814-0001` | New frozen claim | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `5A/0I` | count 1 → 2; intent 0 → 2; claim 2 absent → `FROZEN` | PASS |
| Assess correct claim 2 `0x4a3f50…81d0` | Locked assessor | claim ID 2 | Supported numeric result | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | `FROZEN` → `ASSESSED/SUPPORTED_BY_FILING`; 23,377,236 / 33,823,175 = 6,911 bps | PASS |
| Unauthorized successor link `0x8e3bdf…eb61` | Negative-control wallet | old ID 1; new ID 2 | Rejected without state change | `FINALIZED/ERROR`; `MAJORITY_AGREE`; `5A/0I` | claim 1 `ASSESSED`, successor 0 → unchanged | PASS |
| Authorized successor link `0xb9603a…0454` | Locked original registrant | old ID 1; new ID 2 | Link newer assessed successor | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | claim 1 `ASSESSED`, successor 0 → `SUPERSEDED`, successor 2 | PASS |
| Register unavailable-evidence claim 3 `0xa52531…5f51` | Locked registrant | EIN `752616975`; period `202306`; Object ID `999999999999999999`; `PROGRAM_SERVICE_SHARE`; 5,000 bps; intent `cpc-live-unresolved-20260814-0001` | New frozen claim | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | count 2 → 3; intent 0 → 3; claim 3 absent → `FROZEN` | PASS |
| Duplicate registration `0xd1d457…14b5` | Locked registrant | Exact preceding registration arguments and intent | Replay rejection | `FINALIZED/ERROR`; `MAJORITY_AGREE`; `3A/2I` | count 3 → 3; intent remained claim 3 | PASS |
| Assess unavailable evidence `0x79f6c7…9c5c` | Locked assessor | claim ID 3 | Fail closed | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | `FROZEN` → `UNRESOLVED`; retries 0 | PASS |
| Retry unavailable evidence `0x7ab2ca…c16c` | Locked retry caller | claim ID 3; intent `cpc-live-retry-20260814-0001` | One bounded retry | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | `UNRESOLVED`, retries 0 → `UNRESOLVED`, retries 1 | PASS |
| Replay retry intent `0x712004…ab93` | Locked retry caller | Exact preceding retry arguments and intent | Idempotent no-op | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `5A/0I` | claim 3 `UNRESOLVED`, retries 1 → unchanged; count 3 | PASS |
| Invalid EIN `0xbe31ed…7139` | Locked registrant | EIN `123`; otherwise valid registration; intent `cpc-live-invalid-20260814-0001` | Input rejection | `FINALIZED/ERROR`; `MAJORITY_AGREE`; `3A/2I` | count 3 → 3 | PASS |

### Pending expanded matrix

The 49/50/51 and 299/300/301 bps boundary cases plus live `FUNDRAISING_SHARE` and `NAMED_PROGRAM_SCOPE` paths are PENDING. The first boundary submission returned an HTML RPC error before yielding a transaction hash; its intent and count must be reconciled before any retry. No boundary or template case is marked PASS until terminal receipt and authoritative readback exist.

## Isolated upgrade rehearsal ledger

The rehearsal used diagnostic contract `0x18e78e546dEB4ABb28D7B4f306D056E860CE32b6`, never the release instance. Its 26,948-byte historical source hash was `aa22d8c89c3231c2482f2b264a845de980b9597f10b2419361fe3662493acba9`; the later six-access runtime fix changed no storage, constructor, ABI, or upgrade logic.

| Case | Caller role | Exact arguments | Expected | Receipt | Authoritative pre → post | Result |
|---|---|---|---|---|---|---|
| Diagnostic deployment `0x8b9296…4409` | Locked deployer/upgrader `0x09Cd…289a` | 26,948-byte `aa22d8…cba9` source; no constructor args | Successful disposable deployment | `FINALIZED/SUCCESS`; `MAJORITY_AGREE` | No contract → exact source hash; claim count 0 | PASS |
| Authorized exact-byte upgrade `0x30522b…045e` | Locked upgrader `0x09Cd…289a` | `upgrade(b#<26,948 exact source bytes>)`; reverse-decoded hash `aa22d8…cba9` | Success with no drift | `FINALIZED/SUCCESS`; `MAJORITY_AGREE` | source `aa22d8…cba9`, count 0 → same source/count | PASS |
| Unauthorized exact-byte upgrade `0x28b74e…a767` | Negative-control wallet `0x4587…6607` | Same exact upgrade payload | Authorization failure with rollback | `FINALIZED/ERROR`; `MAJORITY_AGREE` | source `aa22d8…cba9`, count 0 → unchanged | PASS |

## Upgrade controls

The constructor appends `gl.message.sender_address` to `gl.storage.Root.get().upgraders`. The public `upgrade(new_code: bytes)` method replaces Root Slot code. GenVM's locked-slot authorization must reject a caller that is not in the upgrader list.

Storage compatibility rule: existing fields must retain their order and types. New fields may only be appended under a separately reviewed migration plan. The exact replacement bytes and SHA-256 must be verified before any upgrade.

Before accepting the release deployment, a separate test deployment must prove:

1. deployment is `FINALIZED` with execution `SUCCESS`;
2. deployer, origin, and recorded upgrader are the selected Studio account;
3. authorized exact-byte upgrade succeeds;
4. unauthorized upgrade finalizes with rollback/error and no code drift;
5. source readback matches the reviewed bytes and SHA-256.

## Trust and authority matrix

| Action | Trigger | Decision authority | On-chain consequence | Override |
|---|---|---|---|---|
| Register claim | Any wallet | Deterministic contract validation | Frozen claim bound to wallet intent and filing identity | None |
| Assess claim | Any wallet | GenLayer validators independently fetch and evaluate fixed evidence; contract derives numeric verdict | `FROZEN` becomes `ASSESSED` or `UNRESOLVED` | None |
| Retry unresolved | Any wallet, at most twice; wallet-bound retry intent prevents replay | Same evidence and consensus path as assessment | `UNRESOLVED` remains unresolved or becomes assessed | None |
| Link successor | Original registrant of old claim | Deterministic identity, template, period, and state checks | Old assessed claim becomes `SUPERSEDED` | None |
| Upgrade code | Recorded Root Slot upgrader | GenVM locked-slot authorization | Contract code replaced; storage persists | Sole recorded upgrader |

The upgrade authority cannot inject or override a verdict through an application method. It can replace code, so it is explicitly disclosed as a technical governance power.

## Recovery limits and runbook

The selected Studio account may be the sole upgrader. If access to it is lost, the existing contract may remain readable but cannot be upgraded through that authority. Recovery then means deploying a replacement from the recorded source and constructor manifest, rerunning all live proof paths, and updating the frontend and documentation only after the replacement passes.

If Studio's local UI state resets while Studionet state and the selected account remain available, reconnect that account, import the contract by address, load the exact recorded source, verify source readback, then continue.

If Studionet or its chain state resets, the old address and state cannot be recovered. Redeploy from the recorded source, rerun contract and frontend smoke tests, and replace all address and Explorer references. Never claim that the former address survived a network reset.

## Required post-deployment evidence

- selected Studio deployer/upgrader address;
- deployment transaction, contract address, and Explorer links;
- `FINALIZED`, execution `SUCCESS`, `from_address`, and `origin_address`;
- exact commit, source SHA-256, and deployed-code readback parity;
- isolated authorized and unauthorized upgrade rehearsal;
- live proof matrix for register, assess happy path, unresolved path, retry, successor link, and rejected replay/unauthorized actions;
- frontend reads and writes against the same accepted Studionet contract.
