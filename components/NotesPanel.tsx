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

  // Sync external changes
  useEffect(() => {
    setLocalValue(notes);
  }, [notes]);

  // Auto-resize textarea
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
        style={{
          width: "100%",
          minHeight: 60,
          resize: "none",
          overflow: "hidden",
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
        data-testid="notes-textarea"
      />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 4,
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: isOverLimit ? "#ef4444" : "var(--text-muted)",
        }}
        data-testid="notes-char-count"
      >
        {charCount}/{MAX_CHARS}
      </div>
    </div>
  );
}

export { MAX_CHARS };
export type { NotesPanelProps };
