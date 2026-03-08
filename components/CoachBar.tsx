"use client";

import { Sparkles, MessageCircle } from "lucide-react";
import type { BarInsight } from "@/lib/coachInsights";

interface Props {
  insight: BarInsight;
  onAction: (action: string) => void;
  onAskCoach: () => void;
}

export default function CoachBar({ insight, onAction, onAskCoach }: Props) {
  if (!insight.text) return null;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "8px 20px",
      background: "var(--accent-glow)",
      borderBottom: "1px solid rgba(108, 75, 244, 0.12)",
      flexShrink: 0,
      minHeight: 40,
    }}>
      <Sparkles size={14} color="var(--accent)" style={{ flexShrink: 0 }} />

      <span style={{
        flex: 1,
        fontSize: 13,
        color: "var(--text-secondary)",
        lineHeight: 1.4,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {insight.text}
      </span>

      {insight.actionLabel && insight.action && (
        <button
          onClick={() => onAction(insight.action!)}
          className="btn btn-primary"
          style={{ padding: "4px 12px", fontSize: 12, flexShrink: 0 }}
        >
          {insight.actionLabel}
        </button>
      )}

      <button
        onClick={onAskCoach}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
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
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--accent-dim)";
          e.currentTarget.style.color = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--text-muted)";
        }}
      >
        <MessageCircle size={11} />
        Ask Coach
      </button>
    </div>
  );
}
