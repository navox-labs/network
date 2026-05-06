"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import type { Connection } from "@/lib/tieStrength";
import {
  type ListViewId,
  LIST_VIEW_DEFS,
  countByView,
} from "@/lib/listViewFilters";

// Re-export for convenience
export { filterConnections, type ListViewId } from "@/lib/listViewFilters";

interface ListViewDropdownProps {
  activeView: ListViewId;
  onViewChange: (view: ListViewId) => void;
  connections: Connection[];
}

export default function ListViewDropdown({
  activeView,
  onViewChange,
  connections,
}: ListViewDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => countByView(connections), [connections]);

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

  const activeLabel =
    LIST_VIEW_DEFS.find((v) => v.id === activeView)?.label || "All Contacts";

  return (
    <div ref={ref} className="relative" data-testid="list-view-dropdown">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-hi)] transition-colors cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="list-view-trigger"
      >
        {activeLabel}
        <ChevronDown
          size={12}
          className={`text-[var(--text-muted)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-[calc(100%+4px)] left-0 z-50 bg-[var(--bg)] border border-[var(--border)] rounded-lg py-1 min-w-[200px] shadow-lg"
          data-testid="list-view-menu"
        >
          {LIST_VIEW_DEFS.map((view) => (
            <button
              key={view.id}
              role="option"
              aria-selected={view.id === activeView}
              onClick={() => {
                onViewChange(view.id);
                setOpen(false);
              }}
              className={`flex items-center justify-between w-full px-3 py-1.5 text-xs cursor-pointer text-left transition-colors ${
                view.id === activeView
                  ? "bg-[var(--accent-glow)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
              data-testid={`list-view-option-${view.id}`}
            >
              <span>{view.label}</span>
              <span className="font-mono text-[10px] text-[var(--text-muted)] ml-3">
                {counts[view.id]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
