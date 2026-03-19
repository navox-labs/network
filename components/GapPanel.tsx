"use client";

import { TrendingUp, Users, Zap, Info } from "lucide-react";
import type { GapAnalysis, Connection, IndustryCluster } from "@/lib/tieStrength";
import type { EnrichmentSummary } from "@/lib/enrichment";

const CLUSTER_COLORS: Record<string, string> = {
  "Tech":             "#6366f1",
  "Finance":          "#16a36b",
  "Healthcare":       "#e04590",
  "Education":        "#d9960a",
  "Government":       "#6b7280",
  "Legal":            "#0891b2",
  "Media/Marketing":  "#ea580c",
  "Manufacturing":    "#8b5cf6",
  "Consulting":       "#2563eb",
  "Nonprofit":        "#059669",
  "Other":            "#9ca3af",
};


interface Props {
  gapAnalysis: GapAnalysis;
  connections: Connection[];
  onSwitchToSearch?: (query: string) => void;
  enrichmentSummary?: EnrichmentSummary | null;
  totalConnections?: number;
}

export default function GapPanel({ gapAnalysis, connections, onSwitchToSearch, enrichmentSummary, totalConnections: totalConnectionsProp }: Props) {
  const {
    totalConnections, avgTieStrength, bridgingCapitalScore,
    bondingCapitalScore, clusterDistribution = [], rolePercentages,
    insights = [], networkHealthScore, interpretation,
  } = gapAnalysis;

  const weakCount = connections.filter(c => c.tieCategory === "weak").length;
  const moderateCount = connections.filter(c => c.tieCategory === "moderate").length;
  const strongCount = connections.filter(c => c.tieCategory === "strong").length;

  return (
    <div style={{
      height: "100%", overflow: "auto",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: 20,
    }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          Network Gap Analysis
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 600, lineHeight: 1.5 }}>
          Based on Granovetter (1973) and Rajkumar et al. (2022). Your network is analyzed for bridging vs. bonding
          capital distribution — the key predictor of job mobility per the Invisible Network paper.
        </p>
      </div>

      {/* Data Loaded section */}
      {enrichmentSummary && (
        <DataLoadedSection
          enrichmentSummary={enrichmentSummary}
          totalConnections={totalConnectionsProp ?? totalConnections}
        />
      )}

      {/* Latent ties insight */}
      {enrichmentSummary &&
        enrichmentSummary.filesLoaded.some((f) => f.toLowerCase() === "messages.csv") &&
        enrichmentSummary.messageStats.uniqueUnmatchedSenders > 0 && (
        <div style={{
          background: "rgba(108, 75, 244, 0.04)",
          border: "1px solid rgba(108, 75, 244, 0.12)",
          borderRadius: 10,
          padding: "16px 18px",
        }}>
          <div style={{
            fontSize: 12, color: "var(--accent)", letterSpacing: "0.05em",
            textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 8,
          }}>
            Latent Ties Detected
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
            <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
              {enrichmentSummary.messageStats.uniqueUnmatchedSenders}
            </strong>{" "}
            people messaged you who aren't in your connections. These are latent
            ties — people who reached out but never connected. Per the Invisible
            Network framework, these are worth reconnecting.
          </p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.4 }}>
            Based on messages.csv sender URLs not matched to connections.csv
          </p>
        </div>
      )}

      {/* Health score + key stats */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <HealthCard score={networkHealthScore} interpretation={interpretation} />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flex: 1 }}>
          <StatCard
            icon={<Users size={16} />}
            label="Total Connections"
            value={totalConnections}
            sub="Layer 1 graph"
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Bridging Capital"
            value={`${Math.round(bridgingCapitalScore * 100)}%`}
            sub={bridgingCapitalScore > 0.3 ? "Healthy" : "Low"}
            color={bridgingCapitalScore > 0.3 ? "var(--strong)" : "var(--warning)"}
          />
          <StatCard
            icon={<Zap size={16} />}
            label="Weak Ties"
            value={weakCount}
            sub="Highest job mobility value"
            color="var(--weak)"
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Avg Tie Strength"
            value={avgTieStrength}
            sub="0 = weak, 1 = strong"
          />
        </div>
      </div>

      {/* Tie distribution bar */}
      <div style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "18px 20px",
      }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 14 }}>
          Tie Strength Distribution
        </div>
        <TieBar label="Weak ties" count={weakCount} total={totalConnections} color="var(--weak)"
          note="Best for job mobility — Granovetter's key finding" />
        <TieBar label="Moderate ties" count={moderateCount} total={totalConnections} color="var(--moderate)"
          note="Reachable professional relationships" />
        <TieBar label="Strong ties" count={strongCount} total={totalConnections} color="var(--strong)"
          note="Close colleagues — valuable but often redundant info" />
        <TieBar label="Dormant ties" count={connections.filter(c => c.tieCategory === "dormant").length}
          total={totalConnections} color="var(--text-muted)" note="May need re-activation" />
      </div>

      {/* Industry cluster distribution */}
      <div style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "18px 20px",
      }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 14 }}>
          Industry Cluster Distribution
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {clusterDistribution.map(({ cluster, count, percentage }) => (
            <ClusterRow
              key={cluster}
              cluster={cluster}
              color={CLUSTER_COLORS[cluster] || "#6b7280"}
              count={count}
              percentage={percentage}
            />
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12, fontStyle: "italic", lineHeight: 1.4 }}>
          Industry inferred from company name and position title. LinkedIn does not export an industry field.
        </div>
      </div>

      {/* Role distribution collapsed — secondary to industry clusters */}

      {/* Network insights */}
      {insights.length > 0 && (
        <div>
          <div style={{
            fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.05em",
            textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 12,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Info size={12} />
            NETWORK INSIGHTS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {insights.map((insight, i) => (
              <InsightCard key={insight.type} insight={insight} rank={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HealthCard({ score, interpretation }: { score: number; interpretation: string }) {
  const color = score > 60 ? "var(--strong)" : score > 35 ? "var(--moderate)" : "var(--critical)";
  const label = score > 60 ? "Healthy" : score > 35 ? "Moderate" : "Needs Work";
  const circumference = 2 * Math.PI * 36;
  const strokeDash = (score / 100) * circumference;

  return (
    <div style={{
      background: "var(--bg-panel)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "20px 24px",
      display: "flex",
      alignItems: "center",
      gap: 20,
      minWidth: 280,
    }}>
      <svg width={90} height={90} style={{ flexShrink: 0 }}>
        <circle cx={45} cy={45} r={36} fill="none" stroke="var(--border)" strokeWidth={4} />
        <circle
          cx={45} cy={45} r={36} fill="none"
          stroke={color} strokeWidth={4}
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text x={45} y={41} textAnchor="middle" fill={color} fontSize={18} fontWeight={600} fontFamily="DM Mono">{score}</text>
        <text x={45} y={56} textAnchor="middle" fill="var(--text-muted)" fontSize={10} fontFamily="DM Sans">/ 100</text>
      </svg>
      <div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4, fontFamily: "var(--font-mono)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Network Health
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color, marginBottom: 6 }}>{label}</div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: 220 }}>
          {interpretation}
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: any) {
  return (
    <div style={{
      background: "var(--bg-panel)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "14px 16px",
      minWidth: 130,
      flex: 1,
    }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--font-mono)", color: color || "var(--text-primary)", marginBottom: 2 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.3 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: color || "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function TieBar({ label, count, total, color, note }: any) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color }}>
          {count} <span style={{ color: "var(--text-muted)" }}>({Math.round(pct)}%)</span>
        </span>
      </div>
      <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color,
          borderRadius: 3, transition: "width 0.6s ease",
        }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>{note}</div>
    </div>
  );
}

function ClusterRow({ cluster, color, count, percentage }: {
  cluster: string; color: string; count: number; percentage: number;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{cluster}</span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
          {count} ({percentage}%)
        </div>
      </div>
      <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${Math.min(percentage, 100)}%`,
          background: color + "bb",
          borderRadius: 2, transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}


const DATA_FILES = [
  { key: "connections.csv", label: "Connections" },
  { key: "messages.csv", label: "Messages" },
  { key: "endorsements_received_info.csv", label: "Endorsements" },
  { key: "recommendations_received.csv", label: "Recommendations" },
  { key: "invitations.csv", label: "Invitations" },
] as const;

function DataLoadedSection({
  enrichmentSummary,
  totalConnections,
}: {
  enrichmentSummary: EnrichmentSummary;
  totalConnections: number;
}) {
  const loadedSet = new Set(
    enrichmentSummary.filesLoaded.map((f) => f.toLowerCase())
  );

  const getDetail = (key: string): string => {
    switch (key) {
      case "connections.csv":
        return `${totalConnections} connections`;
      case "messages.csv":
        if (!loadedSet.has(key)) return "not loaded (upload to improve accuracy)";
        return `${enrichmentSummary.messageStats.totalMatched + enrichmentSummary.messageStats.totalUnmatched} messages, ${enrichmentSummary.messageStats.totalMatched} matched to connections`;
      case "endorsements_received_info.csv":
        if (!loadedSet.has(key)) return "not loaded (upload to improve accuracy)";
        return `${enrichmentSummary.endorsementCount} endorsements matched`;
      case "recommendations_received.csv":
        if (!loadedSet.has(key)) return "not loaded";
        return `${enrichmentSummary.recommendationCount} recommendations matched`;
      case "invitations.csv":
        if (!loadedSet.has(key)) return "not loaded";
        return `${enrichmentSummary.invitationStats.sentByUser + enrichmentSummary.invitationStats.receivedByUser} invitations`;
      default:
        return "";
    }
  };

  return (
    <div style={{
      background: "var(--bg-panel)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "16px 18px",
    }}>
      <div style={{
        fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.05em",
        textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 12,
      }}>
        Data Loaded
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DATA_FILES.map((f) => {
          const isLoaded = loadedSet.has(f.key);
          return (
            <div
              key={f.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: isLoaded ? "var(--text-secondary)" : "var(--text-muted)",
              }}
            >
              <span style={{ color: isLoaded ? "#10b981" : "#f59e0b", flexShrink: 0 }}>
                {isLoaded ? "\u2705" : "\u26A0\uFE0F"}
              </span>
              <span style={{ fontWeight: 500 }}>{f.label}</span>
              <span style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}>
                — {getDetail(f.key)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InsightCard({ insight, rank }: { insight: any; rank: number }) {
  const typeColors: Record<string, string> = {
    cluster_concentration: "#6366f1",
    bridge_count: "#16a36b",
    diversity_score: "#d9960a",
    confidence_note: "#6b7280",
  };
  const color = typeColors[insight.type] || "#6b7280";

  return (
    <div style={{
      background: "var(--bg-panel)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "16px 18px",
      display: "flex",
      gap: 16,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: color + "20",
        border: `1px solid ${color}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)",
        color: color,
      }}>
        {rank}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{insight.label}</span>
          <span className="badge" style={{
            background: color + "15",
            color: color,
            borderRadius: 4,
          }}>
            {insight.value}
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 6 }}>
          {insight.description}
        </p>
        <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", lineHeight: 1.4 }}>
          {insight.dataSource}
        </p>
      </div>
    </div>
  );
}
