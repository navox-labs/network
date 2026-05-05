"use client";

import { useState, useRef, useEffect } from "react";
import { Rabbit, Network, BarChart3, Search, Zap, RotateCcw, Settings, Menu, X, UserPlus } from "lucide-react";
import type { Connection, GapAnalysis } from "@/lib/tieStrength";
import type { ActivePanel } from "@/app/page";
import { useIsMobile } from "@/hooks/useIsMobile";
import Link from "next/link";

interface Props {
  connections: Connection[];
  gapAnalysis: GapAnalysis;
  activePanel: ActivePanel;
  setActivePanel: (p: ActivePanel) => void;
  csvMeta: { filename: string; generatedAt: string } | null;
  onReset: () => void;
  onOpenSettings: () => void;
  onAddManualContact?: () => void;
}

const PANELS: { id: ActivePanel; label: string; shortLabel: string; icon: React.ReactNode; desc: string }[] = [
  { id: "graph",  label: "Network Graph",   shortLabel: "Graph",   icon: <Network size={14} />,   desc: "Visualize all connections" },
  { id: "gaps",   label: "Gap Analysis",    shortLabel: "Gaps",    icon: <BarChart3 size={14} />, desc: "Bridging capital deficits" },
  { id: "search", label: "Company Search",  shortLabel: "Search",  icon: <Search size={14} />,    desc: "Find your side door" },
  { id: "queue",  label: "Outreach Queue",  shortLabel: "Queue",   icon: <Zap size={14} />,       desc: "Who to activate this week" },
];

function getHealthPillStyles(score: number) {
  if (score >= 50) {
    return { bg: "rgba(34,197,94,0.2)", color: "#22c55e" };
  }
  if (score >= 30) {
    return { bg: "rgba(217,150,10,0.2)", color: "var(--warning)" };
  }
  return { bg: "rgba(220,38,38,0.2)", color: "var(--critical)" };
}

