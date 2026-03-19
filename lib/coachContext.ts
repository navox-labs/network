import type { Connection, GapAnalysis } from "./tieStrength";
import type { ActivePanel } from "@/app/page";

export interface CoachContext {
  activeTab: ActivePanel;
  selectedNode: Connection | null;
  searchQuery: string;
  searchResultCount: number;
  gapAnalysis: GapAnalysis | null;
}

/**
 * Builds a dynamic "Current User State" section to append to the system prompt.
 * This tells the AI what the user is currently looking at so responses are contextual.
 */
export function buildContextSection(ctx: CoachContext): string {
  const lines: string[] = ["CURRENT USER STATE:"];

  switch (ctx.activeTab) {
    case "graph":
      if (ctx.selectedNode) {
        const n = ctx.selectedNode;
        lines.push(`The user is viewing the network graph and has selected a connection:`);
        lines.push(`- Name: ${n.name}`);
        lines.push(`- Position: ${n.position}`);
        lines.push(`- Company: ${n.company}`);
        lines.push(`- Tie strength: ${Math.round(n.tieStrength * 100)}% (${n.tieCategory})`);
        lines.push(`- Role category: ${n.roleCategory}`);
        lines.push(`- Industry cluster: ${n.industryCluster}`);
        lines.push(`- Network position: ${n.networkPosition}`);
        lines.push(`- Bridge connection: ${n.isBridge ? "yes — rare cluster" : "no"}`);
        lines.push(`- Confidence level: ${n.confidenceLevel}`);
        lines.push(`- Activation priority: ${Math.round(n.activationPriority * 100)}%`);
        lines.push(`- Connected ${n.daysSinceConnected} days ago`);
        lines.push(``);
        lines.push(`When the user asks a question, prioritize advice about this specific person.`);
        lines.push(`If they ask something generic, reference this person where relevant.`);
      } else {
        lines.push(`The user is viewing the network graph. No node selected.`);
      }
      break;

    case "gaps":
      lines.push(`The user is viewing the Gap Analysis tab.`);
      if (ctx.gapAnalysis) {
        lines.push(`- Network health score: ${ctx.gapAnalysis.networkHealthScore}/100`);
        const keyInsights = (ctx.gapAnalysis.insights || []).slice(0, 3);
        if (keyInsights.length > 0) {
          lines.push(`- Key insights:`);
          for (const insight of keyInsights) {
            lines.push(`  - ${insight.label}: ${insight.value} — ${insight.description}`);
          }
        }
        lines.push(``);
        lines.push(`Prioritize insight-related advice. Help them understand their network structure and how to diversify.`);
      }
      break;

    case "search":
      if (ctx.searchQuery) {
        lines.push(`The user is searching for "${ctx.searchQuery}" in Company Search.`);
        lines.push(`Found ${ctx.searchResultCount} connection${ctx.searchResultCount !== 1 ? "s" : ""}.`);
        if (ctx.searchResultCount === 0) {
          lines.push(`No direct connections found. Help them find alternative paths or suggest building connections in this area.`);
        } else {
          lines.push(`Help them identify the best "side door" — which of these connections to activate first based on tie strength and bridging potential.`);
        }
      } else {
        lines.push(`The user is on the Company Search tab but hasn't searched yet.`);
      }
      break;

    case "queue":
      lines.push(`The user is viewing the Outreach Queue — their prioritized list of people to contact.`);
      if (ctx.gapAnalysis && ctx.gapAnalysis.topActivationTargets.length > 0) {
        const top5 = ctx.gapAnalysis.topActivationTargets.slice(0, 5);
        lines.push(`Top targets:`);
        for (const t of top5) {
          lines.push(`- ${t.name} (${t.position} at ${t.company}, ${t.tieCategory} tie, ${t.networkPosition}, priority ${Math.round(t.activationPriority * 100)}%)`);
        }
        lines.push(``);
        lines.push(`Help them craft outreach messages and decide who to contact first. Calibrate message tone to tie strength.`);
      }
      break;
  }

  return lines.join("\n");
}

/**
 * Determines if a proactive nudge should appear on the coach bubble.
 * Returns null if no nudge should fire.
 */
export function shouldNudge(
  ctx: CoachContext,
  firedNudges: Set<string>
): { hint: string; nudgeKey: string } | null {
  // Bridge node selected with high priority
  if (
    ctx.activeTab === "graph" &&
    ctx.selectedNode?.isBridge &&
    ctx.selectedNode.activationPriority > 0.7
  ) {
    const key = `bridge-${ctx.selectedNode.id}`;
    if (!firedNudges.has(key)) {
      return { hint: "I have a tip about this connection", nudgeKey: key };
    }
  }

  // First time viewing gaps
  if (ctx.activeTab === "gaps" && !firedNudges.has("gaps-first")) {
    return { hint: "Want me to break down your network insights?", nudgeKey: "gaps-first" };
  }

  // Search with 0 results
  if (
    ctx.activeTab === "search" &&
    ctx.searchQuery &&
    ctx.searchResultCount === 0
  ) {
    const key = `search-empty-${ctx.searchQuery}`;
    if (!firedNudges.has(key)) {
      return { hint: "I can suggest another way in", nudgeKey: key };
    }
  }

  // First time viewing outreach queue
  if (ctx.activeTab === "queue" && !firedNudges.has("queue-first")) {
    return { hint: "I can help prioritize your outreach", nudgeKey: "queue-first" };
  }

  return null;
}

/**
 * Returns 1-2 contextually relevant suggested questions for the chat panel.
 */
export function getSuggestedQuestions(ctx: CoachContext): string[] {
  switch (ctx.activeTab) {
    case "graph":
      if (ctx.selectedNode) {
        const name = ctx.selectedNode.firstName || ctx.selectedNode.name.split(" ")[0];
        const questions = [`What's the best way to activate ${name}?`];
        if (ctx.selectedNode.company) {
          questions.push(`How strong is my path to ${ctx.selectedNode.company}?`);
        }
        return questions;
      }
      return ["Who should I reach out to first?"];

    case "gaps":
      if (ctx.gapAnalysis) {
        const concInsight = (ctx.gapAnalysis.insights || []).find(i => i.type === "cluster_concentration");
        if (concInsight) {
          return [
            "How can I diversify my network?",
            "Which industries should I build connections in?",
          ];
        }
      }
      return ["How healthy is my network?"];

    case "search":
      if (ctx.searchQuery && ctx.searchResultCount > 0) {
        return [`Who should I reach out to at ${ctx.searchQuery} first?`];
      }
      if (ctx.searchQuery && ctx.searchResultCount === 0) {
        return [`How can I get into ${ctx.searchQuery} without a direct connection?`];
      }
      return ["Which companies am I best positioned to reach?"];

    case "queue":
      if (ctx.gapAnalysis?.topActivationTargets?.[0]) {
        const topName = ctx.gapAnalysis.topActivationTargets[0].firstName ||
          ctx.gapAnalysis.topActivationTargets[0].name.split(" ")[0];
        return [
          `Help me draft a message to ${topName}`,
          "Who should I contact this week?",
        ];
      }
      return ["Help me plan my outreach for this week"];

    default:
      return [];
  }
}
