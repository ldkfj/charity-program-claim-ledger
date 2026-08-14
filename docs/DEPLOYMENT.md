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

## Studionet live matrix

All successful writes below reached `FINALIZED/SUCCESS` and were followed by authoritative contract readback. Expected negative controls reached `FINALIZED/ERROR` and preserved state.

| Case | Transaction | Authoritative result |
|---|---|---|
| Register wrong-period claim 1 | `0x9569a8763ff265203641ba8515780ada89a77198c7bf382ead603e9154f90165` | `FROZEN`, wallet-bound intent resolved to ID 1 |
| Assess wrong-period claim 1 | `0x2f597cc7c9fd587556c33174f4261e60593bf665c24a643da69a57d917c58499` | `ASSESSED / WRONG_PERIOD_OR_ENTITY` |
| Register correct claim 2 | `0x4099ec9d6d1d71a1f079bb6b90c2d8e852aee8b05fb7d79084b122f094cbda18` | `FROZEN`, wallet-bound intent resolved to ID 2 |
| Assess correct claim 2 | `0x4a3f50b4f5496e9d30caec16e0d1b9b81a971b1724831934ac5e44297c3381d0` | `SUPPORTED_BY_FILING`; 23,377,236 / 33,823,175 = 6,911 bps |
| Unauthorized successor link | `0x8e3bdf777ebbbdf7bdad795e2f01465a5317494d84fe2634d9ef8bd021daeb61` | `FINALIZED/ERROR`; claim 1 unchanged |
| Authorized successor link | `0xb9603a3d614e1cbe39fb258520ce65bbc300337ff4de45424a09121f94bc0454` | Claim 1 `SUPERSEDED`, successor ID 2 |
| Register unavailable-evidence claim 3 | `0xa525319bd754db5fdce70366f691035bc7b868d9c8dde56e6ee2f66767195f51` | `FROZEN`, intent resolved to ID 3 |
| Duplicate registration intent | `0xd1d457bb753784b2a59be6fe0906a5bc66e65bf76bd68bb3fc99c39cb5f314b5` | `FINALIZED/ERROR`; global count remained 3 |
| Assess unavailable evidence | `0x79f6c7fbbbaeee4e8f255c159d07c90d18944c1afab2a475a4e48e59c5179c5c` | `UNRESOLVED`, retries 0 |
| Retry unavailable evidence | `0x7ab2cab7215d5425b338e9b87f46f85f5c7f7c521191bc1937ba6c339ebac16c` | `UNRESOLVED`, retries 1 |
| Replay identical retry intent | `0x712004a7201ec79f4e8c53176397054735067645fadb5d63181a83cb9198ab93` | `FINALIZED/SUCCESS`; retries remained 1 |

The isolated upgrade rehearsal on `0x18e78e546dEB4ABb28D7B4f306D056E860CE32b6` proved an authorized exact-byte upgrade `FINALIZED/SUCCESS` and an unauthorized upgrade `FINALIZED/ERROR`; source hash and claim count remained unchanged. This proves the authorization surface of the reviewed storage layout, not an upgrade of the release instance.

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
