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
      <div className="mb-1.5">
        <span className="text-xs font-semibold text-[var(--text-primary)] font-mono tracking-wide uppercase">
          {label || "Voice Sample"}
        </span>
      </div>

      <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-2">
        Write a paragraph in your natural voice. The AI will match your tone, vocabulary, and sentence structure.
      </p>

      <textarea
        value={sample}
        onChange={(e) => setSample(e.target.value)}
        onBlur={handleSampleBlur}
        placeholder="e.g., Hey — saw your post about scaling eng teams. I went through something similar last year at [company] and had a few takeaways that might be useful. Would be great to swap notes sometime. No rush either way."
        className="w-full min-h-[100px] resize-y bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] leading-relaxed text-[var(--text-primary)] font-inherit outline-none transition-colors focus:border-[rgba(108,75,244,0.3)]"
        data-testid="voice-sample-textarea"
      />

      <div className="mt-2.5">
        <span className="text-[11px] text-[var(--text-muted)] font-mono tracking-wide uppercase">
          Additional instructions (optional)
        </span>
        <textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="e.g., Keep it under 3 sentences. Never use exclamation marks. Always mention mutual connections."
          className="w-full min-h-[50px] resize-y bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs leading-relaxed text-[var(--text-primary)] font-inherit outline-none mt-1.5 transition-colors focus:border-[rgba(108,75,244,0.3)]"
          data-testid="voice-additional-textarea"
        />
      </div>
    </div>
  );
}

export type { VoiceSampleInputProps };
