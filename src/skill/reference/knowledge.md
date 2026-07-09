# x402 decision rules — the curated opinion (what to choose and why)

> This is the **judgment layer**. The bundled `docs/` and `examples/` tell you *how* to write x402
> code; this file tells you *what to choose*. The raw docs will never say "this case → this scheme,
> and here's why" — that's the value here. Recommend from this, then read the matching example for
> exact syntax. **v2 only.**
>
> **Authoritative gate:** `reference/capability.json`. Only recommend a scheme/extension with
> `recommendable: true` there. Live schemes today: **`exact`, `upto`, `batch-settlement`**.
> **`auth-capture` is deferred** (spec-only, no server SDK) — describe it as "coming soon," never
> recommend or generate it.

---

## The schemes, in plain language

| Scheme | Mental model | Money moves… | Status |
|---|---|---|---|
| **`exact`** | Vending machine | now, a fixed known amount | ✅ live |
| **`upto`** | Taxi meter (paid at drop-off) | at the end of the **same HTTP response**, ≤ a signed cap | ✅ live |
| **`batch-settlement`** | Bar tab | many micro-calls accumulated, settled together later | ✅ live (needs a commitment ledger) |
| **`auth-capture`** | Hotel hold | authorize now, capture the real amount later, refund the rest | ⛔ coming soon — **do not recommend/generate** |

---

## The decision flow (drive this via AskUserQuestion — see `decision-guide.md`)

Ask in plain business language, recommend the mapped answer, and **always let the dev confirm**.

### Q1 — When do you know the price of a call?
- **Fixed, same every time** → **`exact`**. (The 90% path. One price string.)
- **Known before serving, but varies by input** (tier / region / size / model) → **`exact` + a dynamic `price` callback**.
- **Only known *after* the work** → go to Q2.

### Q2 — Is the final cost known *before you send the HTTP response*, or only *after you return*?
> Frame it on **cost-timing**, not the word "async." An LLM stream is HTTP-synchronous but its cost
> is only known when the stream ends — that's `upto`, not settle-later. This axis is ambiguous;
> **never auto-decide it — confirm with the dev.**
- **Known by the time you respond, and metered during the call** (tokens, bytes) → **`upto`**, cap = worst case, settle the actual amount.
- **Only known after you've already returned** (you hand back a job id, finish later, deliver by poll/webhook) → **the settle-later branch** (below). Do **not** pick `upto` here.

### Q3 — Do you get a flood of tiny calls from the same caller where per-call settlement is wasteful?
- **Yes, and you're willing to run a channel manager** → consider **`batch-settlement`** (an
  escrow/channel scheme: the buyer deposits into a channel, you settle the actual amount and refund the
  rest, and a background channel manager claims/settles in batches). Permit2-based — see `pitfalls.md` #10.
- Otherwise keep it simple (`exact`).

### Q4 — Is this a deferred-delivery pattern (job id + poll / webhook / 202), or do you otherwise need to know *who* is calling?
- **Yes** → add **`sign-in-with-x`** (SIWX) so a caller can claim **their** result / get per-identity
  limits / free tiers. **Trigger on the deferred-delivery signal itself, not on any scheme name** —
  this stays live even though the settle-later payment scheme is deferred.

### Q5 — Does the payout address change per call? (marketplace, multi-tenant, rev-share)
- **Yes** → dynamic **`payTo`** callback.

---

## The settle-later branch (cost known only after you return)

**First, rule out the easy case.** Is the final cost a **deterministic function of parameters you
already have at submit time** (resolution, duration, size, tier)? If yes, there is **no settle-later
problem** — price it **`exact` up front** with a dynamic `price` callback from those params, return the
job id, and you're done. A "render job" whose cost = f(resolution, duration) is just `exact` + dynamic
price, **not** a hard case. Check this before anything else.

Only when the cost is **genuinely unknowable until the work finishes** (e.g. billed by actual
GPU-seconds that vary unpredictably) is this the hard case. There is **no purpose-built live scheme**
for it yet — `auth-capture` (hold now, capture the actual amount later, auto-refund the rest) is the
intended fix and its server SDK hasn't shipped. Be honest about that, then offer these options
(best-fit first — recommend, let the dev choose):

1. **`exact` up front from whatever you can derive** — simplest honest option when the cost is even
   roughly a function of known params. Add `sign-in-with-x` so the caller claims their result.
