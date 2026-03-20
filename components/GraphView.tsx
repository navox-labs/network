"use client";

import React, { useRef, useCallback, useState, useEffect, useMemo } from "react";
import type { Connection, GraphData, GraphNode, RoleCategory } from "@/lib/tieStrength";
import { getNodeCoachData } from "@/lib/coachInsights";
import { getConfidenceBadgeStyle, buildDataSourceString } from "@/lib/confidenceDisplay";
import { NodeCoachCard } from "@/components/CoachCard";
import { useIsMobile } from "@/hooks/useIsMobile";

const ROLE_COLORS: Record<RoleCategory, string> = {
  "Self":           "#6c4bf4",
  "Engineers/Devs": "#6366f1",
  "Founders/CEOs":  "#e04590",
  "Recruiters":     "#16a36b",
  "AI/ML/Data":     "#8b5cf6",
  "Leadership":     "#d9960a",
  "Design/Product": "#ea580c",
  "Advisors":       "#0891b2",
  "Other":          "#6b7280",
};

const TIE_COLORS: Record<string, string> = {
  strong:   "#16a36b",
  moderate: "#d9960a",
  weak:     "#6366f1",
  dormant:  "#9ca3af",
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface Props {
  graphData: GraphData;
  connections: Connection[];
  highlightedIds: Set<string>;
  selectedNode: Connection | null;
  onSelectNode: (c: Connection | null) => void;
  onDraftMessage?: (conn: Connection) => void;
  draftMessages?: Map<string, string>;
  draftingId?: string | null;
  onOpenSettings?: () => void;
}

interface TooltipState {
  x: number;
  y: number;
  node: GraphNode;
}

export default function GraphView({ graphData, connections, highlightedIds, selectedNode, onSelectNode, onDraftMessage, draftMessages, draftingId, onOpenSettings }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const hasZoomed = useRef(false);
  const isMobile = useIsMobile();
  const [ForceGraph2D, setForceGraph2D] = useState<any>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<RoleCategory | null>(null);
  const [filterTie, setFilterTie] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  // Lazy load react-force-graph-2d on client (bypasses next/dynamic ref issues)
  useEffect(() => {
    import("react-force-graph-2d").then(mod => {
      setForceGraph2D(() => mod.default);
    });
  }, []);

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
    if (isHighlighted) return "rgba(180,185,200,0.35)";
    if (node.id === "self") return "#6c4bf4";
    if (filterRole && node.roleCategory !== filterRole) return "rgba(180,185,200,0.3)";
    if (filterTie && node.tieCategory !== filterTie) return "rgba(180,185,200,0.3)";
    return ROLE_COLORS[node.roleCategory] || "#6b7280";
  }, [highlightedIds, filterRole, filterTie]);

  const nodeVal = useCallback((node: GraphNode) => {
    if (node.id === "self") return 12;
    // Size by activation priority so high-value weak ties are more visible
    return 2 + node.activationPriority * 5;
  }, []);

  const linkColor = useCallback((link: any) => {
    const targetId = typeof link.target === "object" ? link.target.id : link.target;
    if (highlightedIds.size > 0 && !highlightedIds.has(targetId)) {
      return "rgba(200,205,215,0.3)";
    }
    const conn = connections.find(c => c.id === targetId);
    if (!conn) return "rgba(200,205,215,0.35)";
    return TIE_COLORS[conn.tieCategory] + "50"; // 31% opacity
  }, [connections, highlightedIds]);

  const linkWidth = useCallback((link: any) => {
    return Math.max(0.3, (link.strength || 0.1) * 1.5);
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null, event?: MouseEvent) => {
    if (!node || node.id === "self") {
      setTooltip(null);
      setHoveredNodeId(null);
      return;
    }
    setHoveredNodeId(node.id);
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
    const isHovered = hoveredNodeId === node.id;

    if (node.id === "self") {
      // Self node: glowing purple circle
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
      ctx.fillStyle = "#6c4bf4";
      ctx.fill();

      // Outer ring
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, size + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(108,75,244,0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      return;
    }

    // Confidence-based opacity: LOW nodes are subtly faded
    const confidenceAlpha = node.confidenceLevel === "low" ? 0.7 : 1.0;

    // Regular node — semi-transparent fill with colored border
    const isDimmed = color.startsWith("rgba");
    ctx.globalAlpha = confidenceAlpha;
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
    // Stronger pastel fill so nodes are clearly visible
    ctx.fillStyle = isDimmed ? color : hexToRgba(color, 0.25);
    ctx.fill();

    // Border — changes color on hover and select
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
    if (isSelected) {
      ctx.strokeStyle = "#1a1d26";
      ctx.lineWidth = 2.5;
    } else if (isHovered) {
      ctx.strokeStyle = isDimmed ? "rgba(180,185,200,0.6)" : hexToRgba(color, 0.9);
      ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = isDimmed ? "rgba(180,185,200,0.4)" : hexToRgba(color, 0.6);
      ctx.lineWidth = 1.2;
    }
    ctx.stroke();

    // HIGH confidence: subtle green outer ring
    if (node.confidenceLevel === "high" && !isDimmed) {
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, size + 2.5, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(34,197,94,0.35)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Reset alpha after confidence modulation
    ctx.globalAlpha = 1.0;

    // Bridge indicator: pulsing red dot
    if (node.isBridge && globalScale > 0.5) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 150);
      const dotR = size * 0.25 + pulse * size * 0.1;
      ctx.beginPath();
      ctx.arc(node.x! + size * 0.65, node.y! - size * 0.65, dotR, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(217,150,10,${0.6 + pulse * 0.4})`;
      ctx.fill();
    }
  }, [nodeColor, nodeVal, selectedNode, connections, hoveredNodeId]);


  const roles = Object.entries(ROLE_COLORS).filter(([r]) => r !== "Self") as [RoleCategory, string][];

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative", background: "var(--bg)" }}>

      {/* Legend */}
      {isMobile ? (
        <>
          <button
            onClick={() => setLegendOpen(!legendOpen)}
            style={{
              position: "absolute", top: 10, right: 10, zIndex: 10,
              background: "var(--bg-panel)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 10,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            Legend {legendOpen ? "-" : "+"}
          </button>
          {legendOpen && (
            <div className="fade-in" style={{
              position: "absolute", top: 40, right: 10, zIndex: 10,
              background: "var(--bg-panel)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "12px 14px",
              minWidth: 150,
              maxHeight: "60vh",
              overflowY: "auto",
            }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
                Role Category
              </div>
              {roles.map(([role, color]) => (
                <div
                  key={role}
                  onClick={() => setFilterRole(filterRole === role ? null : role)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
                    cursor: "pointer", opacity: filterRole && filterRole !== role ? 0.35 : 1,
                    padding: "2px 0",
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{role}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8 }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
                  Tie Strength
                </div>
                {Object.entries(TIE_COLORS).map(([tier, color]) => (
                  <div
                    key={tier}
                    onClick={() => setFilterTie(filterTie === tier ? null : tier)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, marginBottom: 3,
                      cursor: "pointer", opacity: filterTie && filterTie !== tier ? 0.35 : 1,
                      padding: "2px 0",
                    }}
                  >
                    <div style={{ width: 20, height: 2, background: color, borderRadius: 1 }} />
                    <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{tier}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
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
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--moderate)" }} />
              <span>= Bridge node</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: "transparent",
                border: "2px solid rgba(34,197,94,0.35)",
                boxSizing: "border-box",
              }} />
              <span>= High confidence</span>
            </div>
          </div>
        </div>
      )}

      {/* Selected node card */}
      {selectedNode && (
        <div style={{
          position: "absolute",
          bottom: isMobile ? 0 : 20,
          left: isMobile ? 0 : 20,
          right: isMobile ? 0 : "auto",
          zIndex: 10,
          background: "var(--bg-panel)",
          border: "1px solid var(--border-hi)",
          borderRadius: isMobile ? "10px 10px 0 0" : 10,
          padding: isMobile ? "14px 16px" : "16px 18px",
          minWidth: isMobile ? "auto" : 260,
          maxWidth: isMobile ? "none" : 320,
          maxHeight: isMobile ? "50vh" : "none",
          overflowY: isMobile ? "auto" : "visible",
        }} className="fade-in">

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{selectedNode.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {selectedNode.position}{selectedNode.company ? ` @ ${selectedNode.company}` : ""}
              </div>
            </div>
            <button
              onClick={() => onSelectNode(null)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}
            >x</button>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <span className={`badge badge-${selectedNode.tieCategory}`}>
              {Math.round(selectedNode.tieStrength * 100)}% {selectedNode.tieCategory} tie
            </span>
            <span className="badge" style={{ background: "rgba(108,75,244,0.08)", color: "var(--accent)" }}>
              {selectedNode.roleCategory}
            </span>
            <span className="badge" style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1" }}>
              {selectedNode.industryCluster}
            </span>
            {selectedNode.isBridge && (
              <span className="badge" style={{ background: "rgba(22,163,107,0.1)", color: "var(--strong)" }}>
                bridge — rare cluster
              </span>
            )}
            <span className="badge" style={{ background: "rgba(107,114,128,0.08)", color: "var(--text-muted)" }}>
              {selectedNode.networkPosition}
            </span>
            {(() => {
              const badge = getConfidenceBadgeStyle(selectedNode.confidenceLevel);
              return (
                <span className="badge" style={{ background: badge.background, color: badge.color }}>
                  {badge.label}
                </span>
              );
            })()}
          </div>

          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
            Based on: {buildDataSourceString(selectedNode)}
          </div>

          <NodeCoachCard
            connection={selectedNode}
            coachData={getNodeCoachData(selectedNode)}
            onDraftMessage={onDraftMessage || (() => {})}
            draftMessage={draftMessages?.get(selectedNode.id) ?? null}
            isDrafting={draftingId === selectedNode.id}
            onOpenSettings={onOpenSettings}
          />

          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Connected {selectedNode.daysSinceConnected} days ago
            {" · "}Priority score: {Math.round(selectedNode.activationPriority * 100)}%
          </div>
        </div>
      )}

      {/* Canvas */}
      {ForceGraph2D && (
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData as any}
          width={dimensions.w}
          height={dimensions.h}
          backgroundColor="#ffffff"
          nodeColor={nodeColor as any}
          nodeVal={nodeVal as any}
          nodeCanvasObject={drawNode as any}
          nodeCanvasObjectMode={() => "replace"}
          linkColor={linkColor}
          linkWidth={linkWidth}
          onNodeHover={(node: any, event: any) => handleNodeHover(node, event)}
          onNodeClick={(node: any) => handleNodeClick(node)}
          linkDirectionalParticles={0}
          d3AlphaDecay={0.015}
          d3VelocityDecay={0.3}
          warmupTicks={100}
          cooldownTime={0}
          onEngineStop={() => {
            if (!hasZoomed.current) {
              hasZoomed.current = true;
              fgRef.current?.zoomToFit(400, 60);
            }
          }}
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
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, color: "var(--text-primary)" }}>{tooltip.node.name}</div>
          <div style={{ fontSize: 12, color: "var(--accent)", marginBottom: 1 }}>{tooltip.node.company}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{tooltip.node.position}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: TIE_COLORS[tooltip.node.tieCategory] || "var(--text-muted)" }}>
            Tie strength: {Math.round(tooltip.node.tieStrength * 100)}%
          </div>
          {tooltip.node.isBridge && (
            <div style={{ fontSize: 11, color: "var(--moderate)", marginTop: 2 }}>Bridge node</div>
          )}
        </div>
      )}
    </div>
  );
}
