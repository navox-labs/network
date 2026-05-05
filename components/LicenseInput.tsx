"use client";

import { useState, useRef } from "react";
import { Check, Loader2, KeyRound, Trash2, ExternalLink } from "lucide-react";
import { useLicense } from "@/hooks/useLicense";
import { isValidKeyFormat } from "@/lib/license";

export default function LicenseInput() {
  const { licensed, licenseKey, loading, error, activate, deactivate } = useLicense();
  const [input, setInput] = useState("");
  const [activating, setActivating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (value: string) => {
    setInput(value.toUpperCase());
  };

  const handleActivate = async () => {
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return;
    setActivating(true);
    await activate(trimmed);
    setActivating(false);
    if (!error) {
      setInput("");
    }
  };

  const handleDeactivate = async () => {
    await deactivate();
    setInput("");
  };

  const handleGetLicense = async () => {
    try {
      const res = await fetch("/network/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      // Stripe not configured yet
    }
  };

  const maskKey = (key: string): string => {
    const parts = key.split("-");
    if (parts.length === 4) {
      return `${parts[0]}-****-****-${parts[3]}`;
    }
    return "NAVOX-****-****-****";
  };

  // Active license display
  if (licensed && licenseKey) {
    return (
      <div>
        <div className="text-xs text-[var(--text-muted)] mb-2 font-mono tracking-wider uppercase">
          License
        </div>
        <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--strong)] shrink-0" />
            <span className="text-xs text-[var(--text-secondary)] font-mono">Active</span>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">{maskKey(licenseKey)}</span>
          </div>
          <button
            onClick={handleDeactivate}
            className="flex items-center gap-1 bg-transparent border border-[var(--border)] rounded-md px-2.5 py-1 text-[var(--critical)] text-[11px] cursor-pointer"
          >
            <Trash2 size={11} />
            Deactivate
          </button>
        </div>
      </div>
    );
  }

  const isValidFormat = isValidKeyFormat(input);
  const showFormatHint = input.length > 0 && !isValidFormat;

  return (
    <div>
      <div className="text-xs text-[var(--text-muted)] mb-2 font-mono tracking-wider uppercase">
        License
      </div>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          maxLength={19}
          placeholder="NAVOX-XXXX-XXXX-XXXX"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isValidFormat) handleActivate();
          }}
          className={`flex-1 bg-[var(--bg-card)] border rounded-md py-[7px] px-2.5 text-[var(--text-primary)] text-[13px] font-mono tracking-wider outline-none transition-colors focus:border-[rgba(108,75,244,0.3)] ${
            error ? "border-[var(--critical)]" : "border-[var(--border)]"
          }`}
        />
        <button
          onClick={handleActivate}
          disabled={!isValidFormat || activating || loading}
          className={`btn btn-primary py-[7px] px-3 flex items-center gap-1 ${
            !isValidFormat || activating ? "opacity-50" : ""
          }`}
        >
          {activating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <KeyRound size={14} />
          )}
          {activating ? "..." : "Activate"}
        </button>
      </div>

      {showFormatHint && (
        <div className="mt-1.5 text-[11px] text-[var(--text-muted)] font-mono">
          Format: NAVOX-XXXX-XXXX-XXXX
        </div>
      )}

      {error && (
        <div className="mt-1.5 text-xs text-[var(--critical)] font-mono">
          {error}
        </div>
      )}

      <button
        onClick={handleGetLicense}
        className="mt-2.5 flex items-center gap-1 bg-transparent border-none text-[var(--accent)] text-xs cursor-pointer font-mono p-0 hover:opacity-80 transition-opacity"
      >
        <ExternalLink size={11} />
        Get a license ($39/mo)
      </button>
    </div>
  );
}
