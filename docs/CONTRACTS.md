# Umbra Contracts

Hardhat 3 project in [`contracts/`](../contracts). Solidity 0.8.35, viem toolbox.

## Contracts

| File | Purpose |
|---|---|
| `UmbraVault.sol` | The vault. ERC-20 shares, public deposit/withdraw/NAV, private intent commitments, epoch settlement gated by an attestation check, auditor allow-list. |
| `AttestationVerifier.sol` | Registry of authorized aggregator signers. `verifyNetDelta(...)` recovers the EIP-712 signer of a net-delta attestation and checks it is registered. Holds an `allowedCodeHash` slot reserved for the enclave roadmap. |
| `UmbraFactory.sol` / `UmbraPair.sol` / `UmbraRouter.sol` | Minimal constant-product AMM (x·y=k, 0.30% fee) we deploy and seed for real on-chain swaps and NAV pricing. |
| `TestUSD.sol` / `TestXAU.sol` | Faucetable base (6-decimal) and target (18-decimal) test tokens. |

## How UmbraVault works

**Public side.** `deposit(assets)` mints shares pro-rata; `withdraw(shares)` burns and pays from idle base. `totalAssets()` values the vault's target holdings at the AMM pair's reserve price, so NAV and `sharePrice()` are verifiable by anyone.

**Private side.** The manager sends the actual signed delta to the off-chain aggregator, and records only a **commitment** on-chain via `submitIntent(bytes32)`. The vault folds each commitment into a running hash chain and increments the epoch's intent count. The value itself never touches the chain.

**Epoch lifecycle.** The keeper calls `closeEpoch()` to freeze the count and mark the epoch closed. Off-chain, the aggregator sums the epoch's intents and signs an EIP-712 `NetDelta { epoch, netDelta, intentCount, intentsCommitment }`. The keeper submits it to `executeRebalance(netDelta, intentCount, intentsCommitment, signature, amountOutMin)`. The vault requires the count and commitment to match what it stored, verifies the signature through `AttestationVerifier`, then settles the net delta as one swap on the AMM. The epoch counter increments.

**Compliance.** `grantAuditor(addr)` / `revokeAuditor(addr)` maintain an on-chain allow-list the aggregator checks before disclosing the strategy to an auditor.

## Roles

| Role | Powers |
|---|---|
| `owner` | `setRoles`, `setVerifier`, `grantAuditor`, `revokeAuditor` |
| `manager` | `submitIntent` |
| `keeper` | `closeEpoch`, `executeRebalance` |

## The attestation scheme

EIP-712 domain: `{ name: "UmbraAttestation", version: "1", chainId: 114, verifyingContract: AttestationVerifier }`.
Typed struct: `NetDelta(uint256 epoch, int256 netDelta, uint256 intentCount, bytes32 intentsCommitment)`.
The `intentsCommitment` is a hash chain — `keccak256(abi.encode(prev, intentCommitment))` folded from `bytes32(0)` — that binds the signature to the exact set of intents the epoch recorded.

## Run

```bash
pnpm install               # from repo root
cd contracts
pnpm compile
pnpm test                  # local end-to-end, no external services
```

## Deploy to Coston2

```bash
cp .env.example .env       # COSTON2_RPC, PK (funded with C2FLR), AGGREGATOR_SIGNER

npx hardhat run scripts/00-deploy-tokens.ts   --network coston2
npx hardhat run scripts/01-deploy-amm.ts      --network coston2
npx hardhat run scripts/02-seed-liquidity.ts  --network coston2
npx hardhat run scripts/03-deploy-verifier.ts --network coston2
npx hardhat run scripts/04-deploy-vault.ts    --network coston2
MANAGER=0x... KEEPER=0x... AUDITOR=0x... npx hardhat run scripts/05-wire-roles.ts --network coston2

# full live epoch (needs the aggregator running):
AGGREGATOR_URL=http://localhost:8787 npx hardhat run scripts/06-live-epoch.ts --network coston2
```

Each script writes addresses to `deployments/coston2.json`; later scripts read from it. Get C2FLR from the [Coston2 faucet](https://faucet.flare.network/coston2). Pool seeding is small (2,000 tUSD + 1 tXAU) to fit a limited faucet budget.
