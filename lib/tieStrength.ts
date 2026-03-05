/**
 * Tie Strength Model — Navox Network Graph
 *
 * Based on Granovetter (1973, 1983) and Rajkumar et al. (2022).
 *
 * KEY CORRECTION from previous recency-only model:
 * The original formula scored newer connections higher. This is backwards
 * relative to weak-ties theory: older, less-frequent contacts (weak ties)
 * provide NON-REDUNDANT information — the core mechanism of job mobility.
 *
 * A connection from 3 years ago who you rarely interact with is a BRIDGE
 * to a different professional cluster. A connection from yesterday is a
 * stranger. Both have value, but for different reasons.
 *
 * NEW MODEL — three components:
 *
 * 1. RELATIONSHIP DEPTH (40%) — proxy: how long you've known them.
 *    Older connections = more established relationship.
 *    Peaks at ~2 years (enough time to be real, not so long they've drifted).
 *
 * 2. BRIDGING POTENTIAL (35%) — proxy: role category diversity signal.
 *    Connections in roles different from your own cluster = higher bridging value.
 *    This is what makes weak ties powerful per Granovetter.
 *
 * 3. RECENCY SIGNAL (25%) — proxy: connected within last 6 months = active network.
 *    Recency still matters — very old connections may have drifted — but it is
 *    NO LONGER the dominant factor.
 *
 * Tie strength interpretation:
 *  0.7–1.0  Strong tie    — close colleagues, frequent contacts, inner circle
 *  0.4–0.69 Moderate tie  — meaningful professional relationship, reachable
 *  0.1–0.39 Weak tie      — Granovetter's "strength of weak ties" zone — MOST
 *                           valuable for job mobility and new information
 *  0.0–0.09 Dormant tie   — may need re-activation before outreach
 */

export type RoleCategory =
  | "Self"
  | "Engineers/Devs"
  | "Founders/CEOs"
  | "Recruiters"
  | "AI/ML/Data"
  | "Leadership"
  | "Design/Product"
  | "Advisors"
  | "Other";

export interface Connection {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  company: string;
  position: string;
  connectedOn: string; // ISO date string
  email?: string;
  tieStrength: number;
  tieCategory: "strong" | "moderate" | "weak" | "dormant";
  roleCategory: RoleCategory;
  daysSinceConnected: number;
  // Gap analysis fields
  isBridge: boolean;       // high bridging potential
  activationPriority: number; // 0–1, for outreach queue ranking
}

