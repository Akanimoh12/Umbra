# Umbra — Architecture

Umbra is a confidential strategy vault on Flare. The LP side is fully transparent; the manager's strategy is private until it settles as one attested net trade.

## System

```
┌───────────────────────────────────────────────────────────┐
│                     NEXT.JS APP (Vercel)                    │
│  Landing · /app (LP) · /manage (manager) · /audit          │
│  wagmi + viem (Coston2 reads/writes)                       │
│  aggregator client (private intents, net view, disclosure) │
└───────┬─────────────────────────────┬─────────────────────┘
        │ commitments + deposits       │ private intents (HTTP)
        ▼                             ▼
┌────────────────────────┐   ┌────────────────────────────────┐
│  UMBRA CONTRACTS        │   │  ATTESTATION AGGREGATOR (Node)  │
│  (Coston2)              │   │  - receives private intents     │
│  UmbraVault            │◄──│  - sums per epoch               │
│  AttestationVerifier    │   │  - signs EIP-712 NetDelta       │
│  Factory/Pair/Router    │   │  - registered on-chain signer   │
│  TestUSD / TestXAU      │   └────────────────────────────────┘
└───────┬────────────────┘
        │ settle net delta on the AMM
        ▼
   real constant-product swap (our own pool)

  KEEPER (cron / API route): closeEpoch → fetch attestation → executeRebalance
```

## The privacy mechanism

Individual intents are sent to the aggregator over HTTP and never appear on-chain. On-chain, the manager records only a 32-byte commitment per intent; the vault folds these into a hash chain and counts them. At epoch close the aggregator sums the intents and signs an EIP-712 `NetDelta`. The vault verifies that signature (via `AttestationVerifier`, which checks a registered signer), confirms the count and commitment match, and settles the single net delta as one swap. Because only the aggregate is ever revealed, the component intents — their sizes, order, and timing — cannot be reconstructed.

## Confidential-compute alignment

The on-chain shape matches Flare's confidential-compute pattern: an authorized, registered off-chain component produces a signed result, and the consuming contract verifies it against a registry before acting. `AttestationVerifier` is that registry; `UmbraVault.executeRebalance` is the consumer.

**Today:** the aggregator is a registered off-chain signer holding intents privately — "attestation-verified / TEE-ready."
**Roadmap:** run the identical aggregator binary inside a hardware confidential enclave and register its measured code hash (`allowedCodeHash` is reserved for this). No contract change is required, since the vault already trusts whatever signer the verifier has registered.

## Epoch lifecycle

1. **Open** — manager submits private intents to the aggregator + records commitments on-chain (`submitIntent`).
2. **Close** — keeper calls `closeEpoch()`, freezing the intent count.
3. **Attest** — aggregator returns the signed `NetDelta` for the closed epoch.
4. **Settle** — keeper calls `executeRebalance(...)`; the vault verifies the attestation and swaps the net delta on the AMM. Epoch increments.

## NAV pricing

Primary NAV comes from the vault's own AMM pair reserves (`getReserves()`), always consistent with the asset the vault actually trades against. An FTSO-referenced price (e.g. XAU/USD) can be surfaced in the UI as a Flare-native cross-check without settlement ever depending on the oracle.

## Design notes

- LP privacy is intentionally NOT the product — public LP data is what makes shares composable and the vault trustworthy. Strategy privacy is the product.
- MVP is one trading pair (tUSD/tXAU). Multi-asset is a per-asset extension.
- The AMM is ours, deployed and seeded, so swaps are real on-chain trades with real slippage — no mocks.
