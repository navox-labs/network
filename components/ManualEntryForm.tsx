"use client";

import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import type { Connection } from "@/lib/tieStrength";

interface ManualEntryFormProps {
  onAdd: (connection: Partial<Connection>) => void;
  onCancel: () => void;
}

export default function ManualEntryForm({ onAdd, onCancel }: ManualEntryFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst && !trimmedLast) {
      setError("At least a first name or last name is required.");
      return;
    }

    setError(null);

    onAdd({
      firstName: trimmedFirst,
      lastName: trimmedLast,
      name: `${trimmedFirst} ${trimmedLast}`.trim(),
      email: email.trim() || undefined,
      company: company.trim(),
      position: position.trim(),
      connectedOn: new Date().toISOString().split("T")[0],
      source: "manual_entry",
      sources: ["manual_entry"],
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="fade-in bg-[#111] border border-[var(--border)] rounded-xl px-7 pb-6 pt-7 w-full max-w-[420px] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Add Contact Manually
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="bg-transparent border-none cursor-pointer p-1 text-[var(--text-muted)] flex"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2.5">
              <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="Alice" autoFocus />
              <Field label="Last Name" value={lastName} onChange={setLastName} placeholder="Smith" />
            </div>
            <Field label="Email" value={email} onChange={setEmail} placeholder="alice@company.com" type="email" />
            <Field label="Company" value={company} onChange={setCompany} placeholder="Acme Corp" />
            <Field label="Position" value={position} onChange={setPosition} placeholder="Senior Engineer" />
          </div>

          {error && (
            <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md text-[var(--critical)] text-xs">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <button type="button" onClick={onCancel} className="btn btn-ghost text-xs px-4 h-8">
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs px-4 h-8 bg-[var(--accent)] text-white border-none rounded-md cursor-pointer font-medium hover:opacity-90 transition-opacity"
            >
              Add Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex-1">
      <label className="block text-[11px] text-[var(--text-muted)] mb-1 font-mono tracking-wider uppercase">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full py-[7px] px-2.5 bg-white/[0.04] border border-[var(--border)] rounded-md text-[var(--text-primary)] text-[13px] outline-none transition-colors focus:border-[var(--accent-dim)]"
      />
    </div>
  );
}
