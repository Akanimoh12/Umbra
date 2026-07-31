# Umbra Frontend

Next.js 15 (App Router) in [`web/`](../web). wagmi v2 + viem v2 + RainbowKit, Tailwind 3, a custom dark theme.

## Routes

| Route | What it does |
|---|---|
| `/` | Landing with a live stat strip (TVL, share price, epoch, intent count) read from Coston2. |
| `/app` | LP dashboard. Approve + deposit tUSD, withdraw shares, position + epoch ticker. |
| `/manage` | Manager console. Enter a signed delta → submit it privately to the aggregator → record the commitment on-chain, then compare "what the chain sees" (the commitment) with your private net-delta view. |
| `/audit` | Auditor view. Reveals the strategy only if the vault owner allow-listed your wallet on-chain. |
| `/api/keeper` | Cron endpoint. Closes the epoch, fetches the attested net delta, calls `executeRebalance`. Daily via `vercel.json`; trigger manually with curl for on-demand settlement. |

## Key modules

- `lib/contracts.ts` — vault address + ABIs typed `as const`.
- `lib/aggregator.ts` — typed client for the attestation service (postIntent, getNetDelta, getStrategy) + commitment helpers.
- `lib/format.ts` — token formatting, hash shortening, Coston2 explorer links.
- `app/providers.tsx` — wagmi config (Coston2 via `flareTestnet` from wagmi/chains), RainbowKit dark theme, react-query, toasts.

## Run locally

```bash
pnpm install
cp web/.env.example web/.env.local
pnpm aggregator    # attestation service on :8787
pnpm web           # http://localhost:3000
```

`.env.local`:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_RPC_URL` | Coston2 RPC |
| `NEXT_PUBLIC_VAULT_ADDRESS` | From `contracts/deployments/coston2.json` |
| `NEXT_PUBLIC_AGGREGATOR_URL` | Attestation service base URL |
| `NEXT_PUBLIC_WC_PROJECT_ID` | WalletConnect Cloud project id |
| `KEEPER_PRIVATE_KEY` | Server-only. Keeper wallet with C2FLR |
| `AGGREGATOR_URL` | Server-side aggregator URL for the keeper route |
| `CRON_SECRET` | Optional bearer token protecting `/api/keeper` |

## Deploy to Vercel

```bash
cd web && npx vercel --prod
```

Set the same env vars in the project settings. The daily cron hits `/api/keeper`; set `CRON_SECRET` so nobody else can trigger settlement.
