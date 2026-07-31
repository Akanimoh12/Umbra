# Umbra — Flare hackathon submission notes

## Selected bounty
Bounty 2 — Confidential Compute Apps.

## Short product description
A confidential strategy vault on Flare. NAV, TVL, and share price are fully public; the manager's rebalance intents stay private, are aggregated off-chain by an attested service, and only the signed net delta is revealed and settled as one swap on Umbra's own AMM.

## Target user
Strategy managers who want on-chain, verifiable performance for their LPs without leaking the alpha that would get copy-traded, front-run, or reverse-engineered — plus the LPs and auditors who need transparency and scoped disclosure.

## How it uses Flare
- Deployed and running on **Coston2**.
- Uses the **confidential-compute on-chain pattern**: an authorized, registered off-chain signer produces a result the consuming contract verifies against a registry before acting (`AttestationVerifier` + `UmbraVault.executeRebalance`). This is the same shape as Flare Confidential Compute's authorized-instruction / attestation model, built so the confidential component can later move into a hardware enclave with no contract change.
- NAV can be cross-checked against an **FTSO** reference price as a Flare-native oracle signal.

## What was newly built
Everything is new and original for this hackathon: the vault, the attestation verifier, a minimal constant-product AMM (factory/pair/router) we deploy and seed, two test tokens, the off-chain attestation aggregator service, the full deploy pipeline, an end-to-end test, and the complete frontend + keeper.

## Deployment
Coston2 testnet. Addresses recorded in `contracts/deployments/coston2.json` and the README once deployed.

## What's next
- Run the aggregator inside a hardware confidential enclave and register its measured code hash on-chain (`allowedCodeHash` is already reserved for this) — no contract change needed.
- Multi-asset strategies with per-asset net orders.
- FTSO-referenced NAV cross-checks surfaced in the UI.
- Randomized settlement timing within an epoch window to defeat timing inference.

## Developer-experience notes on Flare
- Coston2 is cleanly EVM-compatible; standard Hardhat 3 + viem worked with no Flare-specific plugin.
- `viem`/`wagmi` already export `flareTestnet` (chain 114), so the frontend needed no custom chain definition.
- The Coston2 faucet + explorer made the deploy-and-verify loop straightforward.
