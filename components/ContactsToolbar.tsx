"use client";

import { Search } from "lucide-react";
import ListViewDropdown, { type ListViewId } from "./ListViewDropdown";
import type { Connection } from "@/lib/tieStrength";

interface ContactsToolbarProps {
  totalCount: number;
  filteredCount: number;
  activeView: ListViewId;
  onViewChange: (view: ListViewId) => void;
  connections: Connection[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onImport: () => void;
  onAddContact: () => void;
}

export default function ContactsToolbar({
  totalCount,
  filteredCount,
  activeView,
  onViewChange,
  connections,
  searchQuery,
  onSearchChange,
}: ContactsToolbarProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-panel)] shrink-0"
      data-testid="contacts-toolbar"
    >
      {/* Left: View dropdown */}
      <ListViewDropdown
        activeView={activeView}
        onViewChange={onViewChange}
        connections={connections}
      />

      {/* Center: Search */}
      <div className="relative flex-1 max-w-sm">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, company, email, position..."
          className="w-full pl-8 pr-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-dim)] transition-colors"
          data-testid="contacts-search"
        />
      </div>

      {/* Right: Count */}
      <span className="text-[11px] font-mono text-[var(--text-muted)] whitespace-nowrap ml-auto">
        {filteredCount === totalCount
          ? `${totalCount} contacts`
          : `${filteredCount} of ${totalCount} contacts`}
      </span>
    </div>
  );
}

export type { ContactsToolbarProps };
