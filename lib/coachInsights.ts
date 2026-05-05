import type { Connection, GapAnalysis, NetworkInsight } from "./tieStrength";
import type { ActivePanel } from "@/app/page";
import type { OutreachVoice } from "./types";

// ── Bar Insight ────────────────────────────────────────────────────────────
// One-line contextual coaching text + action for the CoachBar

export interface BarInsight {
  text: string;
  actionLabel: string | null;
  action: "switch-gaps" | "switch-queue" | "switch-search" | "switch-graph" | "draft-message" | null;
}

export function getBarInsight(
  tab: ActivePanel,
  selectedNode: Connection | null,
  gapAnalysis: GapAnalysis | null,
  searchQuery: string,
  searchResultCount: number,
): BarInsight {
  if (!gapAnalysis) return { text: "Upload your connections to get started.", actionLabel: null, action: null };

  const bridgeCount = gapAnalysis.topActivationTargets?.filter(t => t.isBridge).length ?? 0;
  const concInsight = gapAnalysis.insights?.find(i => i.type === "cluster_concentration");

  switch (tab) {
    case "graph":
      if (selectedNode) {
        if (selectedNode.isBridge && selectedNode.activationPriority > 0.5) {
          return {
            text: `${selectedNode.firstName || selectedNode.name.split(" ")[0]} at ${selectedNode.company} is a bridge to ${selectedNode.industryCluster}. Ready to reach out?`,
            actionLabel: "Draft Message",
            action: "draft-message",
          };
        }
        return {
          text: `${selectedNode.firstName || selectedNode.name.split(" ")[0]} — ${selectedNode.tieCategory} tie, ${selectedNode.industryCluster}${selectedNode.isBridge ? ", bridge to rare cluster" : ""}. ${selectedNode.tieCategory === "dormant" ? "Consider re-activating." : ""}`,
          actionLabel: selectedNode.tieCategory !== "dormant" ? "Draft Message" : null,
          action: selectedNode.tieCategory !== "dormant" ? "draft-message" : null,
        };
      }
      return {
        text: `You have ${bridgeCount} bridge connection${bridgeCount !== 1 ? "s" : ""} to rare industry clusters. Click one to see your activation strategy.`,
        actionLabel: "View Outreach Queue",
        action: "switch-queue",
      };

    case "gaps":
      if (concInsight) {
        return {
          text: `${concInsight.description.split(".")[0]}.`,
          actionLabel: "Search Network",
          action: "switch-search",
        };
      }
      return {
        text: `Network health: ${gapAnalysis.networkHealthScore}/100. View your industry distribution for details.`,
        actionLabel: null,
        action: null,
      };

    case "search":
      if (searchQuery && searchResultCount > 0) {
        return {
          text: `${searchResultCount} connection${searchResultCount !== 1 ? "s" : ""} at "${searchQuery}". Click one to see your side door.`,
          actionLabel: null,
          action: null,
        };
      }
      if (searchQuery && searchResultCount === 0) {
        return {
          text: `No connections at "${searchQuery}". Check your network insights to identify potential paths.`,
          actionLabel: "See Insights",
          action: "switch-gaps",
        };
      }
      return {
        text: "Search for a target company to find your side door into it.",
        actionLabel: null,
        action: null,
      };

    case "queue":
      const top = gapAnalysis.topActivationTargets[0];
      if (top) {
        return {
          text: `Top priority: ${top.firstName || top.name.split(" ")[0]} at ${top.company} (${top.tieCategory} tie, ${top.industryCluster}).`,
          actionLabel: "Start Outreach",
          action: null,
        };
      }
      return { text: "Your outreach queue is ready.", actionLabel: null, action: null };

    default:
      return { text: "", actionLabel: null, action: null };
  }
}

// ── Node Coach Card ────────────────────────────────────────────────────────

export interface NodeCoachData {
  why: string;
  suggestion: string;
}

export function getNodeCoachData(conn: Connection): NodeCoachData {
  const name = conn.firstName || conn.name.split(" ")[0];

  let why: string;
  if (conn.isBridge && conn.tieCategory === "weak") {
    why = `${name} is a weak tie bridging to ${conn.industryCluster} — a rare cluster in your network. Per Granovetter, this is your highest-value connection type: they carry non-redundant information from a different professional sector.`;
  } else if (conn.isBridge) {
    why = `${name} bridges to ${conn.industryCluster}, which has very few connections in your network. This structural position makes them valuable for accessing new opportunities.`;
  } else if (conn.tieCategory === "weak") {
    why = `${name} is a weak tie. Research shows weak ties are more likely to lead to job opportunities than close friends — they inhabit different professional circles.`;
  } else if (conn.tieCategory === "dormant") {
    why = `${name} is a dormant connection. Re-activating dormant ties can be surprisingly productive — you share history but haven't depleted the relationship.`;
  } else {
    why = `${name} is a ${conn.tieCategory} tie in ${conn.industryCluster}. ${conn.tieCategory === "strong" ? "Strong ties are great for referrals and warm intros." : "Moderate ties respond well to genuine reconnection."}`;
  }

  let suggestion: string;
  if (conn.tieCategory === "strong") {
    suggestion = "Direct ask for a referral or intro to someone specific.";
  } else if (conn.tieCategory === "moderate") {
    suggestion = "Brief reconnect — ask how they're doing, then pivot to a specific question.";
  } else if (conn.tieCategory === "weak") {
    suggestion = "Reference shared context. Be specific about why you're reaching out. Keep it brief.";
  } else {
    suggestion = "Re-activate with a genuine value-add. Share an article or insight before any ask.";
  }

  return { why, suggestion };
}

