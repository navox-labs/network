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
import LicenseInput from "@/components/LicenseInput";

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
        className="fixed inset-0 z-[600] bg-black/30 animate-[fadeIn_0.15s_ease]"
      />

      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[601] w-[min(440px,calc(100vw-48px))] bg-[var(--bg)] border border-[var(--border)] rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-[fadeIn_0.2s_ease] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-panel)]">
          <div className="flex items-center gap-2">
            <Settings size={14} className="text-[var(--accent)]" />
            <span className="font-mono text-xs text-[var(--text-primary)] tracking-wide">
              Settings
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1 leading-none flex items-center"
          >
            <X size={16} />
          </button>
        </div>

        {/* API key section hidden for V1 — users use Navox proxy via license key */}

        {/* License key section */}
        <div className="px-4 pt-4">
          <LicenseInput />
        </div>

        {/* ProductHunt badges */}
        <div className="flex gap-3 flex-wrap justify-center py-4 border-t border-[var(--border)] mt-4">
          <a href="https://www.producthunt.com/products/navox-network?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-navox-network" target="_blank" rel="noopener noreferrer">
            <img alt="Navox Network on Product Hunt" width={200} height={43} src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1101940&theme=dark" className="block" />
          </a>
          <a href="https://www.producthunt.com/products/navox-network/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_campaign=badge-navox-network" target="_blank" rel="noopener noreferrer">
            <img alt="Review Navox Network on Product Hunt" width={200} height={43} src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=1101940&theme=dark" className="block" />
          </a>
        </div>

        <div className="px-4 pb-2" />
      </div>
    </>
  );
}
