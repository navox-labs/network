"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Sparkles, Send } from "lucide-react";
import { getAIConfig, streamAIResponse } from "@/lib/aiClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  onOpenSettings: () => void;
}

export default function AskCoachDialog({ isOpen, onClose, systemPrompt, onOpenSettings }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const config = isOpen ? getAIConfig() : null;
  const hasKey = config !== null;

  useEffect(() => {
    if (isOpen) {
      setQuestion("");
      setAnswer("");
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Abort any in-flight stream when dialog closes
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [isOpen]);

  const sendQuestion = useCallback(async (q: string) => {
    const aiConfig = getAIConfig();
    if (!aiConfig) return;

    // Abort previous stream if still running
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setAnswer("");
    setQuestion("");

    try {
      const enhancedPrompt = systemPrompt +
        "\n\nKeep your response concise and actionable. If the question is about external topics (companies, roles, skills), provide real information. If relevant, connect your answer back to the user's network data.";

      let content = "";
      for await (const chunk of streamAIResponse(
        aiConfig,
        [{ role: "user", content: q }],
        enhancedPrompt,
        controller.signal
      )) {
        content += chunk;
        setAnswer(content);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setAnswer("Sorry, couldn't reach the AI provider. Check your API key and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [systemPrompt]);

  const handleAsk = () => {
    const q = question.trim();
    if (!q || isLoading || !systemPrompt) return;
    sendQuestion(q);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      {/* Dialog */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in w-[min(480px,calc(100vw-48px))] bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-panel)]">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--accent)]" />
            <span className="font-mono text-xs text-[var(--text-primary)] tracking-wide">
              Ask Coach
            </span>
            {hasKey && (
              <span className="text-[10px] font-mono text-[var(--text-muted)] px-1.5 py-px bg-[var(--bg-card)] rounded border border-[var(--border)]">
                via {config!.provider === "openai" ? "OpenAI" : "Anthropic"}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1 leading-none flex items-center"
          >
            <X size={16} />
          </button>
        </div>

        {/* No key prompt */}
        {!hasKey && (
          <div className="px-4 py-6 text-center">
            <div className="text-[13px] text-[var(--text-secondary)] mb-3 leading-relaxed">
              Add your API key to use Coach
            </div>
            <button
              onClick={() => { onClose(); onOpenSettings(); }}
              className="btn btn-primary text-xs px-4 py-[7px]"
            >
              Open Settings
            </button>
            <div className="mt-2.5 text-[11px] text-[var(--text-muted)]">
              Supports OpenAI and Anthropic keys.
            </div>
          </div>
        )}

        {/* Answer */}
        {hasKey && (answer || isLoading) && (
          <div className="px-4 pt-4">
            <div className="p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap max-h-60 overflow-auto">
              {answer || (
                <span className="text-[var(--text-muted)] animate-pulse">
                  Thinking...
                </span>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        {hasKey && (
          <div className="flex gap-2 p-4">
            <input
              ref={inputRef}
              type="text"
              placeholder="What do you want to know about your network?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAsk(); }}
              disabled={isLoading}
              className={`flex-1 ${isLoading ? "opacity-60" : ""}`}
            />
            <button
              onClick={handleAsk}
              disabled={isLoading || !question.trim()}
              className={`btn btn-primary px-3 py-[7px] ${isLoading || !question.trim() ? "opacity-50" : ""}`}
            >
              <Send size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
