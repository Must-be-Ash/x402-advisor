import Anthropic from "@anthropic-ai/sdk";
import { fetchGithubReadme, fetchPage } from "@/lib/fetch/fetchPage";
import { buildAdvisorSystemPrompt } from "@/lib/x402/advisor-prompt";
import { INSPECT_JSON_SCHEMA, type Inspection } from "@/lib/x402/inspect";
import { parseModelJson } from "@/lib/x402/plan";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = "claude-opus-4-8";
const MAX_CONTEXT_CHARS = 90_000;

interface InspectBody {
  network?: string;
  docsUrls?: string[];
  openapi?: { mode: "url" | "paste"; value: string };
  notes?: string;
  githubUrl?: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as InspectBody;
  const network = body.network || "eip155:84532";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      const progress = (message: string) => send({ type: "progress", message });

      try {
        const sections: string[] = [];

        if (body.notes?.trim()) {
          progress("Reading your description…");
          sections.push(`# Author notes\n${body.notes.trim()}`);
        }
        if (body.openapi?.value?.trim()) {
          if (body.openapi.mode === "url") {
            progress("Fetching OpenAPI spec…");
            const r = await fetchPage(body.openapi.value.trim());
            sections.push(`# OpenAPI spec (${r.source})\n${r.markdown}`);
          } else {
            progress("Reading pasted OpenAPI spec…");
            sections.push(`# OpenAPI spec (pasted)\n${body.openapi.value.trim()}`);
          }
        }
        for (const url of body.docsUrls ?? []) {
          if (!url.trim()) continue;
          progress(`Crawling ${url}…`);
          const r = await fetchPage(url.trim());
          progress(r.source === "error" ? `Could not fetch ${url}` : `Read ${url} (${r.source})`);
          if (r.markdown) sections.push(`# Docs: ${url} (${r.source})\n${r.markdown}`);
        }
        if (body.githubUrl?.trim()) {
          progress("Fetching GitHub README…");
          const r = await fetchGithubReadme(body.githubUrl.trim());
          if (r.markdown) sections.push(`# GitHub README\n${r.markdown}`);
        }

        let context = sections.join("\n\n---\n\n");
        if (!context.trim()) {
          send({ type: "error", message: "No usable input was provided." });
          controller.close();
          return;
        }
        if (context.length > MAX_CONTEXT_CHARS) {
          context = context.slice(0, MAX_CONTEXT_CHARS) + "\n\n…[truncated]";
          progress("Input was large — truncated to fit.");
        }

        progress("Understanding your API…");
        const client = new Anthropic();
        const msg = await client.messages.create({
          model: MODEL,
          max_tokens: 6000,
          system: buildAdvisorSystemPrompt("inspect"),
          messages: [
            {
              role: "user",
              content: `Inspect this product material (default network ${network}). Understand it and return the inspection with your best-guess per-endpoint fields and the clarifying questions you need answered.\n\n${context}`,
            },
          ],
          output_config: { format: { type: "json_schema", schema: INSPECT_JSON_SCHEMA } },
        } as Anthropic.MessageCreateParamsNonStreaming);

        if (msg.stop_reason === "refusal") {
          send({ type: "error", message: "The request was declined." });
          controller.close();
          return;
        }
        const text = msg.content.find(
          (b): b is Anthropic.TextBlock => b.type === "text",
        )?.text;
        if (!text) {
          send({ type: "error", message: "No inspection returned." });
          controller.close();
          return;
        }

        const inspection = parseModelJson<Inspection>(text);
        if (!inspection.network) inspection.network = network;
        progress(`Found ${inspection.endpoints.length} endpoint(s).`);
        send({ type: "result", inspection });
        controller.close();
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Inspection failed.",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