// ── Gap Action Card ────────────────────────────────────────────────────────
// Now based on network insights instead of role-based gaps

export interface GapActionData {
  insight: NetworkInsight;
  strategies: string[];
  searchQuery: string;
}

export function getGapActionData(gapAnalysis: GapAnalysis): GapActionData | null {
  // Find the most actionable insight
  const concInsight = (gapAnalysis.insights || []).find(i => i.type === "cluster_concentration");
  if (!concInsight) return null;

  // Only show action card if concentration is high
  const pctMatch = String(concInsight.value).match(/(\d+)/);
  const pct = pctMatch ? parseInt(pctMatch[1], 10) : 0;
  if (pct <= 40) return null;

  const dominantCluster = concInsight.description.match(/in (\w[\w/]*)/)?.[1] || "your top industry";

  const strategies = [
    `Your network is ${pct}% concentrated in ${dominantCluster}. Diversifying industries increases bridging capital.`,
    "Attend cross-industry events or engage with professionals in adjacent fields on LinkedIn.",
    "Prioritize connecting with people outside your top 2 industry clusters.",
  ];

  return {
    insight: concInsight,
    strategies: strategies.slice(0, 3),
    searchQuery: dominantCluster,
  };
}

// ── Weekly Plan ────────────────────────────────────────────────────────────

export interface WeeklyTarget {
  connection: Connection;
  reason: string;
}

export function getWeeklyPlan(gapAnalysis: GapAnalysis): WeeklyTarget[] {
  return gapAnalysis.topActivationTargets.slice(0, 3).map((conn) => {
    const name = conn.firstName || conn.name.split(" ")[0];
    let reason: string;
    if (conn.isBridge && conn.tieCategory === "weak") {
      reason = `Weak tie + bridge to ${conn.industryCluster} = highest value. ${name} can open doors you can't see.`;
    } else if (conn.isBridge) {
      reason = `Bridge to ${conn.industryCluster}. Connects you to a rare cluster in your network.`;
    } else {
      reason = `High activation priority. ${conn.tieCategory} tie at ${conn.company}.`;
    }
    return { connection: conn, reason };
  });
}

// ── Draft Message Prompt ───────────────────────────────────────────────────

export function getDraftPrompt(conn: Connection, voice?: OutreachVoice): string {
  let prompt = `Write a short, professional outreach message to ${conn.name}.

About them:
- Position: ${conn.position} at ${conn.company}
- Industry cluster: ${conn.industryCluster}
- Tie strength: ${conn.tieCategory} (${Math.round(conn.tieStrength * 100)}%)
- Connected ${conn.daysSinceConnected} days ago
- Bridge connection: ${conn.isBridge ? "yes — rare cluster in my network" : "no"}
- Network position: ${conn.networkPosition}
- Confidence: ${conn.confidenceLevel} (tie strength is ${conn.confidenceLevel === "low" ? "estimated from old connection date" : "based on recent connection"})

Tone calibration:
${conn.tieCategory === "weak" ? "- This is a weak tie. Reference shared context, be specific about why you're reaching out, keep it brief and respectful of their time." : ""}
${conn.tieCategory === "moderate" ? "- This is a moderate tie. Warm reconnection tone, reference your connection, ask about their work before making any request." : ""}
${conn.tieCategory === "strong" ? "- This is a strong tie. Direct and friendly. You can ask directly for an intro or referral." : ""}
${conn.tieCategory === "dormant" ? "- This is a dormant connection. Lead with genuine value (share an article, insight, congratulations), don't ask for anything in the first message." : ""}`;

  if (voice?.sample) {
    prompt += `

VOICE STYLE: Match the tone, vocabulary, and sentence structure of this writing sample:
"${voice.sample}"`;
    if (voice.additionalNotes) {
      prompt += `
Additional instructions: ${voice.additionalNotes}`;
    }
  }

  prompt += `

Rules:
- Write ONLY the message body, no subject line
- Use their first name (${conn.firstName || conn.name.split(" ")[0]})
- Keep it under 100 words
- Include [bracketed placeholders] for details the user needs to fill in (their role, target companies, etc.)
- Don't be generic — make it specific to their company and role
- No emojis`;

  return prompt;
}
