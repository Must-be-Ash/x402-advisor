# app-advisor — x402 Setup Advisor

An **advisor-only** experiment. Paste your API **docs URL / OpenAPI / GitHub repo / a description** → it crawls your product → then, like the `x402-start` skill, it **forms a plan** and lets you **iterate in a chat**. No code generation, no dashboard, no manual entry — just advice you can share.

Output is a **table** (each endpoint → recommended x402 setup) with **plain-language one-liner explanations** (so a teammate who's never heard of "SIWX" gets it), plus a **downloadable markdown spec**.

The advisor's brain is the bundled **`x402-start` skill** (`src/skill/`): its `reference/` (knowledge, capability gate, pitfalls, decision guide, facilitator) and canonical examples. It follows the skill's exact stance — e.g. `auth-capture` is treated as *coming soon* and never recommended; honest settle-later alternatives are offered instead.

## Run

```bash
npm install
npm run dev   # http://localhost:3000
```

Requires `.env.local` with `ANTHROPIC_API_KEY` and `FIRECRAWL_API_KEY` (gitignored).

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · `@anthropic-ai/sdk` (`claude-opus-4-8`) · Firecrawl. Coinbase-styled (Coinbase Sans/Mono, cb palette).

## ⚠️ Brand assets — before making this repo public

This repo is **private**. It ships **proprietary Coinbase brand assets**:

- `public/fonts/Coinbase_*.woff2` — Coinbase Sans / Mono (proprietary)
- `public/logos/cb.svg` — the Coinbase mark

**Before making the repo public**, remove or replace these: delete the font files (and the `localFont` block in `src/app/layout.tsx`, so it falls back to a system sans), and swap `cb.svg` for a neutral mark. No secrets are committed — `.env*` is gitignored.
