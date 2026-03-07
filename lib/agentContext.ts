import type { Connection, GapAnalysis } from "./tieStrength";

export interface AgentContext {
  networkSummary: {
    totalConnections: number;
    networkHealthScore: number;
    bridgingCapitalScore: number;
    interpretation: string;
  };
  criticalGaps: {
    category: string;
    currentPct: number;
    idealPct: number;
    severity: string;
    suggestion: string;
  }[];
  topBridges: {
    name: string;
    company: string;
    position: string;
    tieCategory: string;
    roleCategory: string;
    activationPriority: number;
  }[];
  roleDistribution: Record<string, number>;
}

export function buildAgentContext(
  connections: Connection[],
  gapAnalysis: GapAnalysis
): AgentContext {
  return {
    networkSummary: {
      totalConnections: gapAnalysis.totalConnections,
      networkHealthScore: gapAnalysis.networkHealthScore,
      bridgingCapitalScore: gapAnalysis.bridgingCapitalScore,
      interpretation: gapAnalysis.interpretation,
    },
    criticalGaps: gapAnalysis.gaps
      .filter((g) => g.severity === "critical" || g.severity === "moderate")
      .map((g) => ({
        category: g.category,
        currentPct: g.currentPct,
        idealPct: g.idealPct,
        severity: g.severity,
        suggestion: g.suggestion,
      })),
    topBridges: gapAnalysis.topActivationTargets.slice(0, 10).map((c) => ({
      name: c.name,
      company: c.company,
      position: c.position,
      tieCategory: c.tieCategory,
      roleCategory: c.roleCategory,
      activationPriority: c.activationPriority,
    })),
    roleDistribution: gapAnalysis.rolePercentages,
  };
}
