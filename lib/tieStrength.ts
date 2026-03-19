/**
 * Tie Strength Model — Navox Network Graph
 *
 * Scientific foundations:
 * - Granovetter (1973): bridges = weak ties connecting disconnected sectors.
 *   "No strong tie is a bridge." Local bridge = shortest alternative path > 2.
 * - Rajkumar et al. (2022): structural tie strength = Mij / (Di + Dj - Mij - 2).
 *   Network diversity = 1 - clustering coefficient.
 *   Inverted U-shape: moderately weak ties maximize job transmission.
 * - Yousif (2026): bridging capital deficit, three-layer graph model, network archaeology.
 *   Gap analysis measures structural diversity, not role-category quotas.
 *
 * Two-component tie strength model (no bridging potential component):
 *
 * 1. RELATIONSHIP DEPTH (60%) — proxy: how long you've known them.
 *    Peaks at ~2 years. Bell-curve: new = shallow, 2yr = deep, 5yr+ = drifting.
 *
 * 2. RECENCY SIGNAL (40%) — proxy: connection date freshness.
 *    Recent = likely in active contact. Older = may have drifted.
 *
 * Confidence disclosure:
 *   LinkedIn exports only provide connection date. No interaction frequency,
 *   message count, or mutual connections are available. All tie strength values
 *   are estimates based on connection date alone.
 *
 * Tie strength interpretation:
 *  0.7–1.0  Strong tie    — close colleagues, frequent contacts, inner circle
 *  0.4–0.69 Moderate tie  — meaningful professional relationship, reachable
 *  0.1–0.39 Weak tie      — Granovetter's "strength of weak ties" zone
 *  0.0–0.09 Dormant tie   — may need re-activation before outreach
 */

// ── Industry Cluster ──────────────────────────────────────────────────────

export type IndustryCluster =
  | "Tech"
  | "Finance"
  | "Healthcare"
  | "Education"
  | "Government"
  | "Legal"
  | "Media/Marketing"
  | "Manufacturing"
  | "Consulting"
  | "Nonprofit"
  | "Other";

