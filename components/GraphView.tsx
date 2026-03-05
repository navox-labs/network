"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Connection, GraphData, GraphNode, RoleCategory } from "@/lib/tieStrength";

// Dynamic import — react-force-graph-2d uses canvas and can't SSR
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

const ROLE_COLORS: Record<RoleCategory, string> = {
  "Self":           "#4f8ef7",
  "Engineers/Devs": "#818cf8",
  "Founders/CEOs":  "#f472b6",
  "Recruiters":     "#34d399",
  "AI/ML/Data":     "#a78bfa",
  "Leadership":     "#fbbf24",
  "Design/Product": "#fb923c",
  "Advisors":       "#22d3ee",
  "Other":          "#4b5563",
};

const TIE_COLORS: Record<string, string> = {
  strong:   "#34d399",
  moderate: "#fbbf24",
  weak:     "#818cf8",
  dormant:  "#374151",
};

interface Props {
  graphData: GraphData;
  connections: Connection[];
  highlightedIds: Set<string>;
  selectedNode: Connection | null;
  onSelectNode: (c: Connection | null) => void;
}

interface TooltipState {
  x: number;
  y: number;
  node: GraphNode;
}

export default function GraphView({ graphData, connections, highlightedIds, selectedNode, onSelectNode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [filterRole, setFilterRole] = useState<RoleCategory | null>(null);
  const [filterTie, setFilterTie] = useState<string | null>(null);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ w: width, h: height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const nodeColor = useCallback((node: GraphNode) => {
    const isHighlighted = highlightedIds.size > 0 && !highlightedIds.has(node.id);
    if (isHighlighted) return "rgba(60,65,85,0.3)";
    if (node.id === "self") return "#4f8ef7";
    if (filterRole && node.roleCategory !== filterRole) return "rgba(60,65,85,0.2)";
    if (filterTie && node.tieCategory !== filterTie) return "rgba(60,65,85,0.2)";
    return ROLE_COLORS[node.roleCategory] || "#4b5563";
  }, [highlightedIds, filterRole, filterTie]);

  const nodeVal = useCallback((node: GraphNode) => {
    if (node.id === "self") return 12;
    // Size by activation priority so high-value weak ties are more visible
    return 2 + node.activationPriority * 5;
  }, []);

  const linkColor = useCallback((link: any) => {
    const targetId = typeof link.target === "object" ? link.target.id : link.target;
    if (highlightedIds.size > 0 && !highlightedIds.has(targetId)) {
      return "rgba(40,44,60,0.2)";
    }
    const conn = connections.find(c => c.id === targetId);
    if (!conn) return "rgba(40,44,60,0.3)";
    return TIE_COLORS[conn.tieCategory] + "40"; // 25% opacity
  }, [connections, highlightedIds]);

  const linkWidth = useCallback((link: any) => {
    return Math.max(0.3, (link.strength || 0.1) * 1.5);
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null, event?: MouseEvent) => {
    if (!node || node.id === "self") {
      setTooltip(null);
      return;
    }
    if (event) {
      setTooltip({ x: event.clientX + 14, y: event.clientY - 10, node });
    }
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.id === "self") return;
    const conn = connections.find(c => c.id === node.id);
    onSelectNode(conn || null);
  }, [connections, onSelectNode]);

  const drawNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const size = nodeVal(node);
    const color = nodeColor(node);
    const isSelected = selectedNode && connections.find(c => c.id === node.id) === selectedNode;

    if (node.id === "self") {
      // Self node: glowing blue circle
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
      ctx.fillStyle = "#4f8ef7";
      ctx.fill();

      // Outer ring
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, size + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(79,142,247,0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      const label = "You";
      const fontSize = Math.max(10, 12 / globalScale);
      ctx.font = `600 ${fontSize}px DM Sans, sans-serif`;
      ctx.fillStyle = "#e8eaf0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, node.x!, node.y! + size + fontSize * 0.8);
      return;
    }

    // Regular node
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Selected ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, size + 2.5, 0, 2 * Math.PI);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Bridge indicator: small dot
    if (node.isBridge && globalScale > 0.5) {
      ctx.beginPath();
      ctx.arc(node.x! + size * 0.6, node.y! - size * 0.6, size * 0.3, 0, 2 * Math.PI);
      ctx.fillStyle = "#34d399";
      ctx.fill();
    }

    // Label at higher zoom
    if (globalScale > 1.8 || isSelected) {
      const label = node.name.split(" ")[0];
      const fontSize = Math.max(8, 10 / globalScale);
      ctx.font = `${fontSize}px DM Sans, sans-serif`;
      ctx.fillStyle = "rgba(232,234,240,0.85)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, node.x!, node.y! + size + fontSize * 0.9);
    }
  }, [nodeColor, nodeVal, selectedNode, connections]);

  const roles = Object.entries(ROLE_COLORS).filter(([r]) => r !== "Self") as [RoleCategory, string][];

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative", background: "var(--bg)" }}>

      {/* Legend */}
      <div style={{
        position: "absolute", top: 16, right: 16, zIndex: 10,
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "14px 16px",
        minWidth: 170,
      }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
          Role Category
        </div>
        {roles.map(([role, color]) => (
          <div
            key={role}
            onClick={() => setFilterRole(filterRole === role ? null : role)}
            style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 5,
              cursor: "pointer", opacity: filterRole && filterRole !== role ? 0.35 : 1,
              transition: "opacity 0.15s",
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{role}</span>
          </div>
        ))}

        <div style={{ borderTop: "1px solid var(--border)", marginTop: 10, paddingTop: 10 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
            Tie Strength
          </div>
          {Object.entries(TIE_COLORS).map(([tier, color]) => (
            <div
              key={tier}
              onClick={() => setFilterTie(filterTie === tier ? null : tier)}
              style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
                cursor: "pointer", opacity: filterTie && filterTie !== tier ? 0.35 : 1,
                transition: "opacity 0.15s",
              }}
            >
              <div style={{ width: 24, height: 2, background: color, borderRadius: 1 }} />
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                {tier}
              </span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--strong)" }} />
            <span>= Bridge node</span>
          </div>
        </div>
      </div>

      {/* Selected node card */}
      {selectedNode && (
        <div style={{
          position: "absolute", bottom: 20, left: 20, zIndex: 10,
          background: "var(--bg-panel)",
          border: "1px solid var(--border-hi)",
          borderRadius: 10,
          padding: "16px 18px",
          minWidth: 260, maxWidth: 320,
        }} className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{selectedNode.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{selectedNode.position}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{selectedNode.company}</div>
            </div>
            <button
              onClick={() => onSelectNode(null)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}
            >×</button>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className={`badge badge-${selectedNode.tieCategory}`}>
              {Math.round(selectedNode.tieStrength * 100)}% {selectedNode.tieCategory} tie
            </span>
            <span className="badge" style={{ background: "rgba(79,142,247,0.1)", color: "var(--accent)" }}>
              {selectedNode.roleCategory}
            </span>
            {selectedNode.isBridge && (
              <span className="badge" style={{ background: "rgba(52,211,153,0.1)", color: "var(--strong)" }}>
                ⬡ bridge node
              </span>
            )}
          </div>

          <div style={{
            marginTop: 12, padding: "8px 12px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 12, color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}>
            <strong style={{ color: "var(--text-primary)" }}>Activation: </strong>
            {selectedNode.tieCategory === "strong"
              ? "Direct outreach — you know each other well."
              : selectedNode.tieCategory === "moderate"
              ? "Brief reconnect first, then request intro or insight."
              : selectedNode.tieCategory === "weak"
              ? "High bridging value. Ask a mutual connection for an intro, or reference shared context directly."
              : "Dormant. Re-activate with a genuine value-add message before any ask."}
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Connected {selectedNode.daysSinceConnected} days ago
            {" · "}Priority score: {selectedNode.activationPriority}
          </div>
        </div>
      )}

      {/* Canvas */}
      {typeof window !== "undefined" && (
        <ForceGraph2D
          graphData={graphData as any}
          width={dimensions.w}
          height={dimensions.h}
          backgroundColor="#0a0b0f"
          nodeColor={nodeColor as any}
          nodeVal={nodeVal as any}
          nodeCanvasObject={drawNode as any}
          nodeCanvasObjectMode={() => "replace"}
          linkColor={linkColor}
          linkWidth={linkWidth}
          onNodeHover={(node, event) => handleNodeHover(node as any, event as any)}
          onNodeClick={(node) => handleNodeClick(node as any)}
          linkDirectionalParticles={0}
          d3AlphaDecay={0.015}
          d3VelocityDecay={0.3}
          cooldownTicks={200}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          minZoom={0.2}
          maxZoom={8}
        />
      )}

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="tooltip-card"
          style={{ left: Math.min(tooltip.x, dimensions.w - 300), top: tooltip.y }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{tooltip.node.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 1 }}>{tooltip.node.position}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{tooltip.node.company}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <span className={`badge badge-${tooltip.node.tieCategory}`}>
              {Math.round(tooltip.node.tieStrength * 100)}%
            </span>
            {tooltip.node.isBridge && (
              <span className="badge" style={{ background: "rgba(52,211,153,0.1)", color: "var(--strong)" }}>bridge</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
