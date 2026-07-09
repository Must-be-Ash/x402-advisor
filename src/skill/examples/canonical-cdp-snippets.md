# Canonical CDP wiring for non-Next stacks (Express / Hono / Fastify)

The bundled `examples/servers/{express,hono,fastify}` are correct v2 — but they use the **keyless**
testing facilitator (`new HTTPFacilitatorClient({ url: FACILITATOR_URL })`). This skill uses the
**CDP facilitator**. When you generate middleware for these frameworks, start from the bundled
example for the framework's structure, then apply the **exact swap below**. (For Next.js, use
`examples/canonical-next-cdp/proxy.ts` directly — it's already CDP-shaped.)

## The only change vs the bundled examples: the facilitator client

```ts
// ❌ bundled example (keyless x402.org — for the SDK's own testing)
import { HTTPFacilitatorClient } from "@x402/core/server";
const facilitatorClient = new HTTPFacilitatorClient({ url: process.env.FACILITATOR_URL });

// ✅ this skill (CDP facilitator — supports all live schemes, one-line testnet→mainnet, Bazaar)
import { HTTPFacilitatorClient } from "@x402/core/server";
import { facilitator as cdpFacilitator } from "@coinbase/x402"; // reads CDP_API_KEY_ID / CDP_API_KEY_SECRET
const facilitatorClient = new HTTPFacilitatorClient(cdpFacilitator);
```

Everything else (the `x402ResourceServer(...).register("eip155:84532", new ExactEvmScheme())` call,
the `paymentMiddleware(routes, resourceServer)` mount, the `accepts[]` route map) stays as in the
bundled framework example. **Remember to install `@coinbase/x402`** (it transitively needs
`@coinbase/cdp-sdk`).

## Express
```ts
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { facilitator as cdpFacilitator } from "@coinbase/x402";

const facilitatorClient = new HTTPFacilitatorClient(cdpFacilitator);
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register("eip155:84532", new ExactEvmScheme());

const app = express();
app.use(paymentMiddleware(
  { "/paid": { accepts: [{ scheme: "exact", price: "$0.02", network: "eip155:84532", payTo: PAY_TO }],
               description: "…", mimeType: "application/json" }] },
  resourceServer,
));
```

## Hono
```ts
import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { facilitator as cdpFacilitator } from "@coinbase/x402";

const facilitatorClient = new HTTPFacilitatorClient(cdpFacilitator);
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register("eip155:84532", new ExactEvmScheme());

const app = new Hono();
app.use(paymentMiddleware({ /* routes */ }, resourceServer));
```

## Fastify
```ts
import Fastify from "fastify";
import { paymentMiddleware, x402ResourceServer } from "@x402/fastify";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { facilitator as cdpFacilitator } from "@coinbase/x402";

const facilitatorClient = new HTTPFacilitatorClient(cdpFacilitator);
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register("eip155:84532", new ExactEvmScheme());

const app = Fastify();
paymentMiddleware(app, { /* routes */ }, resourceServer); // see examples/servers/fastify for exact arg order
```

## Bazaar + builder-code on non-Next
The `.registerExtension(bazaarResourceServerExtension)` / `.registerExtension(builderCodeResourceServerExtension)`
registration form is shown in `examples/canonical-next-cdp/proxy.ts` — the same `x402ResourceServer`
methods apply on Express/Hono/Fastify. Per-route, add `declareDiscoveryExtension({ output: { example, … } })`
(present `output` REQUIRED, `schema` optional) and `declareBuilderCodeExtension(BASE_BUILDER_CODE)`.

## Self-check before you're done (any stack)
- [ ] The facilitator client is `new HTTPFacilitatorClient(cdpFacilitator)` — **not** `{ url: … }`.
- [ ] `@coinbase/x402` is in the installed dependencies.
- [ ] Every paid route declares a Bazaar `output` object with at least an `example`.
- [ ] Networks are CAIP-2 (`eip155:84532` testnet), asset USDC, prices are strings like `"$0.02"`.
