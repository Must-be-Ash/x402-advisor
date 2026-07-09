# What a facilitator is (and why we use the CDP one) — plain language

> Use this to explain the facilitator to a developer **who may not know anything about blockchains or "gas."** Keep it concrete. Don't make them read the protocol spec.

## The one-sentence version

> **A facilitator is a service that checks a payment is real and moves the money for you — so your API server never has to talk to a blockchain directly.**

## The slightly longer version (say this to the dev)

When an agent (or app) calls your paid endpoint, it attaches a signed payment. Two things have to happen:

1. **Verify** — is this payment actually valid (right amount, right asset, not already spent, signature real)?
2. **Settle** — actually move the funds to your wallet.

You do **not** want to build or operate that yourself — it means running blockchain infrastructure, handling network fees, and getting cryptography right. The **facilitator does both steps** for you. Your server just says "here's the payment I received, please verify and settle it," and gets back "✅ paid" or "❌ not paid." Your code stays a normal web server.

You never have to understand "gas" (the network's transaction fee) or hold crypto to run your API — the facilitator handles the on-chain part.

## Why this skill uses the **CDP facilitator** specifically

There are other facilitators, but we default to Coinbase Developer Platform (CDP) because it gives this team three things that matter:

1. **It supports every payment scheme we recommend** (`exact`, `upto`, `batch-settlement`) — you won't pick a scheme and then discover the facilitator can't settle it.
2. **Testnet → mainnet is a one-line change.** You prove everything works on Base **Sepolia** (free test money), then flip a single network value to go live on Base mainnet. Same facilitator, no re-plumbing.
3. **It's required to get cataloged in the Bazaar** — Coinbase's discovery directory where agents find your paid endpoints. Using the CDP facilitator is what makes your endpoints discoverable.

CDP docs (fetch these for the latest details when online):
- Facilitator overview: https://docs.cdp.coinbase.com/x402/core-concepts/facilitator
- Network support (which schemes/networks/assets are supported): https://docs.cdp.coinbase.com/x402/network-support

## What the dev has to do (guide them through this)

To let the CDP facilitator verify+settle, your server needs a **CDP API key** (two values). This is a normal API key — not a crypto wallet, not a seed phrase.

1. Go to the CDP portal → create/select a project → create an API key.
2. Copy the two values into your environment (never commit them):
   - `CDP_API_KEY_ID`
   - `CDP_API_KEY_SECRET`
   The `@coinbase/x402` package reads these automatically when it settles payments.
3. That's it — your server can now accept payments. No wallet software to install, no gas to buy.

> You still need a **payTo address** (where your earnings land) and, for a live payment *test*, a funded test buyer wallet — but those are separate from the facilitator API key. See `pitfalls.md` and the validation tiers in `SKILL.md`.

## How it shows up in code (the wiring difference)

The bundled framework examples use the keyless testing facilitator:
```ts
import { HTTPFacilitatorClient } from "@x402/core/server";
const facilitatorClient = new HTTPFacilitatorClient({ url: process.env.FACILITATOR_URL }); // keyless
```
**This skill uses the CDP facilitator instead** — same `HTTPFacilitatorClient`, but you pass the CDP
config object rather than a URL (this is the shape in `examples/canonical-next-cdp/proxy.ts`):
```ts
import { HTTPFacilitatorClient } from "@x402/core/server";
import { facilitator as cdpFacilitator } from "@coinbase/x402";
const facilitatorClient = new HTTPFacilitatorClient(cdpFacilitator); // reads CDP_API_KEY_ID/SECRET from env
```
So when generating middleware, **install `@coinbase/x402`** (it also transitively needs
`@coinbase/cdp-sdk`) and use the CDP form above — do not leave the keyless `{ url }` form from the
generic examples.
