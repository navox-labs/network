"use client";

import { useState, useRef, useEffect } from "react";
import type { ConnectionStatus } from "@/lib/types";
import { STATUS_CONFIG, ALL_STATUSES } from "@/lib/statusConfig";

interface StatusPillProps {
  status: ConnectionStatus | undefined;
  onChange: (status: ConnectionStatus) => void;
}

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

export type { StatusPillProps };
