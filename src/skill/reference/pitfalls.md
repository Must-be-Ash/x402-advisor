# Pitfalls — read this before finalizing any x402 setup

The failure catalog, with the *correct* fix for each. Several of these are things that have burned
real teams. Check every generated config against this list.

---

## 1. Mixing x402 v1 and v2 (the #1 trap)

Models default to **v1** because there's more v1 in their training data. v1 and v2 are **not
interchangeable** and must never be blended.

**Detect:** `x402Version: 1`; header names `X-PAYMENT` / `X-PAYMENT-RESPONSE` (v2 uses
`PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE`); string network names like `"base-sepolia"` as a
`network` value (v2 uses CAIP-2 ids like `eip155:84532`); legacy packages `x402`, `x402-express`,
`x402-axios` (v2 uses `@x402/core`, `@x402/express`, `@x402/axios`, `@x402/evm`, …).

**Fix:** Always v2. If the repo already has a v1 setup, offer to migrate (see
`docs/guides/migration-v1-to-v2.mdx`) — never leave a mixed state.

---

## 2. Bazaar indexing — the real requirement is a present `output`, NOT a schema

To be cataloged in the Bazaar, each route's discovery declaration must carry an **`output` object
with at least an `example`**. `output.schema` is **recommended but optional** — a declaration with
`example` and no `schema` is valid.

