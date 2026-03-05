"use client";

import { AlertTriangle, TrendingUp, Users, Zap } from "lucide-react";
import type { GapAnalysis, Connection, RoleCategory } from "@/lib/tieStrength";

const ROLE_COLORS: Record<string, string> = {
  "Engineers/Devs": "#6366f1",
  "Founders/CEOs":  "#e04590",
  "Recruiters":     "#16a36b",
  "AI/ML/Data":     "#8b5cf6",
  "Leadership":     "#d9960a",
  "Design/Product": "#ea580c",
  "Advisors":       "#0891b2",
  "Other":          "#6b7280",
};

interface Props {
  gapAnalysis: GapAnalysis;
  connections: Connection[];
}

export default function GapPanel({ gapAnalysis, connections }: Props) {
  const {
    totalConnections, avgTieStrength, bridgingCapitalScore,
    bondingCapitalScore, rolePercentages, gaps,
    networkHealthScore, interpretation,
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
            sub={bridgingCapitalScore > 0.3 ? "✓ Healthy" : "⚠ Low"}
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

      {/* Role distribution */}
      <div style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "18px 20px",
      }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 14 }}>
          Role Distribution vs. Ideal
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.entries(ROLE_COLORS).map(([role, color]) => {
            const current = rolePercentages[role] || 0;
            const ideal = IDEAL_PCT[role] || 0;
            return (
              <RoleRow key={role} role={role} color={color} current={current} ideal={ideal} />
            );
          })}
        </div>
      </div>

      {/* Gap recommendations */}
      {gaps.length > 0 && (
        <div>
          <div style={{
            fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.05em",
            textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 12,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <AlertTriangle size={12} />
            GAPS TO CLOSE — ranked by deficit
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {gaps.map((gap, i) => (
              <GapCard key={gap.category} gap={gap} rank={i + 1} color={ROLE_COLORS[gap.category] || "#6b7280"} />
            ))}
          </div>
        </div>
      )}

      {gaps.length === 0 && (
        <div style={{
          padding: "20px 24px",
          background: "rgba(22,163,107,0.06)",
          border: "1px solid rgba(22,163,107,0.15)",
          borderRadius: 10,
          color: "var(--strong)",
          fontSize: 14,
        }}>
          ✓ Your network distribution is well-balanced across role categories.
        </div>
      )}
    </div>
  );
}

const IDEAL_PCT: Record<string, number> = {
  "Recruiters": 12,
  "Leadership": 10,
  "Founders/CEOs": 8,
  "AI/ML/Data": 15,
  "Engineers/Devs": 25,
  "Design/Product": 10,
  "Advisors": 8,
  "Other": 12,
};

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

function RoleRow({ role, color, current, ideal }: any) {
  const deficit = ideal - current;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{role}</span>
        </div>
        <div style={{ display: "flex", gap: 12, fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <span style={{ color: "var(--text-muted)" }}>ideal {ideal}%</span>
          <span style={{ color: deficit > 4 ? "var(--critical)" : deficit > 0 ? "var(--warning)" : "var(--strong)" }}>
            {current}%
          </span>
        </div>
      </div>
      <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "visible", position: "relative" }}>
        {/* Ideal marker */}
        <div style={{
          position: "absolute", left: `${Math.min(ideal, 99)}%`,
          top: -1, width: 2, height: 6, background: "var(--text-muted)",
          borderRadius: 1,
        }} />
        {/* Current bar */}
        <div style={{
          height: "100%", width: `${Math.min(current, 100)}%`,
          background: color + "bb",
          borderRadius: 2, transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

function GapCard({ gap, rank, color }: any) {
  const severityColor = gap.severity === "critical" ? "var(--critical)"
    : gap.severity === "moderate" ? "var(--warning)"
    : "var(--moderate)";

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
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{gap.category}</span>
          <span className="badge" style={{
            background: severityColor + "15",
            color: severityColor,
            borderRadius: 4,
          }}>
            {gap.severity} · −{gap.deficit}pp
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
          {gap.currentCount} connections ({gap.currentPct}%) · target: {gap.idealPct}%
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {gap.suggestion}
        </p>
      </div>
    </div>
  );
}
