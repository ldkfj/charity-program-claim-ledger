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
- Contract source SHA-256: recorded in the exact PRE_DEPLOY review package
- Deployment address and transaction: recorded only after accepted deployment

The primary AI will select a fresh available Studio account after anonymous `PRE_DEPLOY` approval, record its public address here before sending any transaction, and use that same address as deployer and Root Slot upgrader. No account, credential, contract address, or deployment evidence from another Task may be reused.

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