const INDUSTRY_PATTERNS: { cluster: IndustryCluster; patterns: RegExp[] }[] = [
  {
    cluster: "Tech",
    patterns: [
      /\btech\b/i, /software/i, /\bsaas\b/i, /\bai\b/i, /machine learning/i,
      /\bml\b/i, /data science/i, /cloud/i, /cyber/i, /engineer/i, /developer/i,
      /\bdev\b/i, /devops/i, /\bsre\b/i, /platform/i, /infrastructure/i,
      /\bgoogle\b/i, /\bmeta\b/i, /\bfacebook\b/i, /\bamazon\b/i, /\baws\b/i,
      /\bmicrosoft\b/i, /\bapple\b/i, /\bnetflix\b/i, /\buber\b/i, /\blyft\b/i,
      /\bstripe\b/i, /\bslack\b/i, /\bsalesforce\b/i, /\boracle\b/i,
      /\badobe\b/i, /\bintuit\b/i, /\bsap\b/i, /\bibm\b/i, /\bcisco\b/i,
      /\bnvidia\b/i, /\bpalantir\b/i, /\bsnowflake\b/i, /\bdatabricks\b/i,
      /\bshopify\b/i, /\batlassian\b/i, /\bgithub\b/i, /\bgitlab\b/i,
      /programming/i, /frontend/i, /backend/i, /fullstack/i, /full.stack/i,
      /computer/i, /startup/i, /\bapp\b/i, /digital product/i,
      /information technology/i, /\bit\b/i, /\biot\b/i, /blockchain/i,
      /\bweb\b/i, /mobile\s+(app|develop)/i, /telecom/i, /\bcrm\b/i,
      /\berp\b/i, /automation/i, /robotics/i, /semiconductor/i,
      /data\s+(engineer|analyst|architect)/i, /\bapi\b/i, /microservice/i,
      /product\s+manag/i, /scrum/i, /agile/i, /\bqa\b/i, /quality assurance/i,
      /technical\s+(lead|program|project|writer)/i, /solutions\s+(architect|engineer)/i,
      /\btwilio\b/i, /\bdropbox\b/i, /\bzendesk\b/i, /\bhubspot\b/i,
      /\bsquare\b/i, /\bblock\b/i, /\bpaypal\b/i, /\brobinhood\b/i,
      /\bdoordash\b/i, /\bairbnb\b/i, /\blinkedin\b/i, /\bspotify\b/i,
      /\bpinterest\b/i, /\bsnap\b/i, /\btiktok\b/i, /\bbytedance\b/i,
      /\bsamsung\b/i, /\bintel\b/i, /\bamd\b/i, /\bvmware\b/i,
      /\bred\s*hat\b/i, /\bsplunk\b/i, /\belastic\b/i, /\bmongodb\b/i,
      /\bcloudflare\b/i, /\bdigitalocean\b/i, /\bvercel\b/i,
      /\bopen\s*ai\b/i, /\banthropic\b/i, /\bcohere\b/i,
    ],
  },
  {
    cluster: "Finance",
    patterns: [
      /financ/i, /\bbank/i, /investment/i, /\bfund\b/i, /capital/i,
      /\bvc\b/i, /venture/i, /private equity/i, /hedge fund/i, /trading/i,
      /\baccount/i, /\baudit/i, /\btax\b/i, /wealth/i, /insurance/i,
      /fintech/i, /\bjp\s*morgan/i, /\bgoldman/i, /\bmorgan stanley/i,
      /\bciti\b/i, /\bdeloitte/i, /\bkpmg/i, /\bey\b/i, /\bpwc\b/i,
      /\bcredit/i, /mortgage/i, /\bloan/i, /treasury/i, /revenue/i,
      /payroll/i, /bookkeep/i, /actuari/i, /underwrit/i, /broker/i,
      /portfolio/i, /asset\s+manag/i, /risk\s+(manag|analy)/i,
      /\bfidelity\b/i, /\bvanguard\b/i, /\bcharles schwab\b/i,
      /\brbc\b/i, /\bbmo\b/i, /\bscotiabank\b/i, /\bcibc\b/i, /\btd\b/i,
      /\bhsbc\b/i, /\bubs\b/i, /\bbarclays\b/i, /\bdeutsche bank\b/i,
      /\bwells fargo\b/i, /\bbank of america\b/i, /\bcapital one\b/i,
    ],
  },
  {
    cluster: "Healthcare",
    patterns: [
      /health/i, /medical/i, /pharma/i, /biotech/i, /clinical/i,
      /hospital/i, /doctor/i, /nurse/i, /patient/i, /therapeutic/i,
      /genomic/i, /life science/i, /\bfda\b/i,
      /dental/i, /veterinar/i, /physiother/i, /occupational therap/i,
      /mental health/i, /psych/i, /wellness/i, /nutrition/i,
      /laborator/i, /diagnostic/i, /radiol/i, /surgeon/i, /surgery/i,
      /\bpfizer\b/i, /\babbvie\b/i, /\bmerck\b/i, /\broche\b/i,
      /\bnovartis\b/i, /\bmedtronic\b/i, /\babbott\b/i,
      /caregiv/i, /telemedicine/i, /telehealth/i,
    ],
  },
  {
    cluster: "Education",
    patterns: [
      /education/i, /university/i, /college/i, /school/i, /professor/i,
      /teacher/i, /academic/i, /\bedtech\b/i, /curriculum/i, /learning/i,
      /research\s+(assistant|fellow|associate)/i,
      /instructor/i, /lecturer/i, /tutor/i, /dean\b/i, /provost/i,
      /librarian/i, /admissions/i, /training\s+(manager|specialist|coordinator)/i,
      /e-learning/i, /instructional\s+design/i,
      /\bcoursera\b/i, /\budemy\b/i,
    ],
  },
  {
    cluster: "Government",
    patterns: [
      /government/i, /federal/i, /\bgov\b/i, /public sector/i,
      /policy/i, /military/i, /defense/i, /intelligence/i,
      /department of/i, /agency/i, /municipal/i, /civic/i,
      /public\s+(admin|affairs|service|safety)/i, /diplomat/i,
      /city of\b/i, /county of\b/i, /state of\b/i,
      /armed forces/i, /navy/i, /\barmy\b/i, /air force/i,
      /homeland/i, /customs/i, /immigration/i,
    ],
  },
  {
    cluster: "Legal",
    patterns: [
      /\blaw\b/i, /legal/i, /attorney/i, /lawyer/i, /counsel/i,
      /litigation/i, /compliance/i, /regulat/i, /paralegal/i,
      /barrister/i, /solicitor/i, /notary/i, /patent/i,
      /trademark/i, /intellectual property/i, /contracts/i,
    ],
  },
  {
    cluster: "Media/Marketing",
    patterns: [
      /media/i, /marketing/i, /advertis/i, /\bpr\b/i, /public relation/i,
      /content/i, /journalist/i, /journalism/i, /broadcast/i, /publish/i, /brand/i,
      /creative\s+(director|agency)/i, /communications/i, /\bseo\b/i,
      /social media/i, /design/i, /\bux\b/i, /\bui\b/i,
      /copywriter/i, /editor/i, /graphic/i, /video\s+produc/i, /animation/i,
      /photograph/i, /influencer/i, /growth\s+(market|hack)/i,
      /demand\s+gen/i, /lead\s+gen/i, /campaign/i, /market\s+research/i,
      /event\s+(manag|coord|plan)/i, /sponsorship/i, /partnership/i,
      /entertainment/i, /film/i, /television/i, /gaming/i, /streaming/i,
      /podcast/i,
    ],
  },
  {
    cluster: "Manufacturing",
    patterns: [
      /manufactur/i, /supply chain/i, /logistics/i, /warehouse/i,
      /production/i, /operations/i, /industrial/i, /automotive/i,
      /aerospace/i, /construction/i, /mining/i, /energy/i, /oil/i,
      /\butilities\b/i,
      /procurement/i, /sourcing/i, /inventory/i, /distribution/i,
      /shipping/i, /freight/i, /transport/i, /fleet/i,
      /mechanical\s+engineer/i, /electrical\s+engineer/i, /civil\s+engineer/i,
      /quality\s+(control|engineer)/i, /plant\s+(manager|supervisor)/i,
      /\btoyota\b/i, /\bford\b/i, /\bboeing\b/i, /\blockheed/i,
      /\bsiemens\b/i, /\bhoneywell\b/i, /\bcaterpillar\b/i,
      /real\s+estate/i, /property/i, /renovation/i,
      /renewable/i, /solar/i, /petroleum/i, /natural gas/i,
      /agriculture/i, /food\s+(process|manufactur|service)/i,
      /retail/i, /grocery/i, /restaurant/i, /hospitality/i,
      /hotel/i, /tourism/i, /travel/i, /airline/i, /aviation/i,
    ],
  },
  {
    cluster: "Nonprofit",
    patterns: [
      /nonprofit/i, /non-profit/i, /\bngo\b/i, /charity/i, /foundation/i,
      /social impact/i, /humanitarian/i, /volunteer/i, /philanthrop/i,
      /advocacy/i, /community\s+(develop|organiz|outreach)/i,
      /social\s+(work|enterprise|justice)/i, /united way/i, /red cross/i,
    ],
  },
  {
    cluster: "Consulting",
    patterns: [
      /consult/i, /advisory/i, /\bmckinsey/i, /\bbain\b/i, /\bbcg\b/i,
      /\baccenture/i, /strategy\b/i, /\badvisor\b/i,
      /\bcapgemini\b/i, /\binfosys\b/i, /\btcs\b/i, /\bwipro\b/i,
      /\bcognizant\b/i, /\bhcl\b/i, /management\s+consult/i,
      /business\s+(analyst|intelligence|development)/i,
      /project\s+manag/i, /program\s+manag/i, /change\s+manag/i,
      /transformation/i, /implementation/i,
      /\bsales\b/i, /account\s+(executive|manager)/i, /business\s+develop/i,
      /customer\s+success/i, /client\s+(relations|partner|manag)/i,
      /\bhuman\s+resources\b/i, /\bhr\b/i, /people\s+(ops|partner|operations)/i,
      /talent\s+(acqui|manag)/i, /recruit/i, /hiring/i, /sourcer/i,
      /office\s+manag/i, /executive\s+assistant/i, /chief of staff/i,
      /general\s+manag/i, /\bcoo\b/i, /\bcfo\b/i, /\bcto\b/i,
      /vice\s+president/i, /\bvp\b/i, /director/i, /head\s+of/i,
      /managing\s+director/i, /founder/i, /co-founder/i, /\bceo\b/i,
      /entrepreneur/i, /owner/i, /investor/i, /venture/i, /angel/i,
      /board\s+member/i, /mentor/i,
    ],
  },
];

