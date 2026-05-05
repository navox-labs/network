"use client";

import { useState, useEffect } from "react";
import type { OutreachVoice } from "@/lib/types";

interface VoiceSampleInputProps {
  voice: OutreachVoice | undefined;
  onChange: (voice: OutreachVoice) => void;
  label?: string;
}

export default function VoiceSampleInput({ voice, onChange, label }: VoiceSampleInputProps) {
  const [sample, setSample] = useState(voice?.sample || "");
  const [additionalNotes, setAdditionalNotes] = useState(voice?.additionalNotes || "");

  // Sync external changes
  useEffect(() => {
    setSample(voice?.sample || "");
    setAdditionalNotes(voice?.additionalNotes || "");
  }, [voice]);

  const handleSampleBlur = () => {
    if (sample !== (voice?.sample || "") || additionalNotes !== (voice?.additionalNotes || "")) {
      onChange({ sample, additionalNotes: additionalNotes || undefined });
    }
  };

  const handleNotesBlur = () => {
    if (additionalNotes !== (voice?.additionalNotes || "") || sample !== (voice?.sample || "")) {
      onChange({ sample, additionalNotes: additionalNotes || undefined });
    }
  };

  return (
    <div data-testid="voice-sample-input">
      <div style={{ marginBottom: 6 }}>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-primary)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.03em",
          textTransform: "uppercase",
        }}>
          {label || "Voice Sample"}
        </span>
      </div>

      <p style={{
        fontSize: 12,
        color: "var(--text-muted)",
        lineHeight: 1.5,
        marginBottom: 8,
      }}>
        Write a paragraph in your natural voice. The AI will match your tone, vocabulary, and sentence structure.
      </p>

      <textarea
        value={sample}
        onChange={(e) => setSample(e.target.value)}
        onBlur={handleSampleBlur}
        placeholder="e.g., Hey — saw your post about scaling eng teams. I went through something similar last year at [company] and had a few takeaways that might be useful. Would be great to swap notes sometime. No rush either way."
        style={{
          width: "100%",
          minHeight: 100,
          resize: "vertical",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--text-primary)",
          fontFamily: "inherit",
          outline: "none",
          transition: "border-color 0.15s",
        }}
        data-testid="voice-sample-textarea"
      />

      <div style={{ marginTop: 10 }}>
        <span style={{
          fontSize: 11,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.03em",
          textTransform: "uppercase",
        }}>
          Additional instructions (optional)
        </span>
        <textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="e.g., Keep it under 3 sentences. Never use exclamation marks. Always mention mutual connections."
          style={{
            width: "100%",
            minHeight: 50,
            resize: "vertical",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--text-primary)",
            fontFamily: "inherit",
            outline: "none",
            marginTop: 6,
            transition: "border-color 0.15s",
          }}
          data-testid="voice-additional-textarea"
        />
      </div>
    </div>
  );
}

export type { VoiceSampleInputProps };