export interface GraphNode {
  id: string;
  name: string;
  company: string;
  position: string;
  roleCategory: RoleCategory;
  tieStrength: number;
  tieCategory: "strong" | "moderate" | "weak" | "dormant";
  isBridge: boolean;
  activationPriority: number;
  daysSinceConnected: number;
  // runtime graph fields
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// ── Role classification ────────────────────────────────────────────────────

const ROLE_PATTERNS: Record<RoleCategory, RegExp[]> = {
  "Self": [],
  "Engineers/Devs": [
    /engineer/i, /developer/i, /dev\b/i, /software/i, /backend/i,
    /frontend/i, /fullstack/i, /full.stack/i, /swe\b/i, /programmer/i,
    /architect/i, /devops/i, /platform/i, /infrastructure/i, /sre\b/i,
  ],
  "Founders/CEOs": [
    /founder/i, /co-founder/i, /ceo/i, /chief executive/i, /president/i,
    /owner/i, /entrepreneur/i,
  ],
  "Recruiters": [
    /recruit/i, /talent/i, /hiring/i, /hr\b/i, /human resources/i,
    /people ops/i, /people partner/i, /sourcer/i,
  ],
  "AI/ML/Data": [
    /machine learning/i, /ml\b/i, /\bai\b/i, /artificial intelligence/i,
    /data scientist/i, /data engineer/i, /data analyst/i, /llm/i,
    /deep learning/i, /nlp\b/i, /computer vision/i, /research scientist/i,
  ],
  "Leadership": [
    /\bcto\b/i, /\bcoo\b/i, /\bcfo\b/i, /\bcpo\b/i, /vp\b/i,
    /vice president/i, /director/i, /head of/i, /\bgm\b/i,
    /general manager/i, /managing director/i,
  ],
  "Design/Product": [
    /design/i, /designer/i, /ux\b/i, /ui\b/i, /product manager/i,
    /\bpm\b/i, /product owner/i, /creative/i, /brand/i,
  ],
  "Advisors": [
    /advisor/i, /adviser/i, /mentor/i, /board member/i, /investor/i,
    /angel/i, /venture/i, /vc\b/i, /consultant/i,
  ],
  "Other": [],
};

export function classifyRole(position: string): RoleCategory {
  if (!position) return "Other";
  for (const [category, patterns] of Object.entries(ROLE_PATTERNS)) {
    if (category === "Self" || category === "Other") continue;
    if (patterns.some((p) => p.test(position))) {
      return category as RoleCategory;
    }
  }
  return "Other";
}

// ── Bridging potential ─────────────────────────────────────────────────────
// Roles that most frequently bridge to hiring decisions or different clusters.
// Recruiters, Leadership, Founders, Advisors = highest bridging value per paper.

const BRIDGE_ROLES: Set<RoleCategory> = new Set([
  "Recruiters",
  "Leadership",
  "Founders/CEOs",
  "Advisors",
]);

function bridgingScore(roleCategory: RoleCategory): number {
  if (BRIDGE_ROLES.has(roleCategory)) return 1.0;
  if (roleCategory === "AI/ML/Data") return 0.6;
  if (roleCategory === "Design/Product") return 0.5;
  if (roleCategory === "Engineers/Devs") return 0.4;
  return 0.3;
}

// ── Core tie strength calculation ─────────────────────────────────────────

export function calculateTieStrength(
  connectedOnStr: string,
  roleCategory: RoleCategory
): number {
  const now = new Date();
  let daysSince = 180; // default: moderate

  if (connectedOnStr) {
    try {
      const connected = new Date(connectedOnStr);
      daysSince = Math.max(0, Math.floor((now.getTime() - connected.getTime()) / 86400000));
    } catch {
      daysSince = 180;
    }
  }

  // Component 1: Relationship depth (40%)
  // Peaks at ~730 days (2 years), tapers for very new or very old.
  // Bell-curve shape: new = shallow, 2yr = deep, 5yr+ = drifting.
  const yearsKnown = daysSince / 365;
  let depth: number;
  if (yearsKnown < 0.5) {
    depth = yearsKnown * 0.6; // ramp up slowly for new connections
  } else if (yearsKnown <= 2.5) {
    depth = 0.3 + (yearsKnown - 0.5) * 0.35; // peak zone
  } else {
    depth = Math.max(0.1, 1.0 - (yearsKnown - 2.5) * 0.12); // gradual drift
  }

  // Component 2: Bridging potential (35%)
  const bridge = bridgingScore(roleCategory);

  // Component 3: Recency signal (25%)
  // Recent = you're likely in active contact. Not dominant but real signal.
  const recency = daysSince < 30
    ? 1.0
    : daysSince < 180
    ? 0.7
    : daysSince < 365
    ? 0.4
    : daysSince < 730
    ? 0.2
    : 0.05;

  const raw = depth * 0.40 + bridge * 0.35 + recency * 0.25;
  return Math.round(Math.min(1.0, Math.max(0.0, raw)) * 1000) / 1000;
}

export function tieCategoryFromStrength(
  strength: number
): "strong" | "moderate" | "weak" | "dormant" {
  if (strength >= 0.7) return "strong";
  if (strength >= 0.4) return "moderate";
  if (strength >= 0.1) return "weak";
  return "dormant";
}

// ── Activation priority ───────────────────────────────────────────────────
// Per paper Section 6.3 Phase 2: rank by shared context + proximity to hiring.
// Weak ties in bridge roles = highest activation priority for job seekers.

export function activationPriority(
  tieStrength: number,
  roleCategory: RoleCategory,
  isBridge: boolean
): number {
  // We want weak-to-moderate ties in bridge roles to rank highest.
  // Strong ties in non-bridge roles rank lower (already activated).
  const weaknessBonus = tieStrength >= 0.1 && tieStrength < 0.5 ? 0.3 : 0;
  const bridgeBonus = isBridge ? 0.3 : 0;
  const base = tieStrength * 0.4;
  return Math.round(Math.min(1.0, base + weaknessBonus + bridgeBonus) * 100) / 100;
}

// ── CSV parsing ───────────────────────────────────────────────────────────

export interface RawCSVRow {
  "First Name"?: string;
  "Last Name"?: string;
  "Email Address"?: string;
  Company?: string;
  Position?: string;
  "Connected On"?: string;
  [key: string]: string | undefined;
}

export function parseLinkedInCSV(rows: RawCSVRow[]): Connection[] {
  return rows
    .filter((row) => row["First Name"] || row["Last Name"])
    .map((row, i) => {
      const firstName = (row["First Name"] || "").trim();
      const lastName = (row["Last Name"] || "").trim();
      const name = `${firstName} ${lastName}`.trim() || "Unknown";
      const company = (row["Company"] || "").trim();
      const position = (row["Position"] || "").trim();
      const connectedOn = (row["Connected On"] || "").trim();
      const email = (row["Email Address"] || "").trim();

      const roleCategory = classifyRole(position);
      const tieStrength = calculateTieStrength(connectedOn, roleCategory);
      const tieCategory = tieCategoryFromStrength(tieStrength);
      const isBridge = BRIDGE_ROLES.has(roleCategory);
      const priority = activationPriority(tieStrength, roleCategory, isBridge);

      let daysSince = 999;
      try {
        if (connectedOn) {
          daysSince = Math.floor(
            (Date.now() - new Date(connectedOn).getTime()) / 86400000
          );
        }
      } catch {}

      return {
        id: `conn-${i}`,
        name,
        firstName,
        lastName,
        company,
        position,
        connectedOn,
        email,
        tieStrength,
        tieCategory,
        roleCategory,
        daysSinceConnected: daysSince,
        isBridge,
        activationPriority: priority,
      };
    });
}

// ── Graph data builder ────────────────────────────────────────────────────

export function buildGraphData(connections: Connection[]): GraphData {
  const selfNode: GraphNode = {
    id: "self",
    name: "You",
    company: "",
    position: "",
    roleCategory: "Self",
    tieStrength: 1,
    tieCategory: "strong",
    isBridge: false,
    activationPriority: 0,
    daysSinceConnected: 0,
  };

  const nodes: GraphNode[] = [
    selfNode,
    ...connections.map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      position: c.position,
      roleCategory: c.roleCategory,
      tieStrength: c.tieStrength,
      tieCategory: c.tieCategory,
      isBridge: c.isBridge,
      activationPriority: c.activationPriority,
      daysSinceConnected: c.daysSinceConnected,
    })),
  ];

  const links: GraphLink[] = connections.map((c) => ({
    source: "self",
    target: c.id,
    strength: c.tieStrength,
  }));

  return { nodes, links };
}

