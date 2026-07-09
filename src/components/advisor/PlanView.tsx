"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { planToMarkdown } from "@/lib/x402/plan-markdown";
import type { AdvisorPlan } from "@/lib/x402/plan";

const CONFIDENCE_COLOR = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-red-500",
} as const;

const SCHEME_SHORT: Record<string, string> = {
  exact: "Exact",
  upto: "Up-to",
  "batch-settlement": "Batch",
  none: "—",
};

/** Keep only glossary terms that actually appear in the plan (drop unused schemes/extensions). */
function relevantGlossary(plan: AdvisorPlan) {
  const schemes = new Set(plan.endpoints.map((e) => e.scheme));
  const ext = new Set(
    plan.endpoints.flatMap((e) => e.extensions.map((x) => x.toLowerCase())),
  );
  return plan.glossary.filter((g) => {
    const t = g.term.toLowerCase();
    if (/\bup-?to\b/.test(t) && !schemes.has("upto")) return false;
    if (t.includes("batch") && !schemes.has("batch-settlement")) return false;
    if (/\bexact\b/.test(t) && !schemes.has("exact")) return false;
    if (t.includes("auth-capture") || t.includes("auth capture"))
      return plan.caveats.some((c) => /auth-?capture/i.test(c));
    if (
      (t.includes("siwx") || t.includes("sign in with x") || t.includes("sign-in-with-x")) &&
      !ext.has("sign-in-with-x")
    )
      return false;
    if (t.includes("offer") && t.includes("receipt") && !ext.has("offer-receipt"))
      return false;
    if (t.includes("payment-identifier") && !ext.has("payment-identifier"))
      return false;
    return true;
  });
}

export function PlanView({ plan }: { plan: AdvisorPlan }) {
  const glossary = relevantGlossary(plan);

  function download() {
    const blob = new Blob([planToMarkdown(plan)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "x402-plan.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded x402-plan.md");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-cb-black">{plan.serviceName}</h2>
          <p className="mt-1 text-sm text-cb-gray-600">{plan.summary}</p>
        </div>
        <Button variant="outline" onClick={download}>
          <Download className="size-4" /> Download spec
        </Button>
      </div>

      <Badge variant="outline" className="font-mono text-xs">
        {plan.network}
      </Badge>

      {/* Endpoint table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recommended setup</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[19%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[17%]" />
                <col className="w-[38%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-cb-gray-100 text-left text-xs uppercase tracking-wider text-cb-gray-400">
                  <th className="px-4 py-2 font-medium">Endpoint</th>
                  <th className="px-4 py-2 font-medium">Scheme</th>
                  <th className="px-4 py-2 font-medium">Extensions</th>
                  <th className="px-4 py-2 font-medium">Price</th>
                  <th className="px-4 py-2 font-medium">Why</th>
                </tr>
              </thead>
              <tbody>
                {plan.endpoints.map((e, i) => (
                  <tr key={i} className="border-b border-cb-gray-100 align-top">
                    <td className="px-4 py-3 font-mono text-xs break-words">
                      <span className="text-cb-gray-400">{e.method}</span> {e.path}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`size-1.5 shrink-0 rounded-full ${CONFIDENCE_COLOR[e.confidence]}`}
                          title={`${e.confidence} confidence`}
                        />
                        <Badge className="whitespace-nowrap border-transparent bg-primary/10 text-primary">
                          {SCHEME_SHORT[e.scheme] ?? e.schemeLabel}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs break-words text-cb-gray-600">
                      {e.extensions.length ? e.extensions.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs break-words">
                      {e.priceHint || "—"}
                    </td>
                    <td className="px-4 py-3 leading-relaxed text-cb-gray-600">
                      {e.schemeNote}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Glossary */}
      {glossary.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">What these terms mean</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {glossary.map((g, i) => (
              <p key={i} className="text-sm">
                <span className="font-medium text-cb-black">{g.term}</span>{" "}
                <span className="text-cb-gray-600">— {g.explanation}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Next steps + caveats */}
      <div className="grid gap-4 sm:grid-cols-2">
        {plan.nextSteps.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Next steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-1 pl-4 text-sm text-cb-gray-600">
                {plan.nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
        {plan.caveats.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Caveats</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-4 text-sm text-cb-gray-600">
                {plan.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
