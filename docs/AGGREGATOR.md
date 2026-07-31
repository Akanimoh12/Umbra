# Umbra Attestation Aggregator

The off-chain service in [`aggregator/`](../aggregator) that receives private intents, sums them per epoch, and signs the net delta the vault settles against. It is the component that maps to a future confidential enclave — the HTTP boundary here is exactly what an enclave would expose.

## What it does

- Receives individual manager intents privately (`POST /intents`). Individual intents are never returned by any public endpoint.
- Folds each intent into a per-epoch commitment hash chain matching `UmbraVault`.
- Signs an EIP-712 `NetDelta` for a closed epoch so the vault can verify it on-chain.
- Gates the manager's private net-delta view and auditor strategy disclosure using on-chain roles (`vault.manager()`, `vault.isAuditor()`).

## API

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /health` | — | Liveness. |
| `GET /signer` | — | The registered aggregator signer address. |
| `POST /intents` | caller must equal on-chain `manager` | Store a private intent, fold its commitment. Returns `{ intentCount, commitment }`. |
| `GET /net-delta/:epoch` | `x-viewer` = manager or auditor | Private aggregate for the epoch. |
| `POST /attest/:epoch` | optional `x-keeper-secret` | Requires the epoch closed on-chain; returns `{ netDelta, intentCount, intentsCommitment, signature }`. |
| `GET /strategy/:epoch` | `x-viewer` = allow-listed auditor | Scoped strategy disclosure. |

## Signing key

`AGGREGATOR_PRIVATE_KEY` — its address must be registered via `AttestationVerifier.registerSigner` (deploy script `03` does this from `AGGREGATOR_SIGNER`). In the enclave roadmap this key is generated inside the enclave and its public key + code measurement attested.

## Run

```bash
cd aggregator
cp .env.example .env      # AGGREGATOR_PRIVATE_KEY, RPC_URL, VAULT_ADDRESS, VERIFIER_ADDRESS
pnpm dev                  # http://localhost:8787
```

## Enclave roadmap

Package this service as a reproducible image, run it inside a hardware confidential enclave, and register its measured code hash on-chain (`AttestationVerifier.allowCodeHash`). The vault contract needs no change — it already verifies against a registered signer, and the enclave simply becomes the authenticated source of that signer key.
