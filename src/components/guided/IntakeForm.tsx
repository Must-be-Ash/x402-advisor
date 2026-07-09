"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { PlanInput } from "@/lib/plan-client";

const NETWORK = "eip155:84532"; // Base Sepolia (testnet) by default

export function IntakeForm({ onSubmit }: { onSubmit: (input: PlanInput) => void }) {
  const [notes, setNotes] = useState("");
  const [docsText, setDocsText] = useState("");
  const [openapiMode, setOpenapiMode] = useState<"url" | "paste">("url");
  const [openapiValue, setOpenapiValue] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  const hasInput =
    notes.trim() || docsText.trim() || openapiValue.trim() || githubUrl.trim();

  function submit() {
    const docsUrls = docsText
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    onSubmit({
      network: NETWORK,
      docsUrls,
      openapi: openapiValue.trim()
        ? { mode: openapiMode, value: openapiValue.trim() }
        : undefined,
      notes: notes.trim() || undefined,
      githubUrl: githubUrl.trim() || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-cb-black">
          Get an x402 setup plan
        </h1>
        <p className="mt-2 text-base text-cb-gray-600">
          Paste a docs link, an OpenAPI spec, a GitHub repo, or just describe your
          API. The advisor reads it and forms a plan you can refine in chat and
          share with your team — no code, no setup required.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Describe your API</Label>
        <Textarea
          id="notes"
          rows={4}
          placeholder="e.g. We have a /search endpoint (flat $0.01) and a /render endpoint that runs an async video job — cost depends on length and is known when it finishes."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="docs">Docs URL(s)</Label>
        <Textarea
          id="docs"
          rows={2}
          placeholder="https://docs.yourapi.com  (one per line)"
          value={docsText}
          onChange={(e) => setDocsText(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>OpenAPI spec</Label>
          <Tabs
            value={openapiMode}
            onValueChange={(v) => setOpenapiMode(v as "url" | "paste")}
          >
            <TabsList>
              <TabsTrigger value="url">URL</TabsTrigger>
              <TabsTrigger value="paste">Paste</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {openapiMode === "url" ? (
          <Input
            placeholder="https://api.yourapi.com/openapi.json"
            value={openapiValue}
            onChange={(e) => setOpenapiValue(e.target.value)}
          />
        ) : (
          <Textarea
            rows={4}
            className="font-mono text-xs"
            placeholder="Paste openapi.json / yaml here"
            value={openapiValue}
            onChange={(e) => setOpenapiValue(e.target.value)}
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gh">GitHub repo (optional)</Label>
        <Input
          id="gh"
          placeholder="https://github.com/org/repo"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
        />
      </div>

      <div className="pt-2">
        <Button size="lg" disabled={!hasInput} onClick={submit}>
          Get my plan
        </Button>
      </div>
    </div>
  );
}
