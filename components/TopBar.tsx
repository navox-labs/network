"use client";

import { useState } from "react";
import { Rabbit, Network, BarChart3, Search, Zap, RotateCcw, Settings, Menu, X } from "lucide-react";
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
}

const PANELS: { id: ActivePanel; label: string; shortLabel: string; icon: React.ReactNode; desc: string }[] = [
  { id: "graph",  label: "Network Graph",   shortLabel: "Graph",   icon: <Network size={14} />,   desc: "Visualize all connections" },
  { id: "gaps",   label: "Gap Analysis",    shortLabel: "Gaps",    icon: <BarChart3 size={14} />, desc: "Bridging capital deficits" },
  { id: "search", label: "Company Search",  shortLabel: "Search",  icon: <Search size={14} />,    desc: "Find your side door" },
  { id: "queue",  label: "Outreach Queue",  shortLabel: "Queue",   icon: <Zap size={14} />,       desc: "Who to activate this week" },
];

export default function TopBar({ connections, gapAnalysis, activePanel, setActivePanel, csvMeta, onReset, onOpenSettings }: Props) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const weakCount = connections.filter(c => c.tieCategory === "weak").length;
  const highConf = connections.filter(c => c.confidenceLevel === "high").length;
  const medConf = connections.filter(c => c.confidenceLevel === "medium").length;
  const lowConf = connections.filter(c => c.confidenceLevel === "low").length;

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

          {/* Settings */}
          <button
            className="btn btn-ghost"
            onClick={onOpenSettings}
            style={{ padding: "4px 8px", fontSize: 11, height: 28, border: "none" }}
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

        {/* Mobile nav tabs — horizontally scrollable */}
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

        {/* Mobile dropdown menu */}
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
              <Stat label="confidence" value={`${highConf}/${medConf}/${lowConf}`} color="var(--text-secondary)" />
              <Stat label="health" value={`${gapAnalysis.networkHealthScore}%`} color={
                gapAnalysis.networkHealthScore > 60 ? "var(--strong)"
                : gapAnalysis.networkHealthScore > 35 ? "var(--moderate)"
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
      </>
    );
  }

  // Desktop layout (unchanged)
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

      {/* Stats */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        paddingLeft: 20, borderLeft: "1px solid var(--border)",
        fontFamily: "var(--font-mono)", fontSize: 12,
      }}>
        <Stat label="connections" value={connections.length} />
        <Stat label="bridges" value={connections.filter(c => c.isBridge).length} color="var(--strong)" />
        <Stat label="weak ties" value={weakCount} color="var(--weak)" />
        <Stat label="confidence" value={`${highConf}/${medConf}/${lowConf}`} color="var(--text-secondary)" />
        <Stat label="health" value={`${gapAnalysis.networkHealthScore}%`} color={
          gapAnalysis.networkHealthScore > 60 ? "var(--strong)"
          : gapAnalysis.networkHealthScore > 35 ? "var(--moderate)"
          : "var(--critical)"
        } />
      </div>

      {/* Meta + reset */}
      {csvMeta && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          paddingLeft: 20, borderLeft: "1px solid var(--border)",
          marginLeft: 16,
        }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {csvMeta.filename} - {csvMeta.generatedAt}
          </span>
          <button
            className="btn btn-ghost"
            onClick={onReset}
            style={{ padding: "4px 8px", fontSize: 11, height: 28 }}
            title="Upload new CSV"
          >
            <RotateCcw size={11} />
          </button>
        </div>
      )}

      {/* Settings */}
      <button
        className="btn btn-ghost"
        onClick={onOpenSettings}
        style={{ padding: "4px 8px", fontSize: 11, height: 28, marginLeft: csvMeta ? 4 : 16 }}
        title="AI Settings"
      >
        <Settings size={13} />
      </button>
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