// ── Gap analysis ──────────────────────────────────────────────────────────

export interface GapAnalysis {
  totalConnections: number;
  avgTieStrength: number;
  bridgingCapitalScore: number; // 0–1
  bondingCapitalScore: number;  // 0–1
  roleDistribution: Record<RoleCategory, number>;
  rolePercentages: Record<RoleCategory, number>;
  gaps: GapItem[];
  topActivationTargets: Connection[];
  networkHealthScore: number; // 0–100
  interpretation: string;
}

export interface GapItem {
  category: RoleCategory;
  currentCount: number;
  currentPct: number;
  idealPct: number;
  deficit: number;
  severity: "critical" | "moderate" | "minor";
  suggestion: string;
}

// Ideal distribution for a job-seeking network per paper Section 6.2
const IDEAL_DISTRIBUTION: Partial<Record<RoleCategory, number>> = {
  "Recruiters": 0.12,
  "Leadership": 0.10,
  "Founders/CEOs": 0.08,
  "AI/ML/Data": 0.15,
  "Engineers/Devs": 0.25,
  "Design/Product": 0.10,
  "Advisors": 0.08,
  "Other": 0.12,
};

export function analyzeGaps(connections: Connection[]): GapAnalysis {
  const total = connections.length;
  if (total === 0) {
    return {
      totalConnections: 0, avgTieStrength: 0, bridgingCapitalScore: 0,
      bondingCapitalScore: 0, roleDistribution: {} as any,
      rolePercentages: {} as any, gaps: [],
      topActivationTargets: [], networkHealthScore: 0,
      interpretation: "No connections loaded.",
    };
  }

  const roleCounts: Record<string, number> = {};
  let totalStrength = 0;
  let bridgeCount = 0;

  for (const c of connections) {
    roleCounts[c.roleCategory] = (roleCounts[c.roleCategory] || 0) + 1;
    totalStrength += c.tieStrength;
    if (c.isBridge) bridgeCount++;
  }

  const avgTieStrength = totalStrength / total;
  const bridgingCapitalScore = Math.round((bridgeCount / total) * 100) / 100;
  const bondingCapitalScore = Math.round((1 - bridgingCapitalScore) * 100) / 100;

  const rolePercentages: Record<string, number> = {};
  for (const [role, count] of Object.entries(roleCounts)) {
    rolePercentages[role] = Math.round((count / total) * 100);
  }

  const gaps: GapItem[] = [];
  for (const [role, idealPct] of Object.entries(IDEAL_DISTRIBUTION)) {
    const currentCount = roleCounts[role] || 0;
    const currentPct = (currentCount / total) * 100;
    const deficit = idealPct * 100 - currentPct;

    if (deficit > 2) {
      const severity: GapItem["severity"] =
        deficit > 8 ? "critical" : deficit > 4 ? "moderate" : "minor";

      const suggestions: Record<string, string> = {
        "Recruiters": "Join 2–3 LinkedIn groups for your target industry. Recruiters are highly active there and accept connection requests readily.",
        "Leadership": "Use LinkedIn Alumni tool to find VPs/Directors who graduated from your institution. Shared alumni identity increases acceptance rates significantly.",
        "Founders/CEOs": "Follow startup funding announcements on Crunchbase. Founders at Series A/B companies are often responsive to cold outreach within 48h of funding.",
        "Advisors": "Conference speakers, published authors, and active LinkedIn content creators in your field often accept DMs from engaged followers.",
        "AI/ML/Data": "Contribute to or star relevant GitHub repos. Maintainers are often reachable and value substantive engagement over generic connection requests.",
        "Design/Product": "Engage with product teardowns and design critique posts. Product people respond to thoughtful comments on their work.",
        "Engineers/Devs": "Open source contributions and technical blog comments are high-yield entry points to engineering networks.",
      };

      gaps.push({
        category: role as RoleCategory,
        currentCount,
        currentPct: Math.round(currentPct),
        idealPct: Math.round(idealPct * 100),
        deficit: Math.round(deficit),
        severity,
        suggestion: suggestions[role] || "Seek connections through industry events and professional associations.",
      });
    }
  }

  gaps.sort((a, b) => b.deficit - a.deficit);

  const topActivationTargets = [...connections]
    .sort((a, b) => b.activationPriority - a.activationPriority)
    .slice(0, 15);

  // Network health: weighted average of bridging capital, avg tie strength diversity
  const weakTiePct = connections.filter(
    (c) => c.tieCategory === "weak" || c.tieCategory === "moderate"
  ).length / total;
  const networkHealthScore = Math.round(
    bridgingCapitalScore * 40 + weakTiePct * 35 + avgTieStrength * 25
  );

  const interpretation =
    bridgingCapitalScore > 0.35
      ? "Your network has strong bridging capital — good access to diverse professional clusters."
      : bridgingCapitalScore > 0.2
      ? "Your network has moderate bridging capital. Adding more recruiters and leadership contacts will open new pathways."
      : "Your network is primarily bonding capital — valuable for support, but limited for job mobility. Prioritize building bridges to new clusters.";

  return {
    totalConnections: total,
    avgTieStrength: Math.round(avgTieStrength * 100) / 100,
    bridgingCapitalScore,
    bondingCapitalScore,
    roleDistribution: roleCounts as any,
    rolePercentages: rolePercentages as any,
    gaps,
    topActivationTargets,
    networkHealthScore,
    interpretation,
  };
}

// ── Company search ────────────────────────────────────────────────────────

export interface CompanySearchResult {
  connection: Connection;
  relevanceScore: number;
  pathDescription: string;
}

export function searchByCompany(
  connections: Connection[],
  query: string
): CompanySearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();

  return connections
    .filter(
      (c) =>
        c.company.toLowerCase().includes(q) ||
        c.position.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
    )
    .map((c) => {
      const companyMatch = c.company.toLowerCase().includes(q) ? 0.5 : 0;
      const relevanceScore = Math.min(
        1,
        companyMatch + c.tieStrength * 0.3 + c.activationPriority * 0.2
      );
      const pathDescription =
        c.tieCategory === "strong"
          ? `Direct contact — reach out directly`
          : c.tieCategory === "moderate"
          ? `Warm contact — a brief reconnect message first`
          : `Weak tie — high bridging value, request intro via mutual connection`;

      return { connection: c, relevanceScore, pathDescription };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
