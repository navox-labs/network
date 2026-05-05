"use client";

import { X, KeyRound, ExternalLink } from "lucide-react";

interface UpgradePromptProps {
  feature: string;
  onClose: () => void;
  onOpenSettings?: () => void;
}

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
        className="fixed inset-0 z-[700] bg-black/50 animate-[fadeIn_0.15s_ease]"
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[701] w-[min(380px,calc(100vw-48px))] bg-[var(--bg)] border border-[var(--border)] rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-[fadeIn_0.2s_ease] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-panel)]">
          <div className="flex items-center gap-2">
            <KeyRound size={14} className="text-[var(--accent)]" />
            <span className="font-mono text-xs text-[var(--text-primary)] tracking-wide">
              License Required
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1 leading-none flex items-center"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-5">
          <div className="text-sm text-[var(--text-primary)] font-medium mb-2">
            {feature}
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed m-0">
            This feature requires a Navox license ($39/mo). Get instant access
            to AI-powered outreach, advanced analytics, and all premium features.
          </p>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex flex-col gap-2">
          <button
            onClick={handleGetLicense}
            className="btn btn-primary w-full justify-center py-2.5 px-4 text-[13px] flex items-center gap-1.5"
          >
            <ExternalLink size={13} />
            Get License
          </button>
          <button
            onClick={handleHaveKey}
            className="w-full bg-transparent border border-[var(--border)] rounded-lg py-2 px-4 text-[var(--text-secondary)] text-xs cursor-pointer font-mono hover:bg-white/5 transition-colors"
          >
            I have a key
          </button>
        </div>
      </div>
    </>
  );
}
