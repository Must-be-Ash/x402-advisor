import type { Answers, Inspection } from "./x402/inspect";
import type { AdvisorPlan } from "./x402/plan";

export interface PlanInput {
  network: string;
  docsUrls: string[];
  openapi?: { mode: "url" | "paste"; value: string };
  notes?: string;
  githubUrl?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** POST /api/inspect and consume the NDJSON progress stream → Inspection. */
export async function inspect(
  input: PlanInput,
  onProgress: (message: string) => void,
): Promise<Inspection> {
  const res = await fetch("/api/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.body) throw new Error("No response stream");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let inspection: Inspection | null = null;
  let error: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const ev = JSON.parse(line) as
        | { type: "progress"; message: string }
        | { type: "result"; inspection: Inspection }
        | { type: "error"; message: string };
      if (ev.type === "progress") onProgress(ev.message);
      else if (ev.type === "result") inspection = ev.inspection;
      else if (ev.type === "error") error = ev.message;
    }
  }

  if (error) throw new Error(error);
  if (!inspection) throw new Error("No inspection returned");
  return inspection;
}

/** POST /api/plan with the user's confirmed answers → AdvisorPlan. */
export async function buildPlan(answers: Answers): Promise<AdvisorPlan> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(answers),
  });
  const data = (await res.json()) as { plan: AdvisorPlan } | { error: string };
  if ("error" in data) throw new Error(data.error);
  return data.plan;
}

/** POST /api/chat to iterate the plan. Returns the reply + updated plan. */
export async function sendChat(
  messages: ChatMessage[],
  plan: AdvisorPlan,
  contextDigest: string,
): Promise<{ reply: string; plan: AdvisorPlan }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, plan, contextDigest }),
  });
  const data = (await res.json()) as
    | { reply: string; plan: AdvisorPlan }
    | { error: string };
  if ("error" in data) throw new Error(data.error);
  return data;
}