2. **`batch-settlement` as an escrow** — this is a **real, live escrow mechanism**, not just a
   micro-call tool. The buyer **deposits into an on-chain channel up front** (which *protects you if
   they walk away mid-compute*), you serve the work and **settle the actual amount** via a settlement
   override (charge ≤ the per-request max), and idle channels are **cooperatively refunded**. That
   deposit → settle-actual → refund shape is the closest live stand-in for a hold/capture on a single
   long job. Caveat: you must run the channel infrastructure (storage + a channel manager), so it's
   heavier and is really designed for call *volume* — but it genuinely works here. It's Permit2-based
   (see `pitfalls.md` #10).
3. **`upto`** — only if the work can actually finish within the HTTP response.
4. **`exact` overcharge + your own refund** — charge a ceiling up front and refund the unused portion
   yourself. Honest and simple, but it puts refund bookkeeping on you (the "Browserbase hack"). A fine
   stopgap if the team accepts that cost.
5. **Wait for `auth-capture`** — run `/x402-start sync`; the day its server SDK lands, this skill
   recommends it automatically.

**Never emit `scheme: "auth-capture"`** (no server SDK). Never *silently* route genuine settle-later
work to `upto`. Present the real tradeoffs (escrow-vs-overcharge-vs-wait) and let the dev decide.

---

## Extensions — recommend, don't bury (only if `recommendable: true`)

| Extension | Real server export | Auto-recommend when | What it buys |
|---|---|---|---|
| **`builder-code`** | `builderCodeResourceServerExtension` / `declareBuilderCodeExtension` | always (per-team `BASE_BUILDER_CODE`) | attribution / builder rewards |
| **`bazaar`** | `bazaarResourceServerExtension` / `declareDiscoveryExtension` | always, unless they opt out of discovery | discoverability in the Bazaar |
| **`sign-in-with-x`** (SIWX) | `createSIWxResourceServerExtension` | identity needed OR deferred-delivery detected | "claim your own async result," per-identity limits, free tiers |
| **`offer-receipt`** | `createOfferReceiptExtension` | team needs audit / receipts / disputes | signed offer + receipt (machine-verifiable proof) |
| **`payment-identifier`** | `declarePaymentIdentifierExtension` | you need to correlate a payment to a request id | payment↔request correlation |
| **`auth-hints`** | — (spec-only, no example) | **never auto-generate** — mention only | tells clients which option needs auth |

> "SIWX" = the `sign-in-with-x` extension (identifier `sign-in-with-x`). Same thing — use the
> canonical identifier in generated code. Always read the extension's server example
> (`examples/servers/<ext>`) before wiring it, using the real export above. `auth-hints` has no
> server example — do not generate it; point at `docs/_specs/`-style spec material if asked.

---

## Mapping the four common provider shapes

| Shape | Examples | Recommendation |
|---|---|---|
| One/few endpoints, one known price | Exa, Tavily | `exact`, single price |
| Many endpoints, each a different known price | X, Browserbase (per-endpoint) | `exact` with a per-route price map |
| Sync metered (cost known by response time) | streaming/token APIs | `upto` with a worst-case cap |
| Genuine settle-later (cost known after you return) | render/job APIs | **honest "coming soon"** (see above) + SIWX for claiming |
| High-volume micro-calls + own ledger | high-frequency callers | `batch-settlement` |
| A mix | multi-product APIs | per-route mixed **live** schemes in one config |

---

## Canonical code shapes (read the example, then generate)

- **Next.js (default target):** `examples/canonical-next-cdp/proxy.ts` — CDP facilitator +
  `bazaarResourceServerExtension` + `builderCodeResourceServerExtension` +
  `paymentProxyFromHTTPServer`. **Source of truth for the CDP wiring.**
- **Express / Hono / Fastify:** `examples/servers/{express,hono,fastify}` for structure, then apply
  the CDP facilitator swap in **`examples/canonical-cdp-snippets.md`** (the bundled examples use the
  keyless `{ url }` form — do not ship it). `paymentMiddleware(routes, resourceServer)` mount.
- **`upto`:** `examples/servers/upto` — `import { UptoEvmScheme } from "@x402/evm/upto/server"`;
  `.register("eip155:84532", new UptoEvmScheme())`.
- **`batch-settlement`:** `examples/servers/batch-settlement` —
  `import { BatchSettlementEvmScheme } from "@x402/evm/batch-settlement/server"`.
- **SIWX:** `examples/servers/sign-in-with-x`. **offer-receipt:** `examples/servers/offer-receipt`.

Common to all: network `eip155:84532` (Base Sepolia) + USDC for the first run; flip to `eip155:8453`
for mainnet. Price strings like `"$0.02"`. Always give each route a valid Bazaar `output` (see
`pitfalls.md` #2).