**The actual failure (from the reference repo's `/api/half` fixture):** `declareDiscoveryExtension`
was called with **no `output` key at all** (only `input`), so `info.output` is missing → not
indexed. It is *not* "missing schema."

```ts
// ❌ /api/half — NO output object → fails Bazaar indexing
...declareDiscoveryExtension({ input: { ok: true } })

// ✅ /api/correct — present, well-formed output (schema optional but included here)
...declareDiscoveryExtension({
  output: {
    example: { status: "ok", value: 42 },
    schema: { type: "object", properties: { status: { type: "string" }, value: { type: "number" } }, required: ["status", "value"] },
  },
})
```

**Fix when generating:** always emit `output.example` (infer it from the endpoint's real response).
Add `output.schema` **only when you can infer the response shape confidently** — don't fabricate a
schema you're unsure of; a good `example` alone still indexes.

---

## 3. Facilitator env not set → verify+settle fails

The CDP facilitator needs two env vars, read automatically by `@coinbase/x402`:
`CDP_API_KEY_ID` and `CDP_API_KEY_SECRET`. If they're missing, the T1 checks (402 shape + Bazaar
metadata) still pass, but the T2 live verify+settle can't run.

**Fix:** guide the dev to create a CDP API key (`facilitator.md`), set both vars in the environment
(never committed), and confirm `.env*` is gitignored. Report T2 as "skipped (no creds)", never as a
failure of their middleware.

---

## 4. Facilitator capability — confirm the scheme+network before you generate

Don't assume a facilitator settles every scheme on every network. Before recommending a **non-`exact`**
scheme (`upto`, `batch-settlement`), confirm the CDP facilitator supports that scheme+network
(https://docs.cdp.coinbase.com/x402/network-support, and/or the facilitator's `/supported` endpoint).

**Fix:** if a scheme+network isn't supported, tell the dev *before* codegen rather than shipping a
config that fails T2.

---

## 5. Recommending a scheme that has no server SDK (e.g. `auth-capture`)

A scheme being described in the spec does **not** mean you can build it. `auth-capture` is spec-only
in this bundle: there is **no** `@x402/evm/auth-capture/server` import and **no** server example. It
is **not recommendable or generatable** today.

**Fix:** `reference/capability.json` is authoritative — only recommend a scheme with
`recommendable: true`. Never emit `scheme: "auth-capture"`. For genuine settle-later work, deliver
the honest "coming soon" message in `knowledge.md` (never mis-route to `upto`, which is sync-only).

---

## 6. `upto` is sync-only — settle-later needs a different tool

`upto` settles **within the same HTTP response** (a taxi meter paid at drop-off). For genuinely async
work (job id now, finish later), `upto` does not fit — the mismatch that made HeyGen walk. See the
**settle-later branch** in `knowledge.md`: first check whether the cost is a function of submit-time
params (→ `exact` up front); otherwise `batch-settlement` gives you a live deposit/escrow + settle-actual
+ refund (heavier — you run a channel manager), and `exact`-overcharge-plus-your-own-refund is a
valid-but-manual stopgap (the "Browserbase" bookkeeping cost). Never *silently* route async to `upto`.

**Fix:** for settle-later work there is no honest live scheme yet — say so (see `knowledge.md`
async branch). Only use `upto` when the cost is knowable and the work completes before you send the
response.

---

## 7. Wrong network id / asset / price format

- Network is a **CAIP-2** id: Base Sepolia = `eip155:84532`, Base mainnet = `eip155:8453`. Never a
  bare `"base-sepolia"` string (that's v1).
- Default asset is **USDC**; on testnet, USDC on Base Sepolia.
- Price is a string like `"$0.02"` in the `accepts[]` entry (see `examples/canonical-next-cdp/proxy.ts`).

---

## 8. Facilitator wiring: keyless `{ url }` vs CDP config

The generic framework examples use `new HTTPFacilitatorClient({ url: FACILITATOR_URL })` (keyless
x402.org). **This skill uses CDP:** `new HTTPFacilitatorClient(cdpFacilitator)` where
`cdpFacilitator` is `import { facilitator as cdpFacilitator } from "@coinbase/x402"`. Don't leave the
keyless form in generated code, and don't forget to install `@coinbase/x402`.

---

## 9. Secrets & PII

Never write real key values into tracked files, logs, or chat. Emit only placeholders in
`.env.example`. During the T2 dry-run, never log the CDP secret or the buyer wallet private key.

---

## 10. `upto` and `batch-settlement` are Permit2-based — wire gas-sponsoring + client RPC

**This is the single most common reason a non-`exact` route "doesn't settle."** Only `exact` uses
EIP-3009 (no pre-approval — the simplest path). `upto` and `batch-settlement` settle via **Permit2**,
which needs the buyer to have a USDC allowance to the Permit2 contract. To keep that gasless (no manual
approval step), you must wire **both** sides:

- **Server:** add a gas-sponsoring extension to the Permit2 route. For USDC use
  `declareEip2612GasSponsoringExtension()` (from `@x402/extensions`) so the facilitator sponsors the
  allowance via a signed EIP-2612 permit. (CDP advertises `eip2612GasSponsoring`.) Example on the
  `upto` route:
  ```ts
  extensions: { ...discovery({ example }, { post: true }), ...declareEip2612GasSponsoringExtension() }
  ```
- **Client/buyer:** the paying client must pass an **`rpcUrl`** to the scheme, e.g.
  `new UptoEvmScheme({ rpcUrl })` / `new BatchSettlementEvmScheme(..., { rpcUrl })`, so it can read the
  buyer's on-chain EIP-2612 nonce and build the gasless permit. Without it the call 402s with
  `permit2_payload_allowance_required`.

**Fix:** whenever you generate an `upto` or `batch-settlement` route, add the gas-sponsoring extension
on the server, and in any T2 buyer/test client set `rpcUrl` (Base Sepolia default
`https://sepolia.base.org`). Wire this from the start — don't wait for the 402 to discover it.

---

## 11. batch-settlement channel state persists — reset it between one-shot test runs

batch-settlement accrues **cumulative vouchers** against a channel and (with `STORAGE_DIR`) persists
that state to disk. A fresh one-shot test client can desync from the persisted channel and fail with
`cumulative_amount_mismatch`. **Fix:** delete the channel storage dir (e.g. `.x402-channels/`) to reset
between independent test runs. Also: the first call **opens the channel** (a deposit), and batching
means a settlement receipt header won't appear on every subsequent call — that's normal, not a failure.
