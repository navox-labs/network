"use client";

import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Send } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
}

export default function AskCoachDialog({ isOpen, onClose, systemPrompt }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuestion("");
      setAnswer("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || isLoading || !systemPrompt) return;

    setIsLoading(true);
    setAnswer("");
    setQuestion("");

    try {
      const res = await fetch("/coach/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: q }],
          systemPrompt: systemPrompt + "\n\nKeep your response concise and actionable. If the question is about external topics (companies, roles, skills), search the web and provide real information. If relevant, connect your answer back to the user's network data.",
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setAnswer(content);
      }
    } catch {
      setAnswer("Sorry, couldn't reach the coach. Make sure the coach API is running.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 600,
          background: "rgba(0,0,0,0.3)",
          animation: "fadeIn 0.15s ease",
        }}
      />

      {/* Dialog */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 601,
        width: "min(480px, calc(100vw - 48px))",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        animation: "fadeIn 0.2s ease",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-panel)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={14} color="var(--accent)" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)", letterSpacing: "0.03em" }}>
              Ask Coach
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: 4, lineHeight: 1,
              display: "flex", alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Answer */}
        {(answer || isLoading) && (
          <div style={{
            padding: "16px 16px 0",
          }}>
            <div style={{
              padding: "12px 14px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--text-primary)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              maxHeight: 240,
              overflow: "auto",
            }}>
              {answer || (
                <span style={{ color: "var(--text-muted)", animation: "pulse 1.5s infinite" }}>
                  Thinking...
                </span>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "16px", display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="What do you want to know about your network?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAsk(); }}
            disabled={isLoading}
            style={{ flex: 1, opacity: isLoading ? 0.6 : 1 }}
          />
          <button
            onClick={handleAsk}
            disabled={isLoading || !question.trim()}
            className="btn btn-primary"
            style={{ padding: "7px 12px", opacity: isLoading || !question.trim() ? 0.5 : 1 }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
