import type { Connection, GapAnalysis, GapItem } from "./tieStrength";
import type { ActivePanel } from "@/app/page";

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

  const bridgeCount = gapAnalysis.topActivationTargets.filter(t => t.isBridge).length;
  const topGap = gapAnalysis.gaps.find(g => g.severity === "critical" || g.severity === "moderate");

  switch (tab) {
    case "graph":
      if (selectedNode) {
        if (selectedNode.isBridge && selectedNode.activationPriority > 0.5) {
          return {
            text: `${selectedNode.firstName || selectedNode.name.split(" ")[0]} at ${selectedNode.company} is a high-value ${selectedNode.tieCategory} tie. Ready to reach out?`,
            actionLabel: "Draft Message",
            action: "draft-message",
          };
        }
        return {
          text: `${selectedNode.firstName || selectedNode.name.split(" ")[0]} — ${selectedNode.tieCategory} tie, ${selectedNode.roleCategory}${selectedNode.isBridge ? ", bridge node" : ""}. ${selectedNode.tieCategory === "dormant" ? "Consider re-activating." : ""}`,
          actionLabel: selectedNode.tieCategory !== "dormant" ? "Draft Message" : null,
          action: selectedNode.tieCategory !== "dormant" ? "draft-message" : null,
        };
      }
      return {
        text: `You have ${bridgeCount} bridge connection${bridgeCount !== 1 ? "s" : ""}. Click one to see your activation strategy.`,
        actionLabel: "View Outreach Queue",
        action: "switch-queue",
      };

    case "gaps":
      if (topGap) {
        return {
          text: `Biggest gap: ${topGap.category} (${topGap.currentPct}% vs ${topGap.idealPct}% ideal). This limits your reach.`,
          actionLabel: "Search Network",
          action: "switch-search",
        };
      }
      return {
        text: `Network health: ${gapAnalysis.networkHealthScore}/100. Your role distribution is well-balanced.`,
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
          text: `No connections at "${searchQuery}". Check your gaps to see which roles to build toward.`,
          actionLabel: "See Gaps",
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
          text: `Top priority: ${top.firstName || top.name.split(" ")[0]} at ${top.company} (${top.tieCategory} tie, ${top.roleCategory}).`,
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
    why = `${name} is a weak tie in a bridge role (${conn.roleCategory}). Per network science, this is your highest-value connection type — they carry non-redundant information from different professional clusters.`;
  } else if (conn.isBridge) {
    why = `${name} holds a bridge role (${conn.roleCategory}) with ${conn.tieCategory} tie strength. They can connect you to hiring decisions or different clusters.`;
  } else if (conn.tieCategory === "weak") {
    why = `${name} is a weak tie. Research shows weak ties are more likely to lead to job opportunities than close friends — they inhabit different professional circles.`;
  } else if (conn.tieCategory === "dormant") {
    why = `${name} is a dormant connection. Re-activating dormant ties can be surprisingly productive — you share history but haven't depleted the relationship.`;
  } else {
    why = `${name} is a ${conn.tieCategory} tie in ${conn.roleCategory}. ${conn.tieCategory === "strong" ? "Strong ties are great for referrals and warm intros." : "Moderate ties respond well to genuine reconnection."}`;
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

export interface GapActionData {
  gap: GapItem;
  strategies: string[];
  searchQuery: string;
}

export function getGapActionData(gapAnalysis: GapAnalysis): GapActionData | null {
  const gap = gapAnalysis.gaps.find(g => g.severity === "critical" || g.severity === "moderate");
  if (!gap) return null;

  const strategies = [gap.suggestion];
  if (gap.category === "Recruiters") {
    strategies.push("Search LinkedIn for 'Recruiter' or 'Talent Acquisition' at target companies");
    strategies.push("Attend hiring events or job fairs where recruiters are present");
  } else if (gap.category === "Leadership") {
    strategies.push("Engage with content from VPs/Directors on LinkedIn");
    strategies.push("Use alumni networks to find leaders at target companies");
  } else if (gap.category === "Founders/CEOs") {
    strategies.push("Attend startup events, demo days, or pitch competitions");
    strategies.push("Engage with founder content on LinkedIn or Twitter");
  } else {
    strategies.push(`Search LinkedIn for '${gap.category}' at companies in your target list`);
  }

  return {
    gap,
    strategies: strategies.slice(0, 3),
    searchQuery: gap.category,
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
      reason = `Weak tie + bridge role = highest value. ${name} can open doors you can't see.`;
    } else if (conn.isBridge) {
      reason = `Bridge role (${conn.roleCategory}). Connects you to different clusters.`;
    } else {
      reason = `High activation priority. ${conn.tieCategory} tie at ${conn.company}.`;
    }
    return { connection: conn, reason };
  });
}

// ── Draft Message Prompt ───────────────────────────────────────────────────

export function getDraftPrompt(conn: Connection): string {
  return `Write a short, professional outreach message to ${conn.name}.

About them:
- Position: ${conn.position} at ${conn.company}
- Tie strength: ${conn.tieCategory} (${Math.round(conn.tieStrength * 100)}%)
- Connected ${conn.daysSinceConnected} days ago
- Bridge connection: ${conn.isBridge ? "yes" : "no"}
- Role category: ${conn.roleCategory}

Tone calibration:
${conn.tieCategory === "weak" ? "- This is a weak tie. Reference shared context, be specific about why you're reaching out, keep it brief and respectful of their time." : ""}
${conn.tieCategory === "moderate" ? "- This is a moderate tie. Warm reconnection tone, reference your connection, ask about their work before making any request." : ""}
${conn.tieCategory === "strong" ? "- This is a strong tie. Direct and friendly. You can ask directly for an intro or referral." : ""}
${conn.tieCategory === "dormant" ? "- This is a dormant connection. Lead with genuine value (share an article, insight, congratulations), don't ask for anything in the first message." : ""}

Rules:
- Write ONLY the message body, no subject line
- Use their first name (${conn.firstName || conn.name.split(" ")[0]})
- Keep it under 100 words
- Include [bracketed placeholders] for details the user needs to fill in (their role, target companies, etc.)
- Don't be generic — make it specific to their company and role
- No emojis`;
}
