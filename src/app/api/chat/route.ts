import Anthropic from "@anthropic-ai/sdk";
import { buildAdvisorSystemPrompt } from "@/lib/x402/advisor-prompt";
import { CHAT_JSON_SCHEMA, parseModelJson, type AdvisorPlan } from "@/lib/x402/plan";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = "claude-opus-4-8";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
interface ChatBody {
  messages: ChatMessage[];
  plan: AdvisorPlan;
  contextDigest: string;
}

export async function POST(req: Request) {
  try {
    const { messages, plan, contextDigest } = (await req.json()) as ChatBody;
    if (!messages?.length) {
      return Response.json({ error: "No messages" }, { status: 400 });
    }

    const client = new Anthropic();

    // Prime with the product digest + current plan, then replay the conversation.
    const primed: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Product context (digest):\n${contextDigest}\n\nCurrent plan (JSON):\n${JSON.stringify(
          plan,
        )}\n\nI'll now ask questions and request changes to this plan. For each of my messages, reply briefly and return the FULL updated plan (unchanged if I didn't ask for a change). Keep following the skill rules (recommendable schemes only; auth-capture is coming soon).`,
      },
      { role: "assistant", content: "Got it — I'll advise and keep the plan updated." },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: buildAdvisorSystemPrompt("plan"),
      messages: primed,
      output_config: { format: { type: "json_schema", schema: CHAT_JSON_SCHEMA } },
    } as Anthropic.MessageCreateParamsNonStreaming);

    if (msg.stop_reason === "refusal") {
      return Response.json({ error: "The request was declined." }, { status: 200 });
    }

    const text = msg.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    )?.text;
    if (!text) return Response.json({ error: "No response." }, { status: 200 });

    const parsed = parseModelJson<{ reply: string; plan: AdvisorPlan }>(text);
    return Response.json(parsed);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Chat failed." },
      { status: 500 },
    );
  }
}
