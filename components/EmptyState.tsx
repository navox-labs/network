"use client";

import { Users, Upload, UserPlus } from "lucide-react";

interface EmptyStateProps {
  onImport: () => void;
  onAddContact: () => void;
}

export default function EmptyState({ onImport, onAddContact }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full w-full p-6">
      <div className="flex flex-col items-center gap-5 max-w-sm text-center">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-glow)] border border-[var(--accent-dim)]">
          <Users size={28} style={{ color: "var(--accent)" }} />
        </div>

        {/* Text */}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">
            No contacts yet
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Import your network to get started
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-2">
          <button
            className="btn btn-primary text-sm px-5 py-2"
            onClick={onImport}
          >
            <Upload size={15} />
            Import Contacts
          </button>

          <button
            className="btn btn-ghost text-sm px-4 py-2"
            onClick={onAddContact}
          >
            <UserPlus size={15} />
            Add Manually
          </button>
        </div>
      </div>
    </div>
  );
}

export type { EmptyStateProps };