export default function TopBar({ connections, gapAnalysis, activePanel, setActivePanel, csvMeta, onReset, onOpenSettings, onAddManualContact }: Props) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [healthPopoverOpen, setHealthPopoverOpen] = useState(false);
  const healthPillRef = useRef<HTMLButtonElement>(null);
  const healthPopoverRef = useRef<HTMLDivElement>(null);

  const weakCount = connections.filter(c => c.tieCategory === "weak").length;
  const healthScore = gapAnalysis.networkHealthScore;
  const pillStyles = getHealthPillStyles(healthScore);

  // Close health popover on outside click
  useEffect(() => {
    if (!healthPopoverOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        healthPillRef.current && !healthPillRef.current.contains(e.target as Node) &&
        healthPopoverRef.current && !healthPopoverRef.current.contains(e.target as Node)
      ) {
        setHealthPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [healthPopoverOpen]);

  if (isMobile) {
    return (
      <>
        <div style={{
          background: "var(--bg-panel)",
          borderBottom: "1px solid var(--border)",
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          height: 48,
          flexShrink: 0,
        }}>
          {/* Logo */}
          <Link
            href="https://www.navox.tech/"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              textDecoration: "none", flex: 1,
            }}
          >
            <Rabbit size={20} color="var(--accent)" />
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              color: "var(--text-secondary)", letterSpacing: "0.05em",
              fontWeight: 500,
            }}>
              NAVOX<span style={{ color: "var(--accent)" }}> INTEL</span>
            </span>
          </Link>

          {/* Health pill */}
          <button
            ref={healthPillRef}
            onClick={() => setHealthPopoverOpen(!healthPopoverOpen)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 12,
              background: pillStyles.bg, color: pillStyles.color,
              border: "none", cursor: "pointer",
              fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
              lineHeight: 1,
            }}
            title="Network health"
          >
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: pillStyles.color, flexShrink: 0,
            }} />
            {healthScore}
          </button>

          {/* Add Manual Contact */}
          {onAddManualContact && (
            <button
              className="btn btn-ghost"
              onClick={onAddManualContact}
              style={{ padding: "4px 8px", fontSize: 11, height: 28, border: "none", marginLeft: 4 }}
              title="Add contact manually"
            >
              <UserPlus size={13} />
            </button>
          )}

          {/* Settings */}
          <button
            className="btn btn-ghost"
            onClick={onOpenSettings}
            style={{ padding: "4px 8px", fontSize: 11, height: 28, border: "none", marginLeft: 4 }}
            title="AI Settings"
          >
            <Settings size={13} />
          </button>

          {/* Hamburger */}
          <button
            className="btn btn-ghost"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ padding: "4px 8px", fontSize: 11, height: 28, border: "none", marginLeft: 4 }}
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Mobile nav tabs */}
        <div style={{
          display: "flex",
          gap: 2,
          padding: "4px 12px",
          background: "var(--bg-panel)",
          borderBottom: "1px solid var(--border)",
          overflowX: "auto",
          flexShrink: 0,
          WebkitOverflowScrolling: "touch",
        }}>
          {PANELS.map((p) => (
            <button
              key={p.id}
              className={`btn btn-ghost ${activePanel === p.id ? "active" : ""}`}
              onClick={() => setActivePanel(p.id)}
              style={{ fontSize: 11, padding: "4px 10px", height: 30, whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {p.icon}
              {p.shortLabel}
            </button>
          ))}
        </div>

        {/* Mobile dropdown menu — all stats + file info + reset */}
        {menuOpen && (
          <div
            className="fade-in"
            style={{
              position: "absolute",
              top: 48 + 38,
              left: 0,
              right: 0,
              zIndex: 50,
              background: "var(--bg-panel)",
              borderBottom: "1px solid var(--border)",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            {/* Stats */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              fontFamily: "var(--font-mono)", fontSize: 11,
            }}>
              <Stat label="connections" value={connections.length} />
              <Stat label="bridges" value={connections.filter(c => c.isBridge).length} color="var(--strong)" />
              <Stat label="weak ties" value={weakCount} color="var(--weak)" />
              <Stat label="health" value={`${healthScore}%`} color={
                healthScore > 60 ? "var(--strong)"
                : healthScore > 35 ? "var(--moderate)"
                : "var(--critical)"
              } />
            </div>

            {/* Meta + reset */}
            {csvMeta && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                paddingTop: 8, borderTop: "1px solid var(--border)",
              }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", flex: 1 }}>
                  {csvMeta.filename} - {csvMeta.generatedAt}
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => { onReset(); setMenuOpen(false); }}
                  style={{ padding: "4px 10px", fontSize: 11, height: 28 }}
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
              </div>
            )}
          </div>
        )}

        {/* Health popover (mobile) */}
        {healthPopoverOpen && (
          <div
            ref={healthPopoverRef}
            className="fade-in"
            style={{
              position: "absolute",
              top: 48,
              right: 12,
              zIndex: 60,
              background: "var(--bg-panel)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "14px 16px",
              minWidth: 220,
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            }}
          >
            <HealthPopoverContent
              connections={connections}
              gapAnalysis={gapAnalysis}
              csvMeta={csvMeta}
              onReset={() => { onReset(); setHealthPopoverOpen(false); }}
            />
          </div>
        )}
      </>
    );
  }

  // Desktop layout
  return (
    <div style={{
      background: "var(--bg-panel)",
      borderBottom: "1px solid var(--border)",
      padding: "0 20px",
      display: "flex",
      alignItems: "center",
      gap: 0,
      height: 52,
      flexShrink: 0,
      position: "relative",
    }}>
      {/* Logo */}
      <Link
        href="https://www.navox.tech/"
        style={{
          display: "flex", alignItems: "center", gap: 8,
          marginRight: 28, paddingRight: 24,
          borderRight: "1px solid var(--border)",
          textDecoration: "none",
        }}
      >
        <Rabbit size={24} color="var(--accent)" />
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 12,
          color: "var(--text-secondary)", letterSpacing: "0.05em",
          fontWeight: 500,
        }}>
          NAVOX<span style={{ color: "var(--accent)" }}> INTELLIGENCE</span>
        </span>
      </Link>

      {/* Nav tabs */}
      <div style={{ display: "flex", gap: 2, flex: 1 }}>
        {PANELS.map((p) => (
          <button
            key={p.id}
            className={`btn btn-ghost ${activePanel === p.id ? "active" : ""}`}
            onClick={() => setActivePanel(p.id)}
            style={{ fontSize: 12, padding: "5px 12px", height: 34 }}
          >
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>

      {/* Add Manual Contact */}
      {onAddManualContact && (
        <button
          className="btn btn-ghost"
          onClick={onAddManualContact}
          style={{ padding: "4px 10px", fontSize: 11, height: 30, marginRight: 6 }}
          title="Add contact manually"
        >
          <UserPlus size={13} />
          <span style={{ marginLeft: 4 }}>Add</span>
        </button>
      )}

      {/* Health pill */}
      <button
        ref={healthPillRef}
        onClick={() => setHealthPopoverOpen(!healthPopoverOpen)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 12,
          background: pillStyles.bg, color: pillStyles.color,
          border: "none", cursor: "pointer",
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
          lineHeight: 1, marginRight: 8,
        }}
        title="Network health — click for details"
      >
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: pillStyles.color, flexShrink: 0,
        }} />
        {healthScore}
      </button>

      {/* Health popover (desktop) */}
      {healthPopoverOpen && (
        <div
          ref={healthPopoverRef}
          className="fade-in"
          style={{
            position: "absolute",
            top: 52,
            right: 48,
            zIndex: 60,
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "16px 18px",
            minWidth: 260,
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          }}
        >
          <HealthPopoverContent
            connections={connections}
            gapAnalysis={gapAnalysis}
            csvMeta={csvMeta}
            onReset={() => { onReset(); setHealthPopoverOpen(false); }}
          />
        </div>
      )}

      {/* Settings */}
      <button
        className="btn btn-ghost"
        onClick={onOpenSettings}
        style={{ padding: "4px 8px", fontSize: 11, height: 28 }}
        title="AI Settings"
      >
        <Settings size={13} />
      </button>
    </div>
  );
}