/**
 * Infer industry cluster from company name + position.
 * Uses keyword grouping on both fields.
 */
export function classifyIndustry(company: string, position: string): IndustryCluster {
  const combined = `${company} ${position}`;
  if (!combined.trim()) return "Other";

  for (const { cluster, patterns } of INDUSTRY_PATTERNS) {
    if (patterns.some((p) => p.test(combined))) {
      return cluster;
    }
  }
  return "Other";
}

// ── Role classification (kept for display) ────────────────────────────────

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

// ── Network Position ──────────────────────────────────────────────────────

export type NetworkPosition = "bridge" | "anchor" | "explorer" | "dormant";

// ── Connection interface ──────────────────────────────────────────────────

export interface Connection {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  company: string;
  position: string;
  connectedOn: string; // ISO date string
  email?: string;
  url?: string;
  tieStrength: number;
  tieCategory: "strong" | "moderate" | "weak" | "dormant";
  roleCategory: RoleCategory;
  daysSinceConnected: number;
  // Structural analysis fields
  industryCluster: IndustryCluster;
  isBridge: boolean;       // industry cluster appears ≤3 times in network
  networkPosition: NetworkPosition;
  confidenceLevel: "high" | "low";
  activationPriority: number; // 0–1, for outreach queue ranking
}

