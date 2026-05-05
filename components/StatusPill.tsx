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
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap font-mono tracking-wide transition-opacity border-none cursor-pointer"
        style={{ background: config.bg, color: config.text }}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="status-pill"
      >
        {config.label}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-[calc(100%+4px)] left-0 z-50 bg-[#1a1a1a] border border-[var(--border)] rounded-lg py-1 min-w-[140px] shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
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
                className={`flex items-center gap-2 w-full px-3 py-1.5 border-none text-xs cursor-pointer font-mono text-left ${
                  s === current ? "bg-white/5" : "bg-transparent hover:bg-white/5"
                }`}
                style={{ color: c.text }}
                data-testid={`status-option-${s}`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: c.text }}
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
