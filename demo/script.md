# Umbra — demo video script

Everything is live on Flare Coston2 — no mocks. Pre-open: the app, the Coston2 explorer on the vault address, MetaMask on the manager wallet (Coston2), and a second profile with an auditor wallet. Aggregator running.

## 0:00–0:15 — The hook

Landing page, slow scroll.

> "This is Umbra, a confidential strategy vault on Flare. TVL, share price, epoch — all live from Coston2. What you'll never see on-chain is the strategy."

## 0:15–0:35 — LP deposit

Go to **Vault**, connect, faucet + deposit 1,000 tUSD (approve + deposit).

> "As an LP I deposit like in any vault and get ERC-20 shares. Everything about my side is public — that's what makes it trustworthy."

## 0:35–1:15 — Private intents

Go to **Manage**. Type `500`, submit. Let the stages play: `computing… → submitting to attested aggregator… → recording commitment on Flare… → done`.

> "I'm the manager. I want to buy 500 of the target. The value goes privately to the attested aggregator, and all that lands on-chain is this commitment."

Open the tx on the Coston2 explorer — point at the opaque 32-byte commitment. Submit a second intent, `-200`, then **View net delta**.

> "Second intent, sell 200. Only I can see the running total — plus 300 — because the aggregator checks I'm the manager. The chain just sees two commitments."

## 1:15–1:40 — Settlement

Trigger the keeper (curl `/api/keeper`). Show the JSON, then the swap on the explorer.

> "At epoch close the aggregator signs exactly one number — the net, plus 300. The vault verifies that signature on-chain, then settles it as a single real swap on our Flare AMM. Two intents in, one number out. Attribution is gone."

## 1:40–2:00 — Compliance + close

Auditor profile on **Audit**: private state → owner grants the auditor on-chain → refresh → strategy revealed with a green COMPLIANCE ACCESS badge.

> "And for a regulator? Scoped, revocable disclosure gated by an on-chain allow-list. Public where it builds trust, private where it protects alpha. Umbra — built on Flare."

End card: repo + live app link.

## Recording checklist

- [ ] Fresh epoch with 0 intents
- [ ] Manager + auditor wallets funded with C2FLR + tUSD
- [ ] Aggregator reachable from the browser + keeper
- [ ] Explorer tabs pre-loaded on the vault + pair