/** Popover content shared between desktop and mobile health pill */
function HealthPopoverContent({
  connections,
  gapAnalysis,
  csvMeta,
  onReset,
}: {
  connections: Connection[];
  gapAnalysis: GapAnalysis;
  csvMeta: { filename: string; generatedAt: string } | null;
  onReset: () => void;
}) {
  const weakCount = connections.filter(c => c.tieCategory === "weak").length;
  const healthScore = gapAnalysis.networkHealthScore;
  const healthColor = healthScore > 60 ? "var(--strong)" : healthScore > 35 ? "var(--moderate)" : "var(--critical)";
  const healthLabel = healthScore > 60 ? "Healthy" : healthScore > 35 ? "Moderate" : "Needs Work";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "var(--font-mono)", fontSize: 12 }}>
      {/* Health score */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: healthColor }}>{healthScore}%</span>
        <span style={{ fontSize: 11, color: healthColor }}>{healthLabel}</span>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <PopoverStat label="Connections" value={connections.length} />
        <PopoverStat label="Bridges" value={connections.filter(c => c.isBridge).length} color="var(--strong)" />
        <PopoverStat label="Weak ties" value={weakCount} color="var(--weak)" />
        <PopoverStat label="Health" value={`${healthScore}%`} color={healthColor} />
      </div>

      {/* File metadata */}
      {csvMeta && (
        <div style={{ paddingTop: 8, borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text-muted)" }}>
          {csvMeta.filename} - {csvMeta.generatedAt}
        </div>
      )}

      {/* Reset button */}
      <button
        className="btn btn-ghost"
        onClick={onReset}
        style={{ padding: "5px 10px", fontSize: 11, height: 28, justifyContent: "center", width: "100%", marginTop: 2 }}
      >
        <RotateCcw size={11} />
        Reset data
      </button>
    </div>
  );
}

function PopoverStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || "var(--text-primary)", fontSize: 13 }}>{value}</span>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <span style={{ color: color || "var(--text-primary)", fontWeight: 500, fontSize: 14, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ color: "var(--text-muted)", fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}
