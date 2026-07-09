"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  Answers,
  Delivery,
  DiscoveredEndpoint,
  Inspection,
  Pricing,
} from "@/lib/x402/inspect";

const PRICING_OPTIONS: { value: Pricing; label: string }[] = [
  { value: "fixed", label: "Flat / known" },
  { value: "varies-by-input", label: "Varies by input" },
  { value: "unknown-until-after", label: "Only after the work" },
];
const DELIVERY_OPTIONS: { value: Delivery; label: string }[] = [
  { value: "sync", label: "Sync" },
  { value: "async", label: "Async job" },
];

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-lg border border-cb-gray-200 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs transition-colors",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "text-cb-gray-600 hover:text-cb-black",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface Props {
  inspection: Inspection;
  busy: boolean;
  onSubmit: (answers: Answers) => void;
}

export function InterviewForm({ inspection, busy, onSubmit }: Props) {
  const [endpoints, setEndpoints] = useState<DiscoveredEndpoint[]>(
    inspection.endpoints,
  );
  const [globals, setGlobals] = useState<Record<string, string>>(() =>
    Object.fromEntries(inspection.globalQuestions.map((q) => [q.id, q.default])),
  );

  function updateEp(i: number, patch: Partial<DiscoveredEndpoint>) {
    setEndpoints((eps) => eps.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  function submit() {
    onSubmit({
      serviceName: inspection.serviceName,
      network: inspection.network,
      overview: inspection.overview,
      contextDigest: inspection.contextDigest,
      endpoints,
      globals,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cb-black">
          A few questions about {inspection.serviceName || "your API"}
        </h1>
        <p className="mt-2 text-cb-gray-600">{inspection.overview}</p>
        <p className="mt-1 text-sm text-cb-gray-400">
          I&apos;ve pre-filled my best guesses from your docs — correct anything
          that&apos;s off, then I&apos;ll build the plan.
        </p>
      </div>

      {/* Per-endpoint */}
      <Card>
        <CardContent className="divide-y divide-cb-gray-100 p-0">
          {endpoints.map((e, i) => (
            <div key={i} className="space-y-3 p-4">
              <div className="font-mono text-sm">
                <span className="text-cb-gray-400">{e.method}</span> {e.path}
              </div>
              {e.description && (
                <p className="text-xs text-cb-gray-600">{e.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-cb-gray-400">
                    When is the price known?
                  </Label>
                  <Segmented
                    value={e.pricing}
                    onChange={(v) => updateEp(i, { pricing: v })}
                    options={PRICING_OPTIONS}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-cb-gray-400">Delivery</Label>
                  <Segmented
                    value={e.delivery}
                    onChange={(v) => updateEp(i, { delivery: v })}
                    options={DELIVERY_OPTIONS}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-cb-gray-400">Price (USD)</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-cb-gray-400">$</span>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={e.priceUsd}
                      onChange={(ev) =>
                        updateEp(i, { priceUsd: Number(ev.target.value) })
                      }
                      className="h-8 w-24"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Global questions */}
      {inspection.globalQuestions.length > 0 && (
        <Card>
          <CardContent className="space-y-4 p-4">
            {inspection.globalQuestions.map((q) => (
              <div
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div className="max-w-md">
                  <p className="text-sm text-cb-black">{q.label}</p>
                  {q.help && (
                    <p className="text-xs text-cb-gray-400">{q.help}</p>
                  )}
                </div>
                <Segmented
                  value={globals[q.id] ?? q.default}
                  onChange={(v) => setGlobals((g) => ({ ...g, [q.id]: v }))}
                  options={q.options}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button size="lg" disabled={busy} onClick={submit}>
          {busy ? "Building your plan…" : "Build my plan"}
        </Button>
      </div>
    </div>
  );
}
