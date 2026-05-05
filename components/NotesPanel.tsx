"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { NOTES_MAX_CHARS } from "@/lib/statusConfig";

interface NotesPanelProps {
  notes: string;
  onChange: (notes: string) => void;
}

const MAX_CHARS = NOTES_MAX_CHARS;

export default function NotesPanel({ notes, onChange }: NotesPanelProps) {
  const [localValue, setLocalValue] = useState(notes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(notes);
  }, [notes]);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(60, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [localValue, resize]);

  const handleBlur = () => {
    if (localValue !== notes) {
      onChange(localValue);
    }
  };

  const charCount = localValue.length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <div data-testid="notes-panel">
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={(e) => {
          const val = e.target.value;
          if (val.length <= MAX_CHARS) {
            setLocalValue(val);
          }
        }}
        onBlur={handleBlur}
        placeholder="Add notes about this connection..."
        className="w-full min-h-[60px] resize-none overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[13px] leading-relaxed text-[var(--text-primary)] font-inherit outline-none transition-colors focus:border-[rgba(108,75,244,0.3)]"
        data-testid="notes-textarea"
      />
      <div
        className={`flex justify-end mt-1 text-[11px] font-mono ${
          isOverLimit ? "text-red-500" : "text-[var(--text-muted)]"
        }`}
        data-testid="notes-char-count"
      >
        {charCount}/{MAX_CHARS}
      </div>
    </div>
  );
}

export { MAX_CHARS };
export type { NotesPanelProps };
