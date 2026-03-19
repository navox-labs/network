"use client";

import { useState, useRef, useEffect } from "react";
import { Zap, Copy, CheckCircle, ExternalLink, ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import type { Connection, GapAnalysis } from "@/lib/tieStrength";
import { getWeeklyPlan } from "@/lib/coachInsights";
import { WeeklyPlanCard } from "@/components/CoachCard";
import { useIsMobile } from "@/hooks/useIsMobile";

interface Props {
  connections: Connection[];
  gapAnalysis: GapAnalysis;
}

const MESSAGE_TEMPLATES: Record<string, (conn: Connection, userName?: string) => string> = {
  weak: (c) =>
    `Hi ${c.firstName},\n\nI came across your profile and noticed you're at ${c.company || "your company"} — really interesting work in ${c.position || "your field"}.\n\nI'm [your role] with a background in [your area]. Would you be open to a 15-minute conversation about the space? Not looking for anything specific — just genuinely curious about your perspective.\n\nEither way, thanks for building in public.\n\n[Your name]\n[Your Navox profile link]`,
  moderate: (c) =>
    `Hi ${c.firstName},\n\nIt's been a while — hope things are going well at ${c.company || "your current role"}.\n\nI've been exploring some opportunities in [target area] and would love to reconnect. Would you have 15 minutes for a quick catch-up call? Would be great to hear what you've been working on.\n\n[Your name]`,
  strong: (c) =>
    `Hey ${c.firstName},\n\nQuick question — I'm actively exploring [target role] opportunities, particularly at [target companies]. Given your network at ${c.company || "in the space"}, would you know anyone worth talking to?\n\nHappy to return the favour anytime. Let me know what you think.\n\n[Your name]`,
};

export default function OutreachQueue({ connections, gapAnalysis }: Props) {
  const isMobile = useIsMobile();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [weekFilter, setWeekFilter] = useState<1 | 2>(1);
  const [overflowOpenId, setOverflowOpenId] = useState<string | null>(null);

  const queue = gapAnalysis.topActivationTargets.slice(0, weekFilter === 1 ? 8 : 15);

  const copyMessage = (conn: Connection) => {
    const template = MESSAGE_TEMPLATES[conn.tieCategory] || MESSAGE_TEMPLATES.weak;
    const msg = template(conn);
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedId(conn.id);
      setTimeout(() => setCopiedId(null), 2000);
      const url = conn.url || linkedInSearch(conn.name);
      window.open(url, "_blank", "noopener,noreferrer");
    });
  };

  const markDone = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const linkedInSearch = (name: string) =>
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name)}`;

  return (
    <div style={{ height: "100%", overflow: "auto", padding: isMobile ? "16px 12px" : "24px", display: "flex", flexDirection: "column", gap: isMobile ? 14 : 20 }}>
      {/* Weekly Plan Coach Card */}
      <WeeklyPlanCard targets={getWeeklyPlan(gapAnalysis)} />

      {/* Header */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          Outreach Queue
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: 600 }}>
          Your highest-priority activation targets, ranked by the Network Archaeology protocol from the paper.
          Weak ties to rare industry clusters rank highest — they provide non-redundant paths to new opportunities.
        </p>
      </div>

      {/* Week selector */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>SHOW:</span>
        <button
          className={`btn btn-ghost ${weekFilter === 1 ? "active" : ""}`}
          onClick={() => setWeekFilter(1)}
          style={{ fontSize: 12 }}
        >
          This week (8)
        </button>
        <button
          className={`btn btn-ghost ${weekFilter === 2 ? "active" : ""}`}
          onClick={() => setWeekFilter(2)}
          style={{ fontSize: 12 }}
        >
          Full queue (15)
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {completedIds.size}/{queue.length} activated
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--border)", borderRadius: 2 }}>
        <div style={{
          height: "100%",
          width: `${queue.length > 0 ? (completedIds.size / queue.length) * 100 : 0}%`,
          background: "var(--strong)",
          borderRadius: 2,
          transition: "width 0.3s ease",
        }} />
      </div>

      {/* Queue cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {queue.map((conn, i) => {
          const isExpanded = expandedId === conn.id;
          const isDone = completedIds.has(conn.id);
          const template = MESSAGE_TEMPLATES[conn.tieCategory] || MESSAGE_TEMPLATES.weak;
          const message = template(conn);

          return (
            <div
              key={conn.id}
              style={{
                background: isDone ? "var(--bg-card)" : "var(--bg-panel)",
                border: `1px solid ${isDone ? "rgba(22,163,107,0.2)" : "var(--border)"}`,
                borderRadius: 10,
                overflow: "hidden",
                opacity: isDone ? 0.6 : 1,
                transition: "opacity 0.2s, border-color 0.2s",
              }}
            >
              {/* Main row */}
              <div style={{ padding: isMobile ? "12px" : "14px 16px", display: "flex", gap: isMobile ? 10 : 14, alignItems: "flex-start", flexWrap: isMobile ? "wrap" : "nowrap" }}>
                {/* Rank */}
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)",
                }}>
                  {i + 1}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                      {conn.name}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                      priority {conn.activationPriority}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 1 }}>{conn.position}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{conn.company}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className={`badge badge-${conn.tieCategory}`}>
                      {conn.tieCategory} tie
                    </span>
                    <span className="badge" style={{ background: "rgba(108,75,244,0.08)", color: "var(--accent)" }}>
                      {conn.roleCategory}
                    </span>
                    {conn.isBridge && (
                      <span className="badge" style={{ background: "rgba(22,163,107,0.1)", color: "var(--strong)" }}>
                        bridge -- {conn.industryCluster}
                      </span>
                    )}
                    <span className="badge" style={{ background: "rgba(107,114,128,0.08)", color: "var(--text-muted)" }}>
                      {conn.networkPosition}
                    </span>
                  </div>
                </div>

                {/* Actions — Activate/Done + overflow menu */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center", width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "flex-end" : "flex-start", minHeight: isMobile ? 36 : "auto", position: "relative" }}>
                  <OverflowMenu
                    connId={conn.id}
                    isOpen={overflowOpenId === conn.id}
                    onToggle={() => setOverflowOpenId(overflowOpenId === conn.id ? null : conn.id)}
                    onDraftMessage={() => { setExpandedId(isExpanded ? null : conn.id); setOverflowOpenId(null); }}
                    onCopyInfo={() => { copyMessage(conn); setOverflowOpenId(null); }}
                    onOpenLinkedIn={() => { window.open(conn.url || linkedInSearch(conn.name), "_blank", "noopener,noreferrer"); setOverflowOpenId(null); }}
                    copiedId={copiedId}
                  />
                  <button
                    onClick={() => markDone(conn.id)}
                    className={`btn ${isDone ? "btn-ghost" : "btn-primary"}`}
                    style={{ padding: "5px 10px", fontSize: 11 }}
                  >
                    {isDone ? <><CheckCircle size={13} color="var(--strong)" /> Done</> : "Activate"}
                  </button>
                </div>
              </div>

              {/* Expanded message */}
              {isExpanded && (
                <div style={{
                  borderTop: "1px solid var(--border)",
                  padding: "14px 16px",
                  background: "var(--bg-card)",
                }} className="fade-in">
                  <div style={{
                    fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.05em",
                    textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 10,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span>Draft message — {conn.tieCategory} tie template</span>
                    <button
                      onClick={() => copyMessage(conn)}
                      style={{
                        background: "none", border: "none", color: "var(--accent)",
                        cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <Copy size={11} />
                      {copiedId === conn.id ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre style={{
                    whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)", fontSize: 12,
                    color: "var(--text-secondary)", lineHeight: 1.7,
                    background: "var(--bg-panel)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "12px 14px",
                  }}>
                    {message}
                  </pre>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.4 }}>
                    Customise the bracketed fields before sending. Ask a mutual connection to introduce you
                    if this is a weak tie with no prior interaction.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Paper citation footer */}
      <div style={{
        padding: "14px 18px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5,
        fontFamily: "var(--font-mono)",
      }}>
        Ranking based on: Granovetter (1973) weak-ties theory · Rajkumar et al. (2022) LinkedIn causal experiment
        · Network Archaeology Protocol, Section 6.3 of <em>The Invisible Network</em> (Yousif, 2026)
      </div>
    </div>
  );
}

function OverflowMenu({
  connId,
  isOpen,
  onToggle,
  onDraftMessage,
  onCopyInfo,
  onOpenLinkedIn,
  copiedId,
}: {
  connId: string;
  isOpen: boolean;
  onToggle: () => void;
  onDraftMessage: () => void;
  onCopyInfo: () => void;
  onOpenLinkedIn: () => void;
  copiedId: string | null;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        onToggle();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onToggle]);

  const menuItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "7px 12px",
    background: "none",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: 12,
    fontFamily: "var(--font-sans)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    textAlign: "left",
    borderRadius: 4,
    transition: "background 0.1s",
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        onClick={onToggle}
        className="btn btn-ghost"
        style={{ padding: "5px 8px", fontSize: 11 }}
        title="More actions"
      >
        <MoreHorizontal size={14} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="fade-in"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            zIndex: 50,
            marginTop: 4,
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "4px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            minWidth: 160,
          }}
        >
          <button
            style={menuItemStyle}
            onClick={onDraftMessage}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
          >
            <ChevronDown size={12} />
            Draft Message
          </button>
          <button
            style={menuItemStyle}
            onClick={onCopyInfo}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
          >
            <Copy size={12} />
            {copiedId === connId ? "Copied!" : "Copy Info"}
          </button>
          <button
            style={menuItemStyle}
            onClick={onOpenLinkedIn}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
          >
            <ExternalLink size={12} />
            Open LinkedIn
          </button>
        </div>
      )}
    </div>
  );
}
