import { readFileSync } from "fs";
import { join } from "path";

// The advisor's brain = the bundled x402-start skill reference (src/skill/).
// We inline the core decision files into the system prompt. capability.json is
// the authoritative gate for what is recommendable.
const REFERENCE_FILES = [
  "capability.json",
  "knowledge.md",
  "pitfalls.md",
  "decision-guide.md",
  "facilitator.md",
] as const;

let cached: string | null = null;

/** Read the bundled x402-start reference files into one labeled string for the system prompt. */
export function loadSkillBrain(): string {
  if (cached) return cached;
  const base = join(process.cwd(), "src", "skill", "reference");
  const parts = REFERENCE_FILES.map((f) => {
    const body = readFileSync(join(base, f), "utf8").trim();
    return `===== x402-start/reference/${f} =====\n${body}`;
  });
  cached = parts.join("\n\n");
  return cached;
}
