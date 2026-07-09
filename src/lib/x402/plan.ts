// Tolerant JSON parse for model output — strips ```json fences / preamble.
export function parseModelJson<T>(text: string): T {
  let t = text.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) t = fence[1].trim();
  if (!t.startsWith("{")) {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) t = t.slice(a, b + 1);
  }
  return JSON.parse(t) as T;
}

// The advisor plan: what Claude returns and what the UI renders / exports.

export type PlanScheme = "exact" | "upto" | "batch-settlement" | "none";

export interface PlanEndpoint {
  method: string;
  path: string;
  description: string;
  scheme: PlanScheme; // recommendable schemes only ("none" = not a paid endpoint / deferred)
  schemeLabel: string; // human label, e.g. "Exact", "Up-to", "Batch settlement"
  schemeNote: string; // reasoning + honest caveat (e.g. auth-capture coming soon)
  extensions: string[]; // recommendable extension keys, e.g. ["bazaar","builder-code","sign-in-with-x"]
  priceHint: string; // e.g. "$0.01" or "cap = maxTokens × $0.00002"
  confidence: "high" | "medium" | "low";
}

export interface GlossaryItem {
  term: string;
  explanation: string; // one-line, jargon-free
}

export interface AdvisorPlan {
  serviceName: string;
  network: string;
  summary: string;
  endpoints: PlanEndpoint[];
  glossary: GlossaryItem[];
  nextSteps: string[];
  caveats: string[];
  contextDigest: string; // compact product summary to keep chat turns cheap
  openingMessage: string; // advisor's first chat turn: framing + clarifying questions
}

// ── JSON Schemas for Anthropic structured output ─────────────────────────
const PLAN_SCHEMA_OBJECT = {
  type: "object",
  additionalProperties: false,
  properties: {
    serviceName: { type: "string" },
    network: { type: "string" },
    summary: { type: "string" },
    endpoints: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          method: { type: "string" },
          path: { type: "string" },
          description: { type: "string" },
          scheme: {
            type: "string",
            enum: ["exact", "upto", "batch-settlement", "none"],
          },
          schemeLabel: { type: "string" },
          schemeNote: { type: "string" },
          extensions: { type: "array", items: { type: "string" } },
          priceHint: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: [
          "method",
          "path",
          "description",
          "scheme",
          "schemeLabel",
          "schemeNote",
          "extensions",
          "priceHint",
          "confidence",
        ],
      },
    },
    glossary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          term: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["term", "explanation"],
      },
    },
    nextSteps: { type: "array", items: { type: "string" } },
    caveats: { type: "array", items: { type: "string" } },
    contextDigest: { type: "string" },
    openingMessage: { type: "string" },
  },
  required: [
    "serviceName",
    "network",
    "summary",
    "endpoints",
    "glossary",
    "nextSteps",
    "caveats",
    "contextDigest",
    "openingMessage",
  ],
} as const;

export const PLAN_JSON_SCHEMA = PLAN_SCHEMA_OBJECT;

/** Chat turn returns a conversational reply plus the (possibly updated) full plan. */
export const CHAT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    plan: PLAN_SCHEMA_OBJECT,
  },
  required: ["reply", "plan"],
} as const;
