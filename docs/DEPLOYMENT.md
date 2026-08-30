# Deployment and Recovery Record

> Current status: grader remediation is pending fresh deployment and exact-revision review. The deployment, live-transaction, hosting, and hashes below are historical evidence for the pre-remediation revision. The current source adds exact-text public-claim evidence binding and original-registrant-only retry authorization.

## Current remediation PRE_DEPLOY package

- Exact commit: `3cc0dc01ef914c975af87aad40d215a10b33a462`
- Contract source SHA-256: `0ECB1D0912B333E17197F07A0B645C779BBFF8F2A4DF637A6345D02F4B7F37CF`
- Selected Studio deployer/upgrader for the forthcoming deployment: `0x09Cdd3BeE61e0080cBD00ad61Bc1b44D3f1F289a`
- Deployment transaction and contract address: not yet created for this revision

## Historical pre-remediation PRE_DEPLOY classification

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

## Historical pre-remediation deployment evidence

The fresh deployment transaction is `FINALIZED`; leader execution is `SUCCESS`; its recorded votes contain three `agree`, two `idle`, and no disagreement; and `from_address` equals the selected deployer. Contract-code readback decodes to exactly 26,893 bytes and the approved SHA-256 above. The earlier addresses `0x07Bca9edBCBEA28A4A3452126832cf5CE7962452`, `0x05FCf32aCa5265D733D4524D4346fDF4277fE100`, `0x18e78e546dEB4ABb28D7B4f306D056E860CE32b6`, and `0x33297B6C682B4FcE63bd0d26fd6842B79FB8a07B` are superseded diagnostic deployments and are not release evidence.

## Historical pre-remediation Studionet live evidence ledger

The locked account `0x09Cdd3BeE61e0080cBD00ad61Bc1b44D3f1F289a` acted as deployer, upgrader, registrant, assessor, retry caller, and authorized successor caller. The negative authorization account was `0x458766D23AE2a78a89d09E19D9a06690a5586607`. Every PASS row has terminal receipt classification and authoritative pre/post readback; `3A/2I` means three `agree`, two `idle`, and no disagreement.

