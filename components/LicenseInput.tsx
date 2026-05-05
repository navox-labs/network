"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Loader2, KeyRound, Trash2, ExternalLink } from "lucide-react";
import { useLicense } from "@/hooks/useLicense";
import { isValidKeyFormat } from "@/lib/license";

/**
 * LicenseInput — settings panel component for license key entry.
 *
 * States:
 * - No key: shows input + Activate button + "Get License" link
 * - Loading: spinner on button
 * - Active: green status dot + masked key + Deactivate button
 * - Error: red message below input
 */
export default function LicenseInput() {
  const { licensed, licenseKey, loading, error, activate, deactivate } =
    useLicense();
  const [input, setInput] = useState("");
  const [activating, setActivating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-uppercase and format as user types
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
    // When Stripe is configured, this will create a checkout session.
    // For now, open a placeholder or do nothing.
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
      // Stripe not configured yet — silent fail
    }
  };

  const maskKey = (key: string): string => {
    // NAVOX-XXXX-XXXX-XXXX -> NAVOX-****-****-XXXX
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
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 8,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          License
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--strong)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Active
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {maskKey(licenseKey)}
            </span>
          </div>
          <button
            onClick={handleDeactivate}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "4px 10px",
              color: "var(--critical)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            <Trash2 size={11} />
            Deactivate
          </button>
        </div>
      </div>
    );
  }

  // Input state
  const isValidFormat = isValidKeyFormat(input);
  const showFormatHint = input.length > 0 && !isValidFormat;

  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          marginBottom: 8,
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        License
      </div>

      <div style={{ display: "flex", gap: 8 }}>
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
          style={{
            flex: 1,
            background: "var(--bg-card)",
            border: `1px solid ${error ? "var(--critical)" : "var(--border)"}`,
            borderRadius: 6,
            padding: "7px 10px",
            color: "var(--text-primary)",
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.05em",
            outline: "none",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => {
            if (!error) e.currentTarget.style.borderColor = "rgba(108,75,244,0.3)";
          }}
          onBlur={(e) => {
            if (!error) e.currentTarget.style.borderColor = "var(--border)";
          }}
        />
        <button
          onClick={handleActivate}
          disabled={!isValidFormat || activating || loading}
          className="btn btn-primary"
          style={{
            padding: "7px 12px",
            opacity: !isValidFormat || activating ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {activating ? (
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <KeyRound size={14} />
          )}
          {activating ? "..." : "Activate"}
        </button>
      </div>

      {/* Format hint */}
      {showFormatHint && (
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Format: NAVOX-XXXX-XXXX-XXXX
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "var(--critical)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {error}
        </div>
      )}

      {/* Get License link */}
      <button
        onClick={handleGetLicense}
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          color: "var(--accent)",
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          padding: 0,
        }}
      >
        <ExternalLink size={11} />
        Get a license ($39/mo)
      </button>
    </div>
  );
}
