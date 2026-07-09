"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IntakeForm } from "@/components/guided/IntakeForm";
import { ChatPanel } from "@/components/advisor/ChatPanel";
import { InterviewForm } from "@/components/advisor/InterviewForm";
import { PlanView } from "@/components/advisor/PlanView";
import { buildPlan, inspect, sendChat, type PlanInput } from "@/lib/plan-client";
import type { Answers } from "@/lib/x402/inspect";
import { useApp } from "@/lib/store";

type Phase = "intake" | "analyzing" | "interview" | "planning" | "plan";

export default function Home() {
  const { state, setState, reset, hydrated } = useApp();
  const [phase, setPhase] = useState<Phase>("intake");
  const [progress, setProgress] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Resume where the user left off.
  useEffect(() => {
    if (!hydrated) return;
    if (state.plan) setPhase("plan");
    else if (state.inspection) setPhase("interview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  async function startInspect(input: PlanInput) {
    setProgress([]);
    setPhase("analyzing");
    try {
      const inspection = await inspect(input, (m) =>
        setProgress((prev) => [...prev, m]),
      );
      setState((s) => ({ ...s, inspection, plan: null, messages: [] }));
      setPhase("interview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Inspection failed");
      setPhase("intake");
    }
  }

  async function startPlan(answers: Answers) {
    setPhase("planning");
    try {
      const plan = await buildPlan(answers);
      setState((s) => ({
        ...s,
        plan,
        messages: plan.openingMessage
          ? [{ role: "assistant", content: plan.openingMessage }]
          : [],
      }));
      setPhase("plan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Planning failed");
      setPhase("interview");
    }
  }

  async function onSend(text: string) {
    if (!state.plan || busy) return;
    const digest = state.plan.contextDigest;
    const nextMsgs = [...state.messages, { role: "user" as const, content: text }];
    setState((s) => ({ ...s, messages: nextMsgs }));
    setBusy(true);
    try {
      const { reply, plan } = await sendChat(nextMsgs, state.plan, digest);
      setState((s) => ({
        ...s,
        plan,
        messages: [...nextMsgs, { role: "assistant", content: reply }],
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  function resetAll() {
    reset();
    setPhase("intake");
    setProgress([]);
    toast.info("Reset");
  }

  const showReset = phase !== "intake" || !!state.inspection || !!state.plan;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-cb-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/cb.svg" alt="" className="h-7 w-7" />
            <span className="text-sm font-semibold text-cb-black">
              x402 Setup Advisor
            </span>
          </Link>
          {showReset && (
            <button
              onClick={resetAll}
              className="rounded-lg px-3 py-2 text-sm text-cb-gray-600 transition-colors hover:bg-cb-gray-50 hover:text-cb-black"
            >
              Start over
            </button>
          )}
        </div>
      </header>

      {phase === "intake" && (
        <main className="mx-auto max-w-2xl px-6 py-12">
          <IntakeForm onSubmit={startInspect} />
        </main>
      )}

      {(phase === "analyzing" || phase === "planning") && (
        <main className="mx-auto flex max-w-xl flex-col items-center gap-6 px-6 py-24 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">
            {phase === "analyzing" ? "Reading your API…" : "Building your plan…"}
          </h2>
          {phase === "analyzing" && (
            <div className="w-full space-y-1.5 text-left">
              {progress.map((m, i) => (
                <p
                  key={i}
                  className={
                    i === progress.length - 1
                      ? "text-sm text-cb-black"
                      : "text-sm text-cb-gray-600"
                  }
                >
                  {m}
                </p>
              ))}
            </div>
          )}
        </main>
      )}

      {phase === "interview" && state.inspection && (
        <main className="px-6 py-12">
          <InterviewForm
            inspection={state.inspection}
            busy={false}
            onSubmit={startPlan}
          />
        </main>
      )}

      {phase === "plan" && state.plan && (
        <>
          <main className="px-6 py-10 lg:pr-[404px] lg:pl-10">
            <PlanView plan={state.plan} />
          </main>
          <aside className="border-t border-cb-gray-100 bg-white lg:fixed lg:top-16 lg:right-0 lg:bottom-0 lg:z-40 lg:w-[380px] lg:border-t-0 lg:border-l">
            <ChatPanel messages={state.messages} busy={busy} onSend={onSend} />
          </aside>
        </>
      )}
    </div>
  );
}