| Case | Caller role | Exact arguments | Expected | Receipt / consensus | Authoritative pre → post | Result |
|---|---|---|---|---|---|---|
| Deploy release `0xd0118fde73e016cf6dee278866251cc656cd83350c1cb35712fe3fef30165336` | Locked deployer/upgrader | 26,893-byte source; no constructor args | Successful exact-source deployment | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | No contract → `0xa5754435B7411Faa56de25D1311Ff2E3B4356b2B`; code 26,893 bytes / `df1636384d1037575c4eec9d9d902fdc4db528d212bb5109958339806efecc24` | PASS |
| Register wrong-period claim 1 `0x9569a8763ff265203641ba8515780ada89a77198c7bf382ead603e9154f90165` | Locked registrant | EIN `752616975`; period `202206`; Object ID `202441289349302619`; `PROGRAM_SERVICE_SHARE`; 6,911 bps; intent `cpc-live-old-20260814-0001` | New frozen claim | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `5A/0I` | count 0 → 1; intent 0 → 1; claim 1 absent → `FROZEN` | PASS |
| Assess wrong-period claim 1 `0x2f597cc7c9fd587556c33174f4261e60593bf665c24a643da69a57d917c58499` | Locked assessor | claim ID 1 | Identity mismatch | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | `FROZEN` → `ASSESSED/WRONG_PERIOD_OR_ENTITY` | PASS |
| Register correct claim 2 `0x4099ec9d6d1d71a1f079bb6b90c2d8e852aee8b05fb7d79084b122f094cbda18` | Locked registrant | EIN `752616975`; period `202306`; same Object ID/template; 6,911 bps; intent `cpc-live-new-20260814-0001` | New frozen claim | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `5A/0I` | count 1 → 2; intent 0 → 2; claim 2 absent → `FROZEN` | PASS |
| Assess correct claim 2 `0x4a3f50b4f5496e9d30caec16e0d1b9b81a971b1724831934ac5e44297c3381d0` | Locked assessor | claim ID 2 | Supported numeric result | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | `FROZEN` → `ASSESSED/SUPPORTED_BY_FILING`; 23,377,236 / 33,823,175 = 6,911 bps | PASS |
| Unauthorized successor link `0x8e3bdf777ebbbdf7bdad795e2f01465a5317494d84fe2634d9ef8bd021daeb61` | Negative-control wallet | old ID 1; new ID 2 | Rejected without state change | `FINALIZED/ERROR`; `MAJORITY_AGREE`; `5A/0I` | claim 1 `ASSESSED`, successor 0 → unchanged | PASS |
| Authorized successor link `0xb9603a3d614e1cbe39fb258520ce65bbc300337ff4de45424a09121f94bc0454` | Locked original registrant | old ID 1; new ID 2 | Link newer assessed successor | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | claim 1 `ASSESSED`, successor 0 → `SUPERSEDED`, successor 2 | PASS |
| Register unavailable-evidence claim 3 `0xa525319bd754db5fdce70366f691035bc7b868d9c8dde56e6ee2f66767195f51` | Locked registrant | EIN `752616975`; period `202306`; Object ID `999999999999999999`; `PROGRAM_SERVICE_SHARE`; 5,000 bps; intent `cpc-live-unresolved-20260814-0001` | New frozen claim | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | count 2 → 3; intent 0 → 3; claim 3 absent → `FROZEN` | PASS |
| Duplicate registration `0xd1d457bb753784b2a59be6fe0906a5bc66e65bf76bd68bb3fc99c39cb5f314b5` | Locked registrant | Exact preceding registration arguments and intent | Replay rejection | `FINALIZED/ERROR`; `MAJORITY_AGREE`; `3A/2I` | count 3 → 3; intent remained claim 3 | PASS |
| Assess unavailable evidence `0x79f6c7fbbbaeee4e8f255c159d07c90d18944c1afab2a475a4e48e59c5179c5c` | Locked assessor | claim ID 3 | Fail closed | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | `FROZEN` → `UNRESOLVED`; retries 0 | PASS |
| Retry unavailable evidence `0x7ab2cab7215d5425b338e9b87f46f85f5c7f7c521191bc1937ba6c339ebac16c` | Locked retry caller | claim ID 3; intent `cpc-live-retry-20260814-0001` | One bounded retry | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `3A/2I` | `UNRESOLVED`, retries 0 → `UNRESOLVED`, retries 1 | PASS |
| Replay retry intent `0x712004a7201ec79f4e8c53176397054735067645fadb5d63181a83cb9198ab93` | Locked retry caller | Exact preceding retry arguments and intent | Idempotent no-op | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `5A/0I` | claim 3 `UNRESOLVED`, retries 1 → unchanged; count 3 | PASS |
| Invalid EIN `0xbe31ed8fc269b24f720de3ff3511eb5b6e550ce5718da4135cadc99529c97139` | Locked registrant | EIN `123`; otherwise valid registration; intent `cpc-live-invalid-20260814-0001` | Input rejection | `FINALIZED/ERROR`; `MAJORITY_AGREE`; `3A/2I` | count 3 → 3 | PASS |

### Expanded threshold and template matrix

All rows use the locked account, EIN `752616975`, period `202306`, Object ID `202441289349302619`, and the stated wallet-bound intent. Each registration produced the listed claim in `FROZEN`; each assessment reached `FINALIZED/SUCCESS`, then the authoritative claim readback matched the expected terminal result. The first boundary attempt ended before returning a hash; count and intent readback proved no effect before the journal safely resumed.

