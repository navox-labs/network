"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, CheckCircle, AlertTriangle } from "lucide-react";
import type { EnrichmentSummary } from "@/lib/enrichment";
import {
  ENRICHMENT_FILES,
  DISMISS_KEY,
  getMissingEnrichmentFiles,
  shouldShowBanner,
} from "@/lib/enrichBannerLogic";
import { useIsMobile } from "@/hooks/useIsMobile";

// Re-export pure functions so page.tsx can import from this file
export { getMissingEnrichmentFiles, shouldShowBanner };

export interface EnrichBannerProps {
  enrichmentSummary: EnrichmentSummary | null;
  onEnrich: (files: File[]) => void;
  isEnriching: boolean;
  enrichResult: string | null;
}

export default function EnrichBanner({
  enrichmentSummary,
  onEnrich,
  isEnriching,
  enrichResult,
}: EnrichBannerProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const loadedSet = new Set(
    (enrichmentSummary?.filesLoaded ?? []).map((f) => f.toLowerCase())
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onEnrich(files);
    },
    [onEnrich]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) onEnrich(files);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [onEnrich]
  );

  // Show success result
  if (enrichResult) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 20px",
          background: "rgba(16, 185, 129, 0.06)",
          borderBottom: "1px solid rgba(16, 185, 129, 0.15)",
          flexShrink: 0,
          minHeight: 40,
        }}
      >
        <CheckCircle size={14} color="#10b981" style={{ flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            fontSize: 13,
            color: "#10b981",
            lineHeight: 1.4,
          }}
        >
          {enrichResult}
        </span>
      </div>
    );
  }

  // Show enriching state
  if (isEnriching) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 20px",
          background: "var(--accent-glow)",
          borderBottom: "1px solid rgba(108, 75, 244, 0.12)",
          flexShrink: 0,
          minHeight: 40,
        }}
      >
        <Upload
          size={14}
          color="var(--accent)"
          style={{ flexShrink: 0, animation: "pulse 1.5s infinite" }}
        />
        <span
          style={{
            flex: 1,
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.4,
          }}
        >
          Processing enrichment files...
        </span>
      </div>
    );
  }

  const dismissButton = (
    <button
      onClick={() => {
        try {
          localStorage.setItem(DISMISS_KEY, "true");
        } catch {}
        window.dispatchEvent(new Event("enrich-banner-dismiss"));
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 6,
        background: "none",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
        fontSize: 11,
        cursor: "pointer",
        flexShrink: 0,
        fontFamily: "var(--font-sans)",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        ...(isMobile ? { flex: 1, justifyContent: "center" } : {}),
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent-dim)";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      <X size={10} />
      I'll do this later
    </button>
  );

  const browseButton = (
    <button
      onClick={() => fileInputRef.current?.click()}
      className="btn btn-primary"
      style={{
        padding: "5px 14px",
        fontSize: 12,
        flexShrink: 0,
        whiteSpace: "nowrap",
        ...(isMobile ? { flex: 1 } : {}),
      }}
    >
      Browse files
    </button>
  );

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".csv,.zip"
      multiple
      onChange={handleFileInput}
      style={{ display: "none" }}
    />
  );

  if (isMobile) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: 12,
          background: isDragOver
            ? "rgba(108, 75, 244, 0.08)"
            : "var(--accent-glow)",
          borderBottom: isDragOver
            ? "1px solid rgba(108, 75, 244, 0.25)"
            : "1px solid rgba(108, 75, 244, 0.08)",
          flexShrink: 0,
          transition: "background 0.15s, border-color 0.15s",
          cursor: "default",
        }}
      >
        {/* Text block — full width */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Upload size={14} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.4,
            }}
          >
            Enhance your analysis — drop your LinkedIn zip or additional files
            here to unlock interaction signals
          </div>
        </div>

        {/* File indicators — 2-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {ENRICHMENT_FILES.map((f) => {
            const isLoaded = loadedSet.has(f.key);
            return (
              <span
                key={f.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: isLoaded ? "#10b981" : "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {isLoaded ? (
                  <CheckCircle size={10} />
                ) : (
                  <AlertTriangle size={10} />
                )}
                {f.label}
              </span>
            );
          })}
        </div>

        {/* Buttons row — full width */}
        <div style={{ display: "flex", gap: 8 }}>
          {browseButton}
          {dismissButton}
        </div>

        {fileInput}
      </div>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 20px",
        background: isDragOver
          ? "rgba(108, 75, 244, 0.08)"
          : "var(--accent-glow)",
        borderBottom: isDragOver
          ? "1px solid rgba(108, 75, 244, 0.25)"
          : "1px solid rgba(108, 75, 244, 0.08)",
        flexShrink: 0,
        minHeight: 44,
        transition: "background 0.15s, border-color 0.15s",
        cursor: "default",
      }}
    >
      <Upload size={14} color="var(--accent)" style={{ flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.4,
            marginBottom: 4,
          }}
        >
          Enhance your analysis — drop your LinkedIn zip or additional files
          here to unlock interaction signals
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {ENRICHMENT_FILES.map((f) => {
            const isLoaded = loadedSet.has(f.key);
            return (
              <span
                key={f.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: isLoaded ? "#10b981" : "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {isLoaded ? (
                  <CheckCircle size={10} />
                ) : (
                  <AlertTriangle size={10} />
                )}
                {f.label}
              </span>
            );
          })}
        </div>
      </div>

      {browseButton}
      {fileInput}
      {dismissButton}
    </div>
  );
}
