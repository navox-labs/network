"use client";

import { useState, useEffect, useRef } from "react";
import { X, Settings, Trash2, Check, Info } from "lucide-react";
import {
  type AIProvider,
  type AIConfig,
  getAIConfig,
  saveAIConfig,
  clearAIConfig,
  detectProvider,
} from "@/lib/aiClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ isOpen, onClose }: Props) {
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<AIConfig | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getAIConfig();
      setCurrentConfig(config);
      setProvider(config?.provider || "openai");
      setApiKey("");
      setSaved(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handlePaste = (value: string) => {
    setApiKey(value);
    const detected = detectProvider(value);
    if (detected) {
      setProvider(detected);
    }
  };

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    const config: AIConfig = { provider, apiKey: trimmed };
    saveAIConfig(config);
    setCurrentConfig(config);

    setApiKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    clearAIConfig();
    setCurrentConfig(null);
    setApiKey("");
    setSaved(false);
  };

  const maskKey = (key: string): string => {
    if (key.startsWith("sk-ant-")) return "sk-ant-****";
    if (key.startsWith("sk-")) return "sk-****";
    return "****";
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 600,
          background: "rgba(0,0,0,0.3)",
          animation: "fadeIn 0.15s ease",
        }}
      />

      {/* Dialog */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 601,
        width: "min(440px, calc(100vw - 48px))",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        animation: "fadeIn 0.2s ease",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-panel)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Settings size={14} color="var(--accent)" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)", letterSpacing: "0.03em" }}>
              AI Settings
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", padding: 4, lineHeight: 1,
              display: "flex", alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Current status */}
        {currentConfig && (
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--strong)",
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                {currentConfig.provider === "openai" ? "OpenAI" : "Anthropic"}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {maskKey(currentConfig.apiKey)}
              </span>
            </div>
            <button
              onClick={handleClear}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "none", border: "1px solid var(--border)",
                borderRadius: 6, padding: "4px 10px",
                color: "var(--critical)", fontSize: 11,
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}
            >
              <Trash2 size={11} />
              Remove
            </button>
          </div>
        )}

        {/* Provider selector */}
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Provider
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["openai", "anthropic"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`btn ${provider === p ? "btn-primary" : "btn-ghost"}`}
                style={{ flex: 1, justifyContent: "center", fontSize: 12, padding: "6px 12px" }}
              >
                {p === "openai" ? "OpenAI" : "Anthropic"}
              </button>
            ))}
          </div>
        </div>

        {/* API Key input */}
        <div style={{ padding: "12px 16px 0" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            API Key
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              type="password"
              maxLength={256}
              placeholder={provider === "openai" ? "sk-..." : "sk-ant-..."}
              value={apiKey}
              onChange={(e) => handlePaste(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              style={{
                flex: 1,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "7px 10px",
                color: "var(--text-primary)",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                outline: "none",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(108,75,244,0.3)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            />
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="btn btn-primary"
              style={{ padding: "7px 12px", opacity: !apiKey.trim() ? 0.5 : 1 }}
            >
              {saved ? <Check size={14} /> : "Save"}
            </button>
          </div>
          {/* Data disclosure notice */}
          <div style={{
            marginTop: 8,
            padding: "8px 10px",
            background: "rgba(108,75,244,0.04)",
            border: "1px solid rgba(108,75,244,0.08)",
            borderRadius: 6,
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
          }}>
            <Info size={11} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{
              fontSize: 11,
              lineHeight: 1.5,
              color: "var(--text-muted)",
            }}>
              AI features send connection names, companies, and positions to OpenAI or Anthropic to generate outreach messages. Your key is used directly — never sent to Navox servers — and is saved in this browser only, expiring after 30 days.
            </span>
          </div>
        </div>

        {/* Success feedback */}
        {saved && (
          <div style={{
            padding: "8px 16px 0", fontSize: 12, color: "var(--strong)",
            fontFamily: "var(--font-mono)",
          }}>
            Key saved successfully.
          </div>
        )}

        {/* ProductHunt badges */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", padding: "16px 0 8px", borderTop: "1px solid var(--border)", marginTop: 16 }}>
          <a href="https://www.producthunt.com/products/navox-network?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-navox-network" target="_blank" rel="noopener noreferrer">
            <img alt="Navox Network on Product Hunt" width={200} height={43} src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1101940&theme=dark" style={{ display: "block" }} />
          </a>
          <a href="https://www.producthunt.com/products/navox-network/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_campaign=badge-navox-network" target="_blank" rel="noopener noreferrer">
            <img alt="Review Navox Network on Product Hunt" width={200} height={43} src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=1101940&theme=dark" style={{ display: "block" }} />
          </a>
        </div>

        {/* Bottom spacing */}
        <div style={{ padding: "0 16px 8px" }} />
      </div>
    </>
  );
}