// ── Graph interfaces ──────────────────────────────────────────────────────

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
  industryCluster: IndustryCluster;
  networkPosition: NetworkPosition;
  confidenceLevel: "high" | "low";
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

// ── Core tie strength calculation ─────────────────────────────────────────
// Two components only: depth (60%) + recency (40%). No bridging potential.

export function calculateTieStrength(connectedOnStr: string): number {
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

  // Component 1: Relationship depth (60%)
  // Peaks at ~730 days (2 years), tapers for very new or very old.
  const yearsKnown = daysSince / 365;
  let depth: number;
  if (yearsKnown < 0.5) {
    depth = yearsKnown * 0.6; // ramp up slowly for new connections
  } else if (yearsKnown <= 2.5) {
    depth = 0.3 + (yearsKnown - 0.5) * 0.35; // peak zone
  } else {
    depth = Math.max(0.1, 1.0 - (yearsKnown - 2.5) * 0.12); // gradual drift
  }

  // Component 2: Recency signal (40%)
  const recency = daysSince < 30
    ? 1.0
    : daysSince < 180
    ? 0.7
    : daysSince < 365
    ? 0.4
    : daysSince < 730
    ? 0.2
    : 0.05;

  const raw = depth * 0.60 + recency * 0.40;
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

// ── Confidence level ─────────────────────────────────────────────────────

export function assignConfidenceLevel(daysSinceConnected: number): "high" | "low" {
  // HIGH = connected < 2 years (730 days) — recency signal is strong
  // LOW = connected 2+ years — estimated only
  return daysSinceConnected < 730 ? "high" : "low";
}

// ── Industry cluster analysis ────────────────────────────────────────────

export interface ClusterDistribution {
  cluster: IndustryCluster;
  count: number;
  percentage: number;
}

export function computeClusterDistribution(connections: Connection[]): ClusterDistribution[] {
  const counts: Partial<Record<IndustryCluster, number>> = {};
  for (const c of connections) {
    counts[c.industryCluster] = (counts[c.industryCluster] || 0) + 1;
  }
  const total = connections.length;
  return Object.entries(counts)
    .map(([cluster, count]) => ({
      cluster: cluster as IndustryCluster,
      count: count!,
      percentage: total > 0 ? Math.round((count! / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export function getDominantCluster(connections: Connection[]): IndustryCluster {
  const dist = computeClusterDistribution(connections);
  return dist.length > 0 ? dist[0].cluster : "Other";
}

// ── Structural bridge detection ──────────────────────────────────────────
// Per Granovetter: bridges connect otherwise disconnected sectors.
// We approximate: a connection whose industry cluster appears ≤3 times
// in the entire network is structurally unique — a bridging tie to a rare cluster.

export function detectBridges(
  connections: { industryCluster: IndustryCluster }[]
): Map<IndustryCluster, number> {
  const clusterCounts = new Map<IndustryCluster, number>();
  for (const c of connections) {
    clusterCounts.set(c.industryCluster, (clusterCounts.get(c.industryCluster) || 0) + 1);
  }
  return clusterCounts;
}

export function isBridgeConnection(
  industryCluster: IndustryCluster,
  clusterCounts: Map<IndustryCluster, number>
): boolean {
  return (clusterCounts.get(industryCluster) || 0) <= 3;
}

// ── Network position classification ──────────────────────────────────────
// Priority: bridge > explorer > anchor > dormant

export function classifyNetworkPosition(
  industryCluster: IndustryCluster,
  dominantCluster: IndustryCluster,
  daysSinceConnected: number,
  isBridge: boolean
): NetworkPosition {
  // Bridge: cluster appears ≤3 times (structurally unique)
  if (isBridge) return "bridge";

  // Explorer: connected < 6 months AND different industry than dominant
  if (daysSinceConnected < 183 && industryCluster !== dominantCluster) return "explorer";

  // Anchor: same industry as dominant AND connected 1+ year ago
  // Per spec priority: bridge > explorer > anchor > dormant
  if (industryCluster === dominantCluster && daysSinceConnected >= 365) return "anchor";

  // Dormant: connected 2+ years ago AND cluster appears >3 times (not unique, not recent)
  if (daysSinceConnected >= 730 && !isBridge) return "dormant";

  // Default: connections that don't fit the above categories
  if (industryCluster === dominantCluster) return "anchor";
  return "explorer";
}

// ── Activation priority ───────────────────────────────────────────────────
// Weak ties in bridge positions = highest activation priority for job seekers.

export function activationPriority(
  tieStrength: number,
  isBridge: boolean,
  networkPosition: NetworkPosition
): number {
  // Weak-to-moderate ties rank higher (per Granovetter + Rajkumar inverted U)
  const weaknessBonus = tieStrength >= 0.1 && tieStrength < 0.5 ? 0.3 : 0;
  const bridgeBonus = isBridge ? 0.3 : 0;
  const positionBonus = networkPosition === "bridge" ? 0.1 : networkPosition === "explorer" ? 0.05 : 0;
  const base = tieStrength * 0.3;
  return Math.round(Math.min(1.0, base + weaknessBonus + bridgeBonus + positionBonus) * 100) / 100;
}

// ── CSV parsing ───────────────────────────────────────────────────────────

export interface RawCSVRow {
  "First Name"?: string;
  "Last Name"?: string;
  "Email Address"?: string;
  Company?: string;
  Position?: string;
  "Connected On"?: string;
  URL?: string;
  [key: string]: string | undefined;
}

export function parseLinkedInCSV(rows: RawCSVRow[]): Connection[] {
  // First pass: classify all connections to compute cluster counts
  const preClassified = rows
    .filter((row) => row["First Name"] || row["Last Name"])
    .map((row) => {
      const company = (row["Company"] || "").trim();
      const position = (row["Position"] || "").trim();
      const connectedOn = (row["Connected On"] || "").trim();
      const industryCluster = classifyIndustry(company, position);

      let daysSince = 999;
      try {
        if (connectedOn) {
          daysSince = Math.floor(
            (Date.now() - new Date(connectedOn).getTime()) / 86400000
          );
        }
      } catch {}

      return { row, company, position, connectedOn, industryCluster, daysSince };
    });

  // Compute cluster counts for bridge detection
  const clusterCounts = detectBridges(preClassified);

  // Find dominant cluster
  const clusterCountMap: Partial<Record<IndustryCluster, number>> = {};
  for (const p of preClassified) {
    clusterCountMap[p.industryCluster] = (clusterCountMap[p.industryCluster] || 0) + 1;
  }
  let dominantCluster: IndustryCluster = "Other";
  let maxCount = 0;
  for (const [cluster, count] of Object.entries(clusterCountMap)) {
    if (count! > maxCount) {
      maxCount = count!;
      dominantCluster = cluster as IndustryCluster;
    }
  }

  // Second pass: build full Connection objects
  return preClassified.map((pre, i) => {
    const { row, company, position, connectedOn, industryCluster, daysSince } = pre;
    const firstName = (row["First Name"] || "").trim();
    const lastName = (row["Last Name"] || "").trim();
    const name = `${firstName} ${lastName}`.trim() || "Unknown";
    const email = (row["Email Address"] || "").trim();
    const url = (row["URL"] || "").trim() || undefined;

    const roleCategory = classifyRole(position);
    const tieStrength = calculateTieStrength(connectedOn);
    const tieCategory = tieCategoryFromStrength(tieStrength);
    const bridge = isBridgeConnection(industryCluster, clusterCounts);
    const confidenceLevel = assignConfidenceLevel(daysSince);
    const networkPosition = classifyNetworkPosition(
      industryCluster, dominantCluster, daysSince, bridge
    );
    const priority = activationPriority(tieStrength, bridge, networkPosition);

    return {
      id: `conn-${i}`,
      name,
      firstName,
      lastName,
      company,
      position,
      connectedOn,
      email,
      url,
      tieStrength,
      tieCategory,
      roleCategory,
      daysSinceConnected: daysSince,
      industryCluster,
      isBridge: bridge,
      networkPosition,
      confidenceLevel,
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
    industryCluster: "Other",
    networkPosition: "anchor",
    confidenceLevel: "high",
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
      industryCluster: c.industryCluster,
      networkPosition: c.networkPosition,
      confidenceLevel: c.confidenceLevel,
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

export interface NetworkInsight {
  type: "cluster_concentration" | "bridge_count" | "diversity_score" | "confidence_note";
  label: string;
  value: string | number;
  description: string;
  dataSource: string;
}

export interface GapAnalysis {
  totalConnections: number;
  avgTieStrength: number;
  bridgingCapitalScore: number; // 0–1
  bondingCapitalScore: number;  // 0–1
  clusterDistribution: ClusterDistribution[];
  roleDistribution: Record<RoleCategory, number>;
  rolePercentages: Record<RoleCategory, number>;
  insights: NetworkInsight[];
  topActivationTargets: Connection[];
  networkHealthScore: number; // 0–100
  interpretation: string;
}

export function analyzeGaps(connections: Connection[]): GapAnalysis {
  const total = connections.length;
  if (total === 0) {
    return {
      totalConnections: 0, avgTieStrength: 0, bridgingCapitalScore: 0,
      bondingCapitalScore: 0, clusterDistribution: [],
      roleDistribution: {} as Record<RoleCategory, number>,
      rolePercentages: {} as Record<RoleCategory, number>,
      insights: [],
      topActivationTargets: [], networkHealthScore: 0,
      interpretation: "No connections loaded.",
    };
  }

  // Cluster analysis
  const clusterDistribution = computeClusterDistribution(connections);
  const dominantCluster = clusterDistribution[0]?.cluster || "Other";
  const dominantPct = clusterDistribution[0]?.percentage || 0;

  // Bridge count
  const bridgeCount = connections.filter((c) => c.isBridge).length;

  // Bridging capital: % of connections outside dominant cluster
  const bridgingCapitalScore = Math.round(
    (connections.filter((c) => c.industryCluster !== dominantCluster).length / total) * 100
  ) / 100;
  const bondingCapitalScore = Math.round((1 - bridgingCapitalScore) * 100) / 100;

  // Network diversity: % of connections outside top 2 industries
  const top2Clusters = clusterDistribution.slice(0, 2).map((d) => d.cluster);
  const outsideTop2 = connections.filter((c) => !top2Clusters.includes(c.industryCluster)).length;
  const diversityScore = total > 0 ? Math.round((outsideTop2 / total) * 100) : 0;

  // Role distribution (kept for display)
  const roleCounts: Record<string, number> = {};
  let totalStrength = 0;
  for (const c of connections) {
    roleCounts[c.roleCategory] = (roleCounts[c.roleCategory] || 0) + 1;
    totalStrength += c.tieStrength;
  }
  const avgTieStrength = totalStrength / total;

  const rolePercentages: Record<string, number> = {};
  for (const [role, count] of Object.entries(roleCounts)) {
    rolePercentages[role] = Math.round((count / total) * 100);
  }

  // Build insights — directional only, no ideal percentages
  const insights: NetworkInsight[] = [
    {
      type: "cluster_concentration",
      label: "Industry Concentration",
      value: `${dominantPct}%`,
      description: `${dominantPct}% of your network is in ${dominantCluster}.${
        dominantPct > 60
          ? " High concentration — your network may echo the same professional cluster."
          : dominantPct > 40
          ? " Moderate concentration — you have some industry diversity."
          : " Low concentration — your network spans multiple industries."
      }`,
      dataSource: "Based on company name and position title — LinkedIn does not export industry field.",
    },
    {
      type: "bridge_count",
      label: "Bridging Ties",
      value: bridgeCount,
      description: `You have ${bridgeCount} connection${bridgeCount !== 1 ? "s" : ""} that ${
        bridgeCount !== 1 ? "are" : "is"
      } your only link${bridgeCount !== 1 ? "s" : ""} to ${
        bridgeCount !== 1 ? "their" : "its"
      } industry cluster (≤3 connections in that sector). Per Granovetter, these are structurally unique bridges.`,
      dataSource: "Based on company name industry grouping. Cluster frequency ≤3 = bridge.",
    },
    {
      type: "diversity_score",
      label: "Network Diversity",
      value: `${diversityScore}%`,
      description: `${diversityScore}% of your connections are outside your top 2 industries (${
        top2Clusters.join(" and ")
      }). Higher diversity = more bridging capital = more non-redundant information per Granovetter.`,
      dataSource: "Computed as % of connections outside top 2 industry clusters.",
    },
    {
      type: "confidence_note",
      label: "Data Confidence",
      value: `${connections.filter((c) => c.confidenceLevel === "high").length}/${total}`,
      description: `${
        connections.filter((c) => c.confidenceLevel === "high").length
      } connections have high-confidence tie strength (connected within 2 years). The remaining ${
        connections.filter((c) => c.confidenceLevel === "low").length
      } are estimates based on older connection dates.`,
      dataSource: "Estimated — LinkedIn does not export interaction frequency or message data.",
    },
  ];

  const topActivationTargets = [...connections]
    .sort((a, b) => b.activationPriority - a.activationPriority)
    .slice(0, 15);

  // Network health: weighted composite
  // Diversity (40%) + weak tie ratio (35%) + avg tie strength (25%)
  const weakTiePct = connections.filter(
    (c) => c.tieCategory === "weak" || c.tieCategory === "moderate"
  ).length / total;
  const networkHealthScore = Math.round(
    (diversityScore / 100) * 40 + weakTiePct * 35 + avgTieStrength * 25
  );

  const interpretation =
    bridgingCapitalScore > 0.35
      ? "Your network has strong bridging capital — good access to diverse professional clusters."
      : bridgingCapitalScore > 0.2
      ? "Your network has moderate bridging capital. Building connections in new industries will open new pathways."
      : "Your network is primarily bonding capital — concentrated in familiar industries. Prioritize building bridges to new clusters.";

  return {
    totalConnections: total,
    avgTieStrength: Math.round(avgTieStrength * 100) / 100,
    bridgingCapitalScore,
    bondingCapitalScore,
    clusterDistribution,
    roleDistribution: roleCounts as Record<RoleCategory, number>,
    rolePercentages: rolePercentages as Record<RoleCategory, number>,
    insights,
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
