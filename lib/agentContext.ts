import type { Connection, GapAnalysis } from "./tieStrength";

export interface AgentContext {
  networkSummary: {
    totalConnections: number;
    networkHealthScore: number;
    bridgingCapitalScore: number;
    interpretation: string;
  };
  networkInsights: {
    type: string;
    label: string;
    value: string | number;
    description: string;
  }[];
  topBridges: {
    name: string;
    company: string;
    position: string;
    tieCategory: string;
    roleCategory: string;
    industryCluster: string;
    networkPosition: string;
    activationPriority: number;
  }[];
  clusterDistribution: { cluster: string; count: number; percentage: number }[];
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
    networkInsights: (gapAnalysis.insights || []).map((i) => ({
      type: i.type,
      label: i.label,
      value: i.value,
      description: i.description,
    })),
    topBridges: gapAnalysis.topActivationTargets.slice(0, 10).map((c) => ({
      name: c.name,
      company: c.company,
      position: c.position,
      tieCategory: c.tieCategory,
      roleCategory: c.roleCategory,
      industryCluster: c.industryCluster,
      networkPosition: c.networkPosition,
      activationPriority: c.activationPriority,
    })),
    clusterDistribution: gapAnalysis.clusterDistribution.map((d) => ({
      cluster: d.cluster,
      count: d.count,
      percentage: d.percentage,
    })),
    roleDistribution: gapAnalysis.rolePercentages,
  };
}
