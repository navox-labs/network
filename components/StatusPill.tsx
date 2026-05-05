"use client";

import { useState, useRef, useEffect } from "react";
import type { ConnectionStatus } from "@/lib/types";

interface StatusPillProps {
  status: ConnectionStatus | undefined;
  onChange: (status: ConnectionStatus) => void;
}

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; bg: string; text: string }> = {
  new:                { label: "New",               bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
  researching:        { label: "Researching",       bg: "rgba(59,130,246,0.15)",  text: "#60a5fa" },
  drafted:            { label: "Drafted",           bg: "rgba(234,179,8,0.15)",   text: "#facc15" },
  sent:               { label: "Sent",              bg: "rgba(249,115,22,0.15)",  text: "#fb923c" },
  replied:            { label: "Replied",           bg: "rgba(34,197,94,0.15)",   text: "#4ade80" },
  meeting_scheduled:  { label: "Meeting",           bg: "rgba(168,85,247,0.15)",  text: "#c084fc" },
  converted:          { label: "Converted",         bg: "rgba(16,185,129,0.15)",  text: "#34d399" },
  archived:           { label: "Archived",          bg: "rgba(107,114,128,0.10)", text: "#6b7280" },
};

const ALL_STATUSES: ConnectionStatus[] = [
  "new", "researching", "drafted", "sent", "replied",
  "meeting_scheduled", "converted", "archived",
];

export default function StatusPill({ status, onChange }: StatusPillProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = status || "new";
  const config = STATUS_CONFIG[current];

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: config.bg,
          color: config.text,
          border: "none",
          borderRadius: 999,
          padding: "3px 10px",
          fontSize: 11,
          fontWeight: 500,
          cursor: "pointer",
          whiteSpace: "nowrap",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.02em",
          transition: "opacity 0.15s",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="status-pill"
      >
        {config.label}
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 50,
            background: "#1a1a1a",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "4px 0",
            minWidth: 140,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
          data-testid="status-dropdown"
        >
          {ALL_STATUSES.map((s) => {
            const c = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                role="option"
                aria-selected={s === current}
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "6px 12px",
                  background: s === current ? "rgba(255,255,255,0.05)" : "transparent",
                  border: "none",
                  color: c.text,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  textAlign: "left",
                }}
                data-testid={`status-option-${s}`}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: c.text,
                    flexShrink: 0,
                  }}
                />
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { STATUS_CONFIG, ALL_STATUSES };
export type { StatusPillProps };
