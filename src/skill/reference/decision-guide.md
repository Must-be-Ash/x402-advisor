# Decision guide — the interactive AskUserQuestion script

How to run the recommender as a conversation. This mirrors `knowledge.md`, but as a sequence of
**AskUserQuestion** calls. The tool returns one batch per call and is **not** a free-form branching
interview, so **branch in-agent between calls**.

## Rules of the flow
- **≤4 questions per call, ≤4 options each, recommended option first**, each option with a one-line
  trade-off. Users can always pick "Other."
- **Sequential branching:** ask Q1, read the answer, decide whether Q2 is needed, then ask it.
- **Multi-endpoint:** first ask **"Apply one payment setup to all your endpoints, or configure each
  separately?"** Only fall into per-endpoint questioning if they choose separately.
- **Pre-fill from codebase detection**, but present it as a recommendation to confirm — never as a
  done deal. **Always confirm the cost-timing axis (Q2)**; never auto-apply it even with "apply to all."
- After the answers, **echo the mapped recommendation** and let them override any part before codegen.

## Call 1 — scope + pricing basics
Question A — "Should I apply one payment setup to all endpoints, or configure each separately?"
- Apply one setup to all (recommended for uniform APIs)
- Configure each endpoint separately

Question B — "When do you know the price of a call?"
- A fixed amount, the same every time → maps to **`exact`** *(recommended when true — simplest)*
- Known before serving, but it varies by input (tier/region/size/model) → **`exact` + dynamic price**
- Only after the work is done → *(triggers Call 2)*

## Call 2 — only if pricing = "only after the work"
Question — "Is the final cost known **before you send the HTTP response**, or only **after you've
already returned** (you hand back a job id and finish later)?"
- Known by the time I respond; I meter during the call (tokens/bytes) → **`upto`** with a worst-case cap
- Only known after I return; the work finishes later (job id + poll/webhook) → the **settle-later
  branch** in `knowledge.md`. First check if the cost is a function of params you already have at submit
  (→ `exact` up front, done). If it's truly unknowable until completion, present the live options —
  including **`batch-settlement` as an escrow** (deposit up front, settle actual, refund the rest) and
  `exact`-overcharge+refund — and let the dev choose. Never pick `upto` or emit `auth-capture`.

> This axis is genuinely ambiguous (an LLM stream is HTTP-sync but its cost is known at the end = still
> `upto`). Frame it on **cost-timing**, confirm explicitly, and state the signal you detected.

## Call 3 — extensions + payout (batch as needed)
Question A — "Do you get a flood of tiny calls from the same caller, and are you willing to run a
commitment ledger to settle them in batches?"
- No, keep it simple (recommended) → stay on the chosen scheme
- Yes → consider **`batch-settlement`**

Question B — "Is this a deferred-delivery pattern (you return a job id and the caller fetches the
result later), or do you otherwise need to know who's calling?"
- Yes → add **`sign-in-with-x`** (so callers can claim their own result / get per-identity limits)
- No

Question C — "Does the payout address change per call (marketplace / multi-tenant / rev-share)?"
- No, one payout address (recommended)
- Yes → dynamic **`payTo`** callback

## Call 4 — set the price for each paid endpoint (recommend a number, then ASK)
**Do not pick prices silently.** Teams almost always have a number in mind, so **propose a concrete
starting price per endpoint** (and for `upto`/`batch-settlement`, the **max cap** the buyer authorizes),
then **ask the dev to confirm or change each one**. Present it as an editable table, e.g.:

```
/api/quote            exact            $0.001                         -> your price?
/api/image/transform  exact + dynamic  $0.0002 per compute unit       -> your rate?
/api/summarize        upto             cap = maxTokens x $0.00002/tok  -> your cap + rate?
/api/ticker           batch-settlement $0.0002 per call (max)          -> your price?
```

Ask something like: *"Here are prices I'd suggest based on each endpoint's cost model — what do you
want to charge for each? You can accept these or set your own; they're easy to change later."* For
`upto`/`batch`, confirm the **cap** explicitly — that's the worst case the buyer signs for. Only fall
back to your recommended numbers if the dev says "use your suggestions."

## Always-on defaults (state them, allow opt-out — don't ask as blockers)
- `builder-code` — on (attribution). `bazaar` — on (discoverability), unless they opt out of discovery.
- Network: **Base Sepolia (`eip155:84532`) + USDC** for the first run; mainnet is a one-line switch later.
- Facilitator: **CDP** (explain via `facilitator.md`; they'll need a CDP API key for the T2 live test).

## Then
Map answers via `knowledge.md`, cross-check against `capability.json` (drop anything not
`recommendable`), echo the recommendation with reasoning + the doc/example each maps to, and proceed to
implement + validate per `SKILL.md`.
