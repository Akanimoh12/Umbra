# UMBRA

**Public returns, private strategy — a confidential strategy vault on Flare.**

🎥 [Demo video](https://REPLACE_ME) · 🌐 [Live app](https://REPLACE_ME) · 📄 [Architecture](docs/ARCHITECTURE.md)

Umbra is an on-chain vault where NAV, TVL, and share price are fully public and verifiable, but the manager's strategy stays private. Rebalance intents are submitted privately to an attested aggregator, summed off-chain, and only the **net batch delta** is revealed — carrying a signature the vault verifies on-chain — then settled as one swap on Umbra's own AMM.

Two intents go in. One signed number comes out. Attribution is gone.

```
submit privately → aggregate → attest net only → settle on Flare
```

## Built for the Flare Summer Signal hackathon

**Bounty 2 — Confidential Compute Apps.** Umbra brings the confidential-compute pattern to DeFi: individual strategy intents never touch the chain, and settlement is gated by an on-chain attestation check that mirrors Flare's confidential-compute design (an authorized, registered signer whose result the chain verifies). Today the aggregator runs as a registered off-chain signer; the roadmap runs the identical service inside a hardware enclave and registers its measured code — **with no contract change**, because the verifier already trusts a registered signer.

## Trust model (stated honestly)

- **Public:** NAV, share price, supply, deposits/withdrawals, epoch, per-epoch intent count, and — after settlement — the net delta and the resulting swap.
- **Private:** each individual manager intent (only the aggregator ever sees them).
- **Why attribution is gone:** only the sum is revealed and settled as a single swap, so the component intents, their sizes, count-order, and timing cannot be reconstructed.
- **What secures it today:** the aggregator holds intents privately and is the registered attestation signer. This is **attestation-verified / TEE-ready** — not a live hardware enclave yet. The enclave upgrade is the roadmap and needs no contract change.

## Deployed on Coston2

All live on Flare Coston2 (chain 114). Browse on the [Coston2 explorer](https://coston2-explorer.flare.network).

| Contract | Address |
|---|---|
| UmbraVault | [`0x552431953dd3f087557196a383c436ddaab665ab`](https://coston2-explorer.flare.network/address/0x552431953dd3f087557196a383c436ddaab665ab) |
| AttestationVerifier | [`0x6ff8a142f4909d5ef59c59b28ccd1184e95f477a`](https://coston2-explorer.flare.network/address/0x6ff8a142f4909d5ef59c59b28ccd1184e95f477a) |
| TestUSD (tUSD) | [`0xfd2f67cd354545712f9d8230170015d7e30d133a`](https://coston2-explorer.flare.network/address/0xfd2f67cd354545712f9d8230170015d7e30d133a) |
| TestXAU (tXAU) | [`0xa5dd225beb2ec0009fe143eb0b9309ba07d23737`](https://coston2-explorer.flare.network/address/0xa5dd225beb2ec0009fe143eb0b9309ba07d23737) |
| AMM pair (tUSD/tXAU) | [`0x4e362e6856EA1aF94a603D6cf923a5c822010bA0`](https://coston2-explorer.flare.network/address/0x4e362e6856EA1aF94a603D6cf923a5c822010bA0) |

A full confidential epoch has already settled live: two private intents (+500 / −200 tUSD) aggregated to a net of 300, attested off-chain, verified on-chain, then swapped on the AMM — [settlement tx](https://coston2-explorer.flare.network/tx/0x7ead1a9449fe03bfa5891f83f52c6183ace41bc2fd9e2c8e5f9659e123d73d31).

## Quick start

```bash
pnpm install
pnpm contracts:compile
pnpm contracts:test        # local end-to-end: private intents → attest → settle
pnpm aggregator            # attestation service on :8787
pnpm web                   # frontend on http://localhost:3000
```

Full guides: [contracts](docs/CONTRACTS.md) · [frontend](docs/FRONTEND.md) · [aggregator](docs/AGGREGATOR.md)

## What we built

The vault, the attestation verifier, a minimal constant-product AMM (factory / pair / router) we deploy and seed, the two test tokens, the off-chain attestation aggregator, the deploy pipeline, tests, and the full frontend + keeper. All original, all Flare-native.

## Roadmap

Run the aggregator inside a hardware confidential enclave and register its measured code hash · multi-asset encrypted weights · FTSO-referenced NAV cross-checks · randomized settlement timing within an epoch.
