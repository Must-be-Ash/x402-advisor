import Anthropic from "@anthropic-ai/sdk";
import { buildAdvisorSystemPrompt } from "@/lib/x402/advisor-prompt";
import { PLAN_JSON_SCHEMA, parseModelJson, type AdvisorPlan } from "@/lib/x402/plan";
import type { Answers } from "@/lib/x402/inspect";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = "claude-opus-4-8";

export async function POST(req: Request) {
  try {
    const a = (await req.json()) as Answers;

    const endpointLines = a.endpoints
      .map(
        (e) =>
          `- ${e.method} ${e.path} — ${e.description || "(no description)"} | pricing: ${e.pricing} | delivery: ${e.delivery} | price: $${e.priceUsd}`,
      )
      .join("\n");
    const globalLines = Object.entries(a.globals || {})
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    const userMsg = `Service: ${a.serviceName || "(unnamed)"}
Network: ${a.network}
Overview: ${a.overview}

The user CONFIRMED these per-endpoint answers:
${endpointLines}

Global answers:
${globalLines || "(none)"}

Product context (digest):
${a.contextDigest}

Build the final plan from these confirmed answers.`;

    const client = new Anthropic();
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: buildAdvisorSystemPrompt("plan"),
      messages: [{ role: "user", content: userMsg }],
      output_config: { format: { type: "json_schema", schema: PLAN_JSON_SCHEMA } },
    } as Anthropic.MessageCreateParamsNonStreaming);

    if (msg.stop_reason === "refusal") {
      return Response.json({ error: "The request was declined." }, { status: 200 });
    }
    const text = msg.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    )?.text;
    if (!text) return Response.json({ error: "No plan returned." }, { status: 200 });

    const plan = parseModelJson<AdvisorPlan>(text);
    if (!plan.network) plan.network = a.network;
    return Response.json({ plan });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Planning failed." },
      { status: 500 },
    );
  }
}
