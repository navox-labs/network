"use client";

import { Rabbit, Network, BarChart3, Search, Zap, RotateCcw, Settings } from "lucide-react";
import type { Connection, GapAnalysis } from "@/lib/tieStrength";
import type { ActivePanel } from "@/app/page";
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

const PANELS: { id: ActivePanel; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "graph",  label: "Network Graph",   icon: <Network size={14} />,   desc: "Visualize all connections" },
  { id: "gaps",   label: "Gap Analysis",    icon: <BarChart3 size={14} />, desc: "Bridging capital deficits" },
  { id: "search", label: "Company Search",  icon: <Search size={14} />,    desc: "Find your side door" },
  { id: "queue",  label: "Outreach Queue",  icon: <Zap size={14} />,       desc: "Who to activate this week" },
];

export default function TopBar({ connections, gapAnalysis, activePanel, setActivePanel, csvMeta, onReset, onOpenSettings }: Props) {
  const weakCount = connections.filter(c => c.tieCategory === "weak").length;

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
            {csvMeta.filename} · {csvMeta.generatedAt}
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