| Case | Exact arguments and transactions | Receipt / consensus | Authoritative result | Result |
|---|---|---|---|---|
| 50-bps below: delta 49, claim 4 | `PROGRAM_SERVICE_SHARE`; claimed 6,960; intent `cpc-live-boundary49-20260814-0001`; register `0x1cba0dc7b386c3fa96c365f2122ae1f9a40cc5265c5786eaac5a0f2d93982e0e`; assess `0x5378de163d030a64f0bf6626479d92b0eb930b2bae35b182735d6a57945ca52d` | register `FINALIZED/SUCCESS`, `4A/1I`; assess `FINALIZED/SUCCESS`, `3A/2I` | 6,911 bps; `SUPPORTED_BY_FILING` | PASS |
| 50-bps exact: delta 50, claim 5 | same template; claimed 6,961; intent `cpc-live-boundary50-20260814-0001`; register `0xe5de322ff1c8fc35ddb01b8ae34c82d9f1a845888bdd39d2aa81237c96c53aaf`; assess `0x230c52d929dd3398b616fed7aca2f36e93974b4877c9cb9268c2625d6ddc78c2` | register `FINALIZED/SUCCESS`, `4A/1I`; assess `FINALIZED/SUCCESS`, `3A/2I` | 6,911 bps; `SUPPORTED_BY_FILING` | PASS |
| 50-bps above: delta 51, claim 6 | same template; claimed 6,962; intent `cpc-live-boundary51-20260814-0001`; register `0x82096e4b4fc8f8f56721a279ed63370e42a4baee3898b86a38630e4983c525da`; assess `0x3785d26626de8b951e1b823261aa7c87b22e7ca3423fe273ec3b8a1791f9aef0` | both `FINALIZED/SUCCESS`, `4A/1I` | 6,911 bps; `QUALIFICATION_REQUIRED` | PASS |
| 300-bps below: delta 299, claim 7 | same template; claimed 7,210; intent `cpc-live-boundary299-20260814-0001`; register `0x8b2a03927a5f48cd45d311b104b98eb38e02308ff27a848a8d1358f916c39725`; assess `0x73f6a57a30472312d78d2f7da066770ea226c884d1640a7b305116c4a6f97275` | register `FINALIZED/SUCCESS`, `4A/1I`; assess `FINALIZED/SUCCESS`, `3A/2I` | 6,911 bps; `QUALIFICATION_REQUIRED` | PASS |
| 300-bps exact: delta 300, claim 8 | same template; claimed 7,211; intent `cpc-live-boundary300-20260814-0001`; register `0xc50b26c07138afd3f2bb2edcbae6f7cf3561030923115e95ac13d7384b76125c`; assess `0x07298eeff80fa7dcf9f38c4439573567762f1c0ddd921636d3e4051eec3bc4c0` | register `FINALIZED/SUCCESS`, `4A/1I`; assess `FINALIZED/SUCCESS`, `3A/2I` | 6,911 bps; `QUALIFICATION_REQUIRED` | PASS |
| 300-bps above: delta 301, claim 9 | same template; claimed 7,212; intent `cpc-live-boundary301-20260814-0001`; register `0x60e328db970a398fc1b0d9800094af6720609e1ef3160106c0d042c4a903bfa7`; assess `0x458f22b3b35408f43615823f4b161ca50080be4bd67b436679dc669cfff93191` | register `FINALIZED/SUCCESS`, `4A/1I`; assess `FINALIZED/SUCCESS`, `3A/2I` | 6,911 bps; `OVERSTATED` | PASS |
| Fundraising share, claim 10 | `FUNDRAISING_SHARE`; claimed 0; intent `cpc-live-fundraising-20260814-0001`; register `0x64746530bafb3fb775d1a20ef57102052a50c5c3bace07eb32a8aeab7d2a36e0`; assess `0xcfd71a237a2d61e4b74522290a5676db26bec9f3b7a1eb2f5aa735d4d630f696` | both `FINALIZED/SUCCESS`, `3A/2I` | numerator 0 / denominator 33,823,175; 0 bps; `SUPPORTED_BY_FILING` | PASS |
| Named program scope, claim 11 | `NAMED_PROGRAM_SCOPE`; claimed 0; intent `cpc-live-named-20260814-0001`; register `0xa17b394ef41d5a25d79b2ccc1fd0fc28f48e3754393eada175bbe5e4f3ae15b5`; assess `0xde0eedf4e0a5519c61f667974255eb65e93b1d69d9142738087f848d44d9aabb` | both `FINALIZED/SUCCESS`, `3A/2I` | bounded Part III/Schedule O evidence; `SUPPORTED_BY_FILING`; final count 11 | PASS |

