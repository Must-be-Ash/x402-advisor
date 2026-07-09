import {
  paymentProxyFromHTTPServer,
  x402ResourceServer,
  x402HTTPResourceServer,
} from "@x402/next";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import {
  bazaarResourceServerExtension,
  declareDiscoveryExtension,
} from "@x402/extensions/bazaar";
import {
  BUILDER_CODE,
  builderCodeResourceServerExtension,
  declareBuilderCodeExtension,
} from "@x402/extensions/builder-code";
import { facilitator as cdpFacilitator } from "@coinbase/x402";

const payTo = "0xC55bBDD975256f88cD34Fe77F95A24660e5543AE";

const builderCode = process.env.BASE_BUILDER_CODE;
const builderCodeExt = builderCode
  ? { [BUILDER_CODE]: declareBuilderCodeExtension(builderCode) }
  : {};

// CDP facilitator — verify+settle require CDP_API_KEY_ID + CDP_API_KEY_SECRET
// env vars (read automatically by @coinbase/x402). Switching off x402.org so
// payments settle through CDP and our endpoints get cataloged in the CDP Bazaar.
const facilitatorClient = new HTTPFacilitatorClient(cdpFacilitator);

const resourceServer = new x402ResourceServer(facilitatorClient)
  .register("eip155:84532", new ExactEvmScheme())
  .registerExtension(bazaarResourceServerExtension)
  .registerExtension(builderCodeResourceServerExtension);

const routes = {
  "/api/random": {
    accepts: [
      {
        scheme: "exact" as const,
        price: "$0.02",
        network: "eip155:84532" as const,
        payTo,
      },
    ],
    description: "Get a random number 1-9",
    mimeType: "application/json",
    extensions: {
      ...builderCodeExt,
    },
  },
  "/api/half": {
    accepts: [
      {
        scheme: "exact" as const,
        price: "$0.001",
        network: "eip155:84532" as const,
        payTo,
      },
    ],
    description: "Has a bazaar extension but missing info.output",
    mimeType: "application/json",
    extensions: {
      // declareDiscoveryExtension WITHOUT an `output` key — the resulting
      // info.input is auto-generated but info.output is missing. Fixture for
      // the bazaar.info.output failure case in bazaar-validate.
      ...declareDiscoveryExtension({
        input: { ok: true },
      }),
      ...builderCodeExt,
    },
  },
  "/api/correct": {
    accepts: [
      {
        scheme: "exact" as const,
        price: "$0.001",
        network: "eip155:84532" as const,
        payTo,
      },
    ],
    description: "Fully valid bazaar fixture (awaiting_first_payment / indexed)",
    mimeType: "application/json",
    extensions: {
      // declareDiscoveryExtension WITH a complete output (example + schema)
      // → every check passes. Lands in `awaiting_first_payment` in
      // bazaar-validate until the first CDP verify+settle.
      ...declareDiscoveryExtension({
        output: {
          example: { status: "ok", value: 42 },
          schema: {
            type: "object",
            properties: {
              status: { type: "string" },
              value: { type: "number" },
            },
            required: ["status", "value"],
          },
        },
      }),
      ...builderCodeExt,
    },
  },
};

const httpServer = new x402HTTPResourceServer(resourceServer, routes);

// Next.js 16 renamed the middleware convention to "proxy":
//   - file is `proxy.ts` (not `middleware.ts`)
//   - exported symbol is `proxy` (not `middleware`)
//   - always runs on Node.js runtime (no `runtime` export)
//   - no route-segment `config` export — paymentProxyFromHTTPServer's
//     httpServer config decides which routes to intercept; everything else
//     passes through.
export const proxy = paymentProxyFromHTTPServer(httpServer);
