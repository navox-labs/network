import type { ConfidenceLevel } from "./tieStrength";

// ── Confidence display helpers ────────────────────────────────────────────
// Pure functions for confidence badge styling and data source string building.
// Extracted from GraphView for testability (GraphView uses canvas, not DOM).

export interface ConfidenceBadgeStyle {
  background: string;
  color: string;
  label: string;
}

export function getConfidenceBadgeStyle(level: ConfidenceLevel): ConfidenceBadgeStyle {
  switch (level) {
    case "high":
      return { background: "rgba(34,197,94,0.08)", color: "#22c55e", label: "high confidence" };
    case "medium":
      return { background: "rgba(217,150,10,0.08)", color: "var(--warning)", label: "medium confidence" };
    case "low":
      return { background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", label: "connections only" };
  }
}

export function buildDataSourceString(conn: {
  messageCount?: number;
  messageBidirectional?: boolean;
  endorsementReceived?: boolean;
  recommendationReceived?: boolean;
}): string {
  const parts: string[] = [];

  if (conn.messageCount && conn.messageCount > 0) {
    let msg = `${conn.messageCount} messages`;
    if (conn.messageBidirectional) {
      msg += " (bidirectional)";
    }
    parts.push(msg);
  }

  if (conn.endorsementReceived) {
    parts.push("endorsed");
  }

  if (conn.recommendationReceived) {
    parts.push("recommended");
  }

  if (parts.length === 0) {
    return "connection date only";
  }

  return parts.join(" + ");
}