## Isolated upgrade rehearsal ledger

The rehearsal used diagnostic contract `0x18e78e546dEB4ABb28D7B4f306D056E860CE32b6`, never the release instance. Its 26,948-byte historical source hash was `aa22d8c89c3231c2482f2b264a845de980b9597f10b2419361fe3662493acba9`; the later six-access runtime fix changed no storage, constructor, ABI, or upgrade logic.

| Case | Caller role | Exact arguments | Expected | Receipt | Authoritative pre → post | Result |
|---|---|---|---|---|---|---|
| Diagnostic deployment `0x8b9296e5e7b72763118704692a437f6c503830e76eccb34a7603d0404bea4409` | Locked deployer/upgrader `0x09Cdd3BeE61e0080cBD00ad61Bc1b44D3f1F289a` | 26,948-byte `aa22d8c89c3231c2482f2b264a845de980b9597f10b2419361fe3662493acba9` source; no constructor args | Successful disposable deployment | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `5A/0I` | No contract → exact source hash; claim count 0 | PASS |
| Authorized exact-byte upgrade `0x30522bdbdd46e2ce5d6f0a9589f7db34309cc3ef964b9f6fa6f253408967045e` | Locked upgrader `0x09Cdd3BeE61e0080cBD00ad61Bc1b44D3f1F289a` | `upgrade(b#<26,948 exact source bytes>)`; reverse-decoded hash `aa22d8c89c3231c2482f2b264a845de980b9597f10b2419361fe3662493acba9` | Success with no drift | `FINALIZED/SUCCESS`; `MAJORITY_AGREE`; `5A/0I` | source `aa22d8c89c3231c2482f2b264a845de980b9597f10b2419361fe3662493acba9`, count 0 → same source/count | PASS |
| Unauthorized exact-byte upgrade `0x28b74ee14e6a89a34d467a66b64975e2d658c4e6fb55760fe4b9e70e1cdaa767` | Negative-control wallet `0x458766D23AE2a78a89d09E19D9a06690a5586607` | Same exact upgrade payload | Authorization failure with rollback | `FINALIZED/ERROR`; `MAJORITY_AGREE`; `4A/1I` | source `aa22d8c89c3231c2482f2b264a845de980b9597f10b2419361fe3662493acba9`, count 0 → unchanged | PASS |

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
| Register claim | Any wallet with an HTTPS publication containing the exact claim text | Deterministic contract validation | Frozen claim bound to wallet intent, publication evidence, and filing identity | None |
| Assess claim | Any wallet | GenLayer validators independently fetch and evaluate fixed evidence; contract derives numeric verdict | `FROZEN` becomes `ASSESSED` or `UNRESOLVED` | None |
| Retry unresolved | Original registrant only, at most twice; wallet-bound retry intent prevents replay | Same evidence and consensus path as assessment | `UNRESOLVED` remains unresolved or becomes assessed | None |
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

## Historical pre-remediation production Vercel E2E evidence

- Stable production URL: `https://charity-program-claim-ledger.vercel.app`
- Locked Vercel target: team `gam9`, project `charity-program-claim-ledger`
- Tested frontend revision: `4a4502a8846d526dd12b168b94f94a9300cc18cf`
- Tested deployment: `dpl_JDbn3pghvVUnhW3mpHF14zPEBaWq`
- User-owned wallet/account: OKX Wallet and MetaMask provider paths, account `0x7885536194BbD6E1D0A6Ab991aB215CFa9542339`; the human user approved provider access and signed the two live writes.

