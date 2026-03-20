"use client";

import { useState } from "react";
import { Copy, CheckCircle, Sparkles, ArrowRight, AlertTriangle } from "lucide-react";
import type { Connection } from "@/lib/tieStrength";
import type { NodeCoachData, GapActionData, WeeklyTarget } from "@/lib/coachInsights";
import { DRAFT_NO_KEY } from "@/lib/aiClient";

// ── Node Coach Card (for GraphView) ─────────────────────────────────────

interface NodeCardProps {
  connection: Connection;
  coachData: NodeCoachData;
  onDraftMessage: (conn: Connection) => void;
  draftMessage: string | null;
  isDrafting: boolean;
  onOpenSettings?: () => void;
}

export function NodeCoachCard({ connection, coachData, onDraftMessage, draftMessage, isDrafting, onOpenSettings }: NodeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!draftMessage) return;
    navigator.clipboard.writeText(draftMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      const url = connection.url || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(connection.name)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  };

  return (
    <div style={{
      marginTop: 10,
      padding: "10px 12px",
      background: "var(--accent-glow)",
      border: "1px solid rgba(108,75,244,0.12)",
      borderRadius: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Sparkles size={12} color="var(--accent)" />
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)", letterSpacing: "0.04em" }}>
          COACH
        </span>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>
        {coachData.why}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500, marginBottom: 8 }}>
        → {coachData.suggestion}
      </div>

      {!isDrafting && !draftMessage && (
        <button
          onClick={() => onDraftMessage(connection)}
          className="btn btn-primary"
          style={{ fontSize: 12, padding: "7px 14px", width: "100%", marginBottom: 6 }}
        >
          Draft Message
        </button>
      )}

      {isDrafting && (
        <div style={{
          padding: "8px 10px",
          background: "var(--bg-card)",
          borderRadius: 6,
          fontSize: 12,
          color: "var(--text-muted)",
          animation: "pulse 1.5s infinite",
        }}>
          Drafting message...
        </div>
      )}

      {draftMessage === DRAFT_NO_KEY && (
        <div style={{ textAlign: "center", padding: "4px 0" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.5 }}>
            Add your API key to use Coach
          </div>
          <button
            onClick={onOpenSettings}
            className="btn btn-primary"
            style={{ fontSize: 11, padding: "5px 14px", width: "100%" }}
          >
            Open Settings
          </button>
          <div style={{ marginTop: 6, fontSize: 10, color: "var(--text-muted)" }}>
            Supports OpenAI and Anthropic keys.
          </div>
        </div>
      )}

      {draftMessage && draftMessage !== DRAFT_NO_KEY && (
        <div>
          <div style={{
            padding: "8px 10px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            maxHeight: 150,
            overflow: "auto",
          }}>
            {draftMessage}
          </div>
          <button
            onClick={handleCopy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginTop: 6,
              padding: "4px 10px",
              borderRadius: 5,
              background: copied ? "rgba(22,163,107,0.1)" : "var(--bg-card)",
              border: "1px solid var(--border)",
              color: copied ? "var(--strong)" : "var(--text-secondary)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              width: "100%",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            {copied ? <><CheckCircle size={11} /> Copied &amp; Opened</> : <><Copy size={11} /> Copy &amp; Open LinkedIn</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Gap Action Card (for GapPanel) ──────────────────────────────────────

interface GapCardProps {
  data: GapActionData;
  onSearchRole: (query: string) => void;
}

export function GapCoachCard({ data, onSearchRole }: GapCardProps) {
  return (
    <div style={{
      padding: "14px 16px",
      background: "var(--accent-glow)",
      border: "1px solid rgba(108,75,244,0.12)",
      borderRadius: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Sparkles size={12} color="var(--accent)" />
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)", letterSpacing: "0.04em" }}>
          PRIORITY ACTION
        </span>
      </div>

      <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, marginBottom: 4 }}>
        {data.insight.label}: {data.insight.value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
        {data.insight.description.split(".")[0]}.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {data.strategies.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
            <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 10, minWidth: 14, paddingTop: 2 }}>{i + 1}.</span>
            {s}
          </div>
        ))}
      </div>

      <button
        onClick={() => onSearchRole(data.searchQuery)}
        className="btn btn-ghost"
        style={{ fontSize: 12, width: "100%", justifyContent: "center", gap: 6 }}
      >
        Search "{data.searchQuery}" in your network <ArrowRight size={12} />
      </button>
    </div>
  );
}

// ── Weekly Plan Card (for OutreachQueue) ─────────────────────────────────

interface WeeklyCardProps {
  targets: WeeklyTarget[];
}

export function WeeklyPlanCard({ targets }: WeeklyCardProps) {
  if (targets.length === 0) return null;

  return (
    <div style={{
      padding: "14px 16px",
      background: "var(--accent-glow)",
      border: "1px solid rgba(108,75,244,0.12)",
      borderRadius: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Sparkles size={12} color="var(--accent)" />
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)", letterSpacing: "0.04em" }}>
          THIS WEEK'S PLAN
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {targets.map(({ connection: c, reason }, i) => (
          <div key={c.id} style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            padding: "8px 10px", background: "var(--bg-card)",
            border: "1px solid var(--border)", borderRadius: 7,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: "var(--accent)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.position} at {c.company}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{reason}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
