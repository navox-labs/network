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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="fade-in"
        style={{
          background: "#111",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "28px 28px 24px",
          width: "100%",
          maxWidth: 420,
          margin: "0 16px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserPlus size={16} color="var(--accent)" />
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Add Contact Manually
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "var(--text-muted)",
              display: "flex",
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Name row */}
            <div style={{ display: "flex", gap: 10 }}>
              <Field
                label="First Name"
                value={firstName}
                onChange={setFirstName}
                placeholder="Alice"
                autoFocus
              />
              <Field
                label="Last Name"
                value={lastName}
                onChange={setLastName}
                placeholder="Smith"
              />
            </div>

            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="alice@company.com"
              type="email"
            />

            <Field
              label="Company"
              value={company}
              onChange={setCompany}
              placeholder="Acme Corp"
            />

            <Field
              label="Position"
              value={position}
              onChange={setPosition}
              placeholder="Senior Engineer"
            />
          </div>

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 12px",
                background: "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.2)",
                borderRadius: 6,
                color: "var(--critical)",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: "6px 16px", height: 32 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              style={{
                fontSize: 12,
                padding: "6px 16px",
                height: 32,
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 500,
              }}
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
    <div style={{ flex: 1 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          color: "var(--text-muted)",
          marginBottom: 4,
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width: "100%",
          padding: "7px 10px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          color: "var(--text-primary)",
          fontSize: 13,
          outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--accent-dim)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      />
    </div>
  );
}