| Case | Evidence | Result |
|---|---|---|
| Production load and layout | Stable alias returned HTTP 200; title and release contract rendered; wallet controls measured inside the masthead at the desktop top-right | PASS |
| Public read without wallet | Claim 1 read as `SUPERSEDED/WRONG_PERIOD_OR_ENTITY`; after disconnect, claim 12 still read as `ASSESSED/WRONG_PERIOD_OR_ENTITY` | PASS |
| Mandatory provider chooser | Fresh load stayed disconnected; chooser listed OKX Wallet and MetaMask independently; selection bound the exact account and Studionet | PASS |
| Register claim 12 | `0x4b818df5a54714bf8a1178ef72f91bd8076dd855c12867bc49ae7e8b258edf6d`; Explorer `FINALIZED/SUCCESS/Accepted`; count 11 → 12; exact intent `ec84ff67-5368-4d8d-87a9-d41e60e5f6d8` and registrant read back | PASS |
| Interrupted polling and recovery | Browser RPC returned `Failed to fetch`; pending hash remained locked; Explorer and canonical transaction read proved finality; the same transaction was reconciled without replay | PASS |
| Assess claim 12 | `0x5d3d80366a78fd6703d6408b967a7ec2284ef6a8a3ef8175a92e90ead9499f9a`; Explorer `FINALIZED/SUCCESS/Accepted`; frontend cleared pending only after canonical receipt plus authoritative claim readback | PASS |
| Validation before wallet | Malformed EIN `123` produced `EIN must contain exactly 9 digits.` with no wallet request or transaction | PASS |
| Invalid retry guard | Retrying assessed claim 12 produced `Authoritative readback must show UNRESOLVED before retry.` with no wallet request or transaction | PASS |
| Reload/disconnect behavior | Reload started disconnected; explicit provider choice was required again; disconnect cleared the write session while public reads continued | PASS |

Two live-browser defects were found and repaired during this matrix: the finality wait envelope was replaced by a canonical transaction read keyed to the original hash, and the receipt classifier was extended to accept the live `txExecutionResult` field plus leader-receipt fallback. Regression coverage now proves both shapes while preserving fail-closed behavior for missing finality or execution data.

## Historical pre-remediation final submission scorecard candidate

```text
GENLAYER SUBMISSION CATEGORY AND SCORECARD
Category: PROJECT
Validity gate: PASS

GenLayer fit: 5
Evidence: Validators independently fetch the exact IRS filing and reach consensus on a bounded factual assessment whose verdict is stored on-chain.
Weakness/blocker: Public filing availability and source quality can still yield UNRESOLVED.

Contract quality: 5
Evidence: Frozen evidence identity, three templates, explicit thresholds, replay-safe intents, bounded retry, successor state, authorization controls, live boundary matrix, and isolated upgrade rehearsal all passed.
Weakness/blocker: The single recorded upgrader remains a disclosed technical governance power.

Engineering: 5
Evidence: 32 contract tests, 29 frontend tests, semantic/lint gates, deployed-source parity, complete terminal receipts/readbacks, recovery regression coverage, and public reproducible documentation.
Weakness/blocker: Studionet RPC availability can transiently interrupt polling; the pending journal and reconciliation flow preserve safety.

Frontend / UX: 5
Evidence: Exact production frontend supports public reads, explicit multi-provider selection, selected-provider-only writes, accessible chooser behavior, terminal transaction reconciliation, authoritative result rendering, and disconnect/reload recovery.
Weakness/blocker: Browser-extension interoperability still depends on the installed provider and its own account-signature UX.

Overall evidence-based assessment: Strong, complete PROJECT with GenLayer consensus at the core and unusually broad live evidence.
Submission recommendation: READY after exact-revision final dual approval.
```
