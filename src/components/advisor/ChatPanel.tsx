"use client";

import { Loader2, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/plan-client";

interface Props {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => void;
}

const SUGGESTIONS = [
  "Explain SIWX in one line",
  "Why this scheme?",
  "Make the pricing cheaper",
];

const MAX_INPUT_HEIGHT = 160; // px — matches max-h-40

export function ChatPanel({ messages, busy, onSend }: Props) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, busy]);

  // Auto-grow the textarea upward as the user types (capped).
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [text]);

  function submit() {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    onSend(t);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex h-[75vh] flex-col lg:h-full">
      {/* Header */}
      <div className="shrink-0 border-b border-cb-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-cb-black">Refine the plan</h3>
        </div>
        <p className="mt-0.5 text-xs text-cb-gray-600">
          Ask a question or request a change — the plan updates as you chat.
        </p>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSend(s)}
                disabled={busy}
                className="rounded-full border border-cb-gray-200 px-3 py-1 text-xs text-cb-gray-600 transition-colors hover:bg-cb-gray-50 hover:text-cb-black disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div
              key={i}
              className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground"
            >
              {m.content}
            </div>
          ) : (
            <div key={i} className="flex max-w-[92%] gap-2">
              <Sparkles className="mt-1.5 size-3.5 shrink-0 text-primary" />
              <div className="rounded-2xl rounded-bl-sm border border-cb-gray-100 bg-cb-gray-50 px-3 py-2 text-sm whitespace-pre-wrap text-cb-black">
                {m.content}
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-cb-gray-600">
            <Loader2 className="size-4 animate-spin text-primary" /> Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-cb-gray-100 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-cb-gray-200 bg-white px-2 py-1.5 focus-within:border-primary">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask or request a change…   (Shift+Enter for a new line)"
            disabled={busy}
            className="max-h-40 w-full resize-none bg-transparent px-1 py-1 text-sm leading-5 placeholder:text-cb-gray-400 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={submit}
            disabled={busy || !text.trim()}
            className="mb-0.5 shrink-0 rounded-lg bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-cb-blue-hover disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
