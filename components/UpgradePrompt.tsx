"use client";

import { X, KeyRound, ExternalLink } from "lucide-react";

interface UpgradePromptProps {
  feature: string;
  onClose: () => void;
  onOpenSettings?: () => void;
}

/**
 * UpgradePrompt — modal shown when an unlicensed user tries a paid feature.
 *
 * - Feature name in heading
 * - Brief pricing copy
 * - "Get License" CTA
 * - "I have a key" link to open settings
 * - Close button
 */
export default function UpgradePrompt({
  feature,
  onClose,
  onOpenSettings,
}: UpgradePromptProps) {
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

  const handleHaveKey = () => {
    onClose();
    onOpenSettings?.();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 700,
          background: "rgba(0,0,0,0.5)",
          animation: "fadeIn 0.15s ease",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 701,
          width: "min(380px, calc(100vw - 48px))",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          animation: "fadeIn 0.2s ease",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-panel)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <KeyRound size={14} color="var(--accent)" />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-primary)",
                letterSpacing: "0.03em",
              }}
            >
              License Required
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: 4,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 16px" }}>
          <div
            style={{
              fontSize: 14,
              color: "var(--text-primary)",
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            {feature}
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            This feature requires a Navox license ($39/mo). Get instant access
            to AI-powered outreach, advanced analytics, and all premium features.
          </p>
        </div>

        {/* Actions */}
        <div
          style={{
            padding: "0 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button
            onClick={handleGetLicense}
            className="btn btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "10px 16px",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ExternalLink size={13} />
            Get License
          </button>
          <button
            onClick={handleHaveKey}
            style={{
              width: "100%",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 16px",
              color: "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            I have a key
          </button>
        </div>
      </div>
    </>
  );
}
