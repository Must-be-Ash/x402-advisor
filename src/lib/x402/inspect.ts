// Step 1 (inspect): what the advisor understood + the questions it needs answered.

export type Pricing = "fixed" | "varies-by-input" | "unknown-until-after";
export type Delivery = "sync" | "async";

export interface DiscoveredEndpoint {
  method: string;
  path: string;
  description: string;
  pricing: Pricing; // advisor's best guess
  delivery: Delivery; // advisor's best guess
  priceUsd: number; // suggested starting price (0 if unknown)
}

export interface GlobalQuestion {
  id: string;
  label: string;
  help: string;
  options: { value: string; label: string }[];
  default: string;
}

export interface Inspection {
  serviceName: string;
  network: string;
  overview: string;
  contextDigest: string;
  endpoints: DiscoveredEndpoint[];
  globalQuestions: GlobalQuestion[];
}

// User's confirmed answers → input to /api/plan
export interface Answers {
  serviceName: string;
  network: string;
  overview: string;
  contextDigest: string;
  endpoints: DiscoveredEndpoint[]; // edited by the user
  globals: Record<string, string>; // questionId → chosen value
}

export const INSPECT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    serviceName: { type: "string" },
    network: { type: "string" },
    overview: { type: "string" },
    contextDigest: { type: "string" },
    endpoints: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          method: { type: "string" },
          path: { type: "string" },
          description: { type: "string" },
          pricing: {
            type: "string",
            enum: ["fixed", "varies-by-input", "unknown-until-after"],
          },
          delivery: { type: "string", enum: ["sync", "async"] },
          priceUsd: { type: "number" },
        },
        required: ["method", "path", "description", "pricing", "delivery", "priceUsd"],
      },
    },
    globalQuestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          help: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                value: { type: "string" },
                label: { type: "string" },
              },
              required: ["value", "label"],
            },
          },
          default: { type: "string" },
        },
        required: ["id", "label", "help", "options", "default"],
      },
    },
  },
  required: [
    "serviceName",
    "network",
    "overview",
    "contextDigest",
    "endpoints",
    "globalQuestions",
  ],
} as const;
