import { describe, it, expect } from "vitest";
import {
  classifyIndustry,
  classifyRole,
  calculateTieStrength,
  tieCategoryFromStrength,
  assignConfidenceLevel,
  isBridgeConnection,
  detectBridges,
  classifyNetworkPosition,
  activationPriority,
  parseLinkedInCSV,
  analyzeGaps,
  buildGraphData,
  type IndustryCluster,
  type RawCSVRow,
  type Connection,
} from "./tieStrength";

// ── Industry cluster classification ──────────────────────────────────────

describe("classifyIndustry", () => {
  it("classifies Tech from company name", () => {
    expect(classifyIndustry("Google", "Product Manager")).toBe("Tech");
    expect(classifyIndustry("Microsoft", "Designer")).toBe("Tech");
    expect(classifyIndustry("Stripe", "Account Executive")).toBe("Tech");
  });

  it("classifies Tech from position title", () => {
    expect(classifyIndustry("Acme Corp", "Software Engineer")).toBe("Tech");
    expect(classifyIndustry("Unknown LLC", "Backend Developer")).toBe("Tech");
    expect(classifyIndustry("Small Co", "DevOps Engineer")).toBe("Tech");
  });

  it("classifies Finance", () => {
    expect(classifyIndustry("Goldman Sachs", "Analyst")).toBe("Finance");
    expect(classifyIndustry("Fidelity", "Investment Manager")).toBe("Finance");
    expect(classifyIndustry("Local Bank", "Banking Associate")).toBe("Finance");
  });

  it("classifies Healthcare", () => {
    expect(classifyIndustry("Pfizer", "Pharmaceutical Rep")).toBe("Healthcare");
    expect(classifyIndustry("City Hospital", "Medical Director")).toBe("Healthcare");
  });

  it("classifies Education", () => {
    expect(classifyIndustry("MIT", "Professor")).toBe("Education");
    expect(classifyIndustry("Local School District", "Teacher")).toBe("Education");
  });

  it("classifies Government", () => {
    expect(classifyIndustry("Department of Defense", "Analyst")).toBe("Government");
    expect(classifyIndustry("City Gov", "Policy Advisor")).toBe("Government");
  });

  it("classifies Legal", () => {
    expect(classifyIndustry("White & Case", "Attorney")).toBe("Legal");
    expect(classifyIndustry("Legal Corp", "Lawyer")).toBe("Legal");
  });

  it("classifies Media/Marketing", () => {
    expect(classifyIndustry("CNN", "Journalist")).toBe("Media/Marketing");
    expect(classifyIndustry("Ogilvy", "Marketing Manager")).toBe("Media/Marketing");
    expect(classifyIndustry("Media Corp", "Content Writer")).toBe("Media/Marketing");
  });

  it("classifies Manufacturing", () => {
    expect(classifyIndustry("Ford", "Automotive Specialist")).toBe("Manufacturing");
    expect(classifyIndustry("Logistics Co", "Supply Chain Manager")).toBe("Manufacturing");
    expect(classifyIndustry("Boeing", "Aerospace Analyst")).toBe("Manufacturing");
  });

  it("classifies Consulting", () => {
    expect(classifyIndustry("McKinsey", "Associate")).toBe("Consulting");
    expect(classifyIndustry("Accenture", "Manager")).toBe("Consulting");
    expect(classifyIndustry("Bain", "Partner")).toBe("Consulting");
  });

  it("classifies Nonprofit", () => {
    expect(classifyIndustry("Red Cross", "Nonprofit Director")).toBe("Nonprofit");
    expect(classifyIndustry("NGO International", "Program Manager")).toBe("Nonprofit");
  });

  it("returns Other for unrecognizable inputs", () => {
    expect(classifyIndustry("", "")).toBe("Other");
    expect(classifyIndustry("XYZ Inc", "Associate")).toBe("Other");
  });
});

// ── Tie strength calculation ─────────────────────────────────────────────

describe("calculateTieStrength", () => {
  it("returns a value between 0 and 1", () => {
    const strength = calculateTieStrength("2024-01-01");
    expect(strength).toBeGreaterThanOrEqual(0);
    expect(strength).toBeLessThanOrEqual(1);
  });

  it("peaks at moderate age (depth peaks at ~2 years)", () => {
    const twoYears = new Date();
    twoYears.setFullYear(twoYears.getFullYear() - 2);
    const veryOld = new Date();
    veryOld.setFullYear(veryOld.getFullYear() - 7);

    const peakStrength = calculateTieStrength(twoYears.toISOString());
    const veryOldStrength = calculateTieStrength(veryOld.toISOString());
    // 2-year connection should have higher strength than 7-year due to both depth and recency
    expect(peakStrength).toBeGreaterThan(veryOldStrength);
  });

  it("handles empty string gracefully", () => {
    const strength = calculateTieStrength("");
    expect(strength).toBeGreaterThanOrEqual(0);
    expect(strength).toBeLessThanOrEqual(1);
  });

  it("does not include bridging potential (only depth + recency)", () => {
    // Same connection date should give same strength regardless of any other factor
    const date = "2024-06-15";
    const s1 = calculateTieStrength(date);
    const s2 = calculateTieStrength(date);
    expect(s1).toBe(s2);
  });
});

describe("tieCategoryFromStrength", () => {
  it("classifies strong ties", () => {
    expect(tieCategoryFromStrength(0.7)).toBe("strong");
    expect(tieCategoryFromStrength(1.0)).toBe("strong");
  });

  it("classifies moderate ties", () => {
    expect(tieCategoryFromStrength(0.4)).toBe("moderate");
    expect(tieCategoryFromStrength(0.69)).toBe("moderate");
  });

  it("classifies weak ties", () => {
    expect(tieCategoryFromStrength(0.1)).toBe("weak");
    expect(tieCategoryFromStrength(0.39)).toBe("weak");
  });

  it("classifies dormant ties", () => {
    expect(tieCategoryFromStrength(0.09)).toBe("dormant");
    expect(tieCategoryFromStrength(0.0)).toBe("dormant");
  });
});

// ── Confidence level ─────────────────────────────────────────────────────

describe("assignConfidenceLevel", () => {
  it("returns high for connections within 2 years", () => {
    expect(assignConfidenceLevel(0)).toBe("high");
    expect(assignConfidenceLevel(365)).toBe("high");
    expect(assignConfidenceLevel(729)).toBe("high");
  });

  it("returns low for connections 2+ years old", () => {
    expect(assignConfidenceLevel(730)).toBe("low");
    expect(assignConfidenceLevel(1000)).toBe("low");
    expect(assignConfidenceLevel(2000)).toBe("low");
  });
});

// ── Bridge detection ─────────────────────────────────────────────────────

describe("bridge detection", () => {
  it("detects bridges when cluster count is 3 or fewer", () => {
    const clusterCounts = new Map<IndustryCluster, number>([
      ["Tech", 50],
      ["Finance", 3],
      ["Healthcare", 1],
      ["Legal", 4],
    ]);

    expect(isBridgeConnection("Finance", clusterCounts)).toBe(true);   // exactly 3
    expect(isBridgeConnection("Healthcare", clusterCounts)).toBe(true); // 1
    expect(isBridgeConnection("Tech", clusterCounts)).toBe(false);      // 50
    expect(isBridgeConnection("Legal", clusterCounts)).toBe(false);     // 4
  });

  it("treats missing clusters as bridges", () => {
    const clusterCounts = new Map<IndustryCluster, number>([
      ["Tech", 10],
    ]);
    expect(isBridgeConnection("Nonprofit", clusterCounts)).toBe(true); // 0 = bridge
  });

  it("detectBridges correctly counts clusters", () => {
    const connections = [
      { industryCluster: "Tech" as IndustryCluster },
      { industryCluster: "Tech" as IndustryCluster },
      { industryCluster: "Finance" as IndustryCluster },
      { industryCluster: "Healthcare" as IndustryCluster },
    ];
    const counts = detectBridges(connections);
    expect(counts.get("Tech")).toBe(2);
    expect(counts.get("Finance")).toBe(1);
    expect(counts.get("Healthcare")).toBe(1);
  });
});

// ── Network position classification ──────────────────────────────────────

describe("classifyNetworkPosition", () => {
  it("classifies bridge when isBridge is true", () => {
    expect(classifyNetworkPosition("Healthcare", "Tech", 100, true)).toBe("bridge");
    expect(classifyNetworkPosition("Tech", "Tech", 1000, true)).toBe("bridge");
  });

  it("classifies explorer: recent + different industry", () => {
    // < 6 months (183 days) AND different from dominant
    expect(classifyNetworkPosition("Finance", "Tech", 90, false)).toBe("explorer");
    expect(classifyNetworkPosition("Healthcare", "Tech", 1, false)).toBe("explorer");
  });

  it("classifies anchor: same industry + connected 1+ year", () => {
    // Same as dominant AND >= 365 days
    expect(classifyNetworkPosition("Tech", "Tech", 400, false)).toBe("anchor");
    expect(classifyNetworkPosition("Tech", "Tech", 365, false)).toBe("anchor");
  });

  it("classifies dormant: 2+ years old + different cluster + not bridge", () => {
    // >= 730 days AND not a bridge AND not same cluster (same cluster = anchor per priority)
    expect(classifyNetworkPosition("Finance", "Tech", 800, false)).toBe("dormant");
    // Same cluster + 2+ years = anchor (anchor has priority over dormant per spec)
    expect(classifyNetworkPosition("Tech", "Tech", 800, false)).toBe("anchor");
  });

  it("bridge takes priority over other classifications", () => {
    // Would be dormant (730+ days, same cluster) but isBridge = true
    expect(classifyNetworkPosition("Tech", "Tech", 800, true)).toBe("bridge");
    // Would be explorer (different cluster, recent) but isBridge = true
    expect(classifyNetworkPosition("Finance", "Tech", 30, true)).toBe("bridge");
  });

  it("explorer takes priority over anchor for recent cross-cluster", () => {
    // Different cluster, recent — should be explorer, not anchor
    expect(classifyNetworkPosition("Finance", "Tech", 100, false)).toBe("explorer");
  });

  it("defaults to anchor for same-cluster connections that dont fit other categories", () => {
    // Same cluster, < 365 days (not anchor by strict rule), not bridge, not dormant
    expect(classifyNetworkPosition("Tech", "Tech", 200, false)).toBe("anchor");
  });

  it("defaults to explorer for different-cluster mid-age connections", () => {
    // Different cluster, 183-729 days — doesn't match explorer (>183), not anchor (different cluster), not dormant (<730)
    expect(classifyNetworkPosition("Finance", "Tech", 300, false)).toBe("explorer");
  });
});

// ── Activation priority ──────────────────────────────────────────────────

describe("activationPriority", () => {
  it("gives higher priority to bridge connections", () => {
    const bridgePriority = activationPriority(0.3, true, "bridge");
    const nonBridgePriority = activationPriority(0.3, false, "anchor");
    expect(bridgePriority).toBeGreaterThan(nonBridgePriority);
  });

  it("gives bonus to weak-to-moderate tie strength", () => {
    const weakPriority = activationPriority(0.3, false, "explorer");
    const strongPriority = activationPriority(0.8, false, "explorer");
    expect(weakPriority).toBeGreaterThan(strongPriority);
  });

  it("returns value between 0 and 1", () => {
    expect(activationPriority(0.5, true, "bridge")).toBeLessThanOrEqual(1);
    expect(activationPriority(0, false, "dormant")).toBeGreaterThanOrEqual(0);
  });
});

// ── CSV parsing & full pipeline ──────────────────────────────────────────

describe("parseLinkedInCSV", () => {
  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  };

  const makeRow = (first: string, last: string, company: string, position: string, connected: string): RawCSVRow => ({
    "First Name": first,
    "Last Name": last,
    "Company": company,
    "Position": position,
    "Connected On": connected,
  });

  it("parses connections with industry clusters", () => {
    const rows: RawCSVRow[] = [
      makeRow("Alice", "Smith", "Google", "Software Engineer", daysAgo(100)),
      makeRow("Bob", "Jones", "Goldman Sachs", "Analyst", daysAgo(200)),
    ];

    const connections = parseLinkedInCSV(rows);
    expect(connections).toHaveLength(2);
    expect(connections[0].industryCluster).toBe("Tech");
    expect(connections[1].industryCluster).toBe("Finance");
  });

  it("assigns bridge status based on cluster frequency", () => {
    // Create network where Tech dominates and Healthcare has only 1
    const rows: RawCSVRow[] = [
      makeRow("A", "1", "Google", "Engineer", daysAgo(100)),
      makeRow("B", "2", "Microsoft", "Developer", daysAgo(100)),
      makeRow("C", "3", "Apple", "Engineer", daysAgo(100)),
      makeRow("D", "4", "Meta", "Engineer", daysAgo(100)),
      makeRow("E", "5", "City Hospital", "Medical Director", daysAgo(100)),
    ];

    const connections = parseLinkedInCSV(rows);
    const hospital = connections.find(c => c.company === "City Hospital");
    expect(hospital?.isBridge).toBe(true);
    expect(hospital?.industryCluster).toBe("Healthcare");

    // Tech connections should NOT be bridges (4 in cluster)
    const google = connections.find(c => c.company === "Google");
    expect(google?.isBridge).toBe(false);
  });

  it("assigns confidence levels correctly", () => {
    const rows: RawCSVRow[] = [
      makeRow("Recent", "Person", "Google", "Engineer", daysAgo(100)),  // < 730 days
      makeRow("Old", "Person", "Google", "Engineer", daysAgo(800)),    // > 730 days
    ];

    const connections = parseLinkedInCSV(rows);
    const recent = connections.find(c => c.firstName === "Recent");
    const old = connections.find(c => c.firstName === "Old");
    expect(recent?.confidenceLevel).toBe("high");
    expect(old?.confidenceLevel).toBe("low");
  });

  it("assigns network positions", () => {
    const rows: RawCSVRow[] = [
      // Bridge: Healthcare with only 1 connection
      makeRow("Bridge", "Person", "City Hospital", "Doctor", daysAgo(100)),
      // Anchor: Tech (dominant) + old connection
      makeRow("Anchor", "Person", "Google", "Engineer", daysAgo(400)),
      makeRow("Anchor2", "Person", "Microsoft", "Developer", daysAgo(500)),
      makeRow("Anchor3", "Person", "Apple", "Engineer", daysAgo(400)),
      makeRow("Anchor4", "Person", "Meta", "Engineer", daysAgo(400)),
    ];

    const connections = parseLinkedInCSV(rows);
    const bridge = connections.find(c => c.firstName === "Bridge");
    expect(bridge?.networkPosition).toBe("bridge");

    const anchor = connections.find(c => c.firstName === "Anchor");
    expect(anchor?.networkPosition).toBe("anchor");
  });

  it("filters out rows without names", () => {
    const rows: RawCSVRow[] = [
      makeRow("", "", "Google", "Engineer", daysAgo(100)),
      makeRow("Valid", "Person", "Google", "Engineer", daysAgo(100)),
    ];
    expect(parseLinkedInCSV(rows)).toHaveLength(1);
  });
});

// ── Gap analysis ─────────────────────────────────────────────────────────

describe("analyzeGaps", () => {
  const makeConnection = (
    overrides: Partial<Connection>
  ): Connection => ({
    id: "test",
    name: "Test Person",
    firstName: "Test",
    lastName: "Person",
    company: "Test Co",
    position: "Tester",
    connectedOn: "2024-01-01",
    tieStrength: 0.5,
    tieCategory: "moderate",
    roleCategory: "Other",
    daysSinceConnected: 365,
    industryCluster: "Tech",
    isBridge: false,
    networkPosition: "anchor",
    confidenceLevel: "high",
    activationPriority: 0.5,
    ...overrides,
  });

  it("returns empty analysis for no connections", () => {
    const analysis = analyzeGaps([]);
    expect(analysis.totalConnections).toBe(0);
    expect(analysis.insights).toHaveLength(0);
    expect(analysis.interpretation).toBe("No connections loaded.");
  });

  it("produces correct insight types", () => {
    const connections = [
      makeConnection({ id: "1", industryCluster: "Tech" }),
      makeConnection({ id: "2", industryCluster: "Tech" }),
      makeConnection({ id: "3", industryCluster: "Finance" }),
    ];

    const analysis = analyzeGaps(connections);
    const insightTypes = analysis.insights.map(i => i.type);
    expect(insightTypes).toContain("cluster_concentration");
    expect(insightTypes).toContain("bridge_count");
    expect(insightTypes).toContain("diversity_score");
    expect(insightTypes).toContain("confidence_note");
  });

  it("computes cluster concentration correctly", () => {
    const connections = [
      makeConnection({ id: "1", industryCluster: "Tech" }),
      makeConnection({ id: "2", industryCluster: "Tech" }),
      makeConnection({ id: "3", industryCluster: "Tech" }),
      makeConnection({ id: "4", industryCluster: "Finance" }),
    ];

    const analysis = analyzeGaps(connections);
    const concInsight = analysis.insights.find(i => i.type === "cluster_concentration");
    expect(concInsight?.value).toBe("75%");
  });

  it("computes bridge count correctly", () => {
    const connections = [
      makeConnection({ id: "1", isBridge: true }),
      makeConnection({ id: "2", isBridge: true }),
      makeConnection({ id: "3", isBridge: false }),
    ];

    const analysis = analyzeGaps(connections);
    const bridgeInsight = analysis.insights.find(i => i.type === "bridge_count");
    expect(bridgeInsight?.value).toBe(2);
  });

  it("computes diversity score correctly", () => {
    // 4 Tech, 3 Finance = top 2. 2 Healthcare + 1 Legal = outside top 2 = 3/10 = 30%
    const connections = [
      ...Array(4).fill(null).map((_, i) => makeConnection({ id: `t${i}`, industryCluster: "Tech" })),
      ...Array(3).fill(null).map((_, i) => makeConnection({ id: `f${i}`, industryCluster: "Finance" })),
      ...Array(2).fill(null).map((_, i) => makeConnection({ id: `h${i}`, industryCluster: "Healthcare" })),
      makeConnection({ id: "l1", industryCluster: "Legal" }),
    ];

    const analysis = analyzeGaps(connections);
    const divInsight = analysis.insights.find(i => i.type === "diversity_score");
    expect(divInsight?.value).toBe("30%");
  });

  it("includes data source transparency in every insight", () => {
    const connections = [
      makeConnection({ id: "1" }),
      makeConnection({ id: "2" }),
    ];
    const analysis = analyzeGaps(connections);
    for (const insight of analysis.insights) {
      expect(insight.dataSource).toBeTruthy();
      expect(insight.dataSource.length).toBeGreaterThan(10);
    }
  });

  it("keeps topActivationTargets sorted by priority", () => {
    const connections = [
      makeConnection({ id: "1", activationPriority: 0.3 }),
      makeConnection({ id: "2", activationPriority: 0.9 }),
      makeConnection({ id: "3", activationPriority: 0.6 }),
    ];

    const analysis = analyzeGaps(connections);
    expect(analysis.topActivationTargets[0].activationPriority).toBe(0.9);
    expect(analysis.topActivationTargets[1].activationPriority).toBe(0.6);
    expect(analysis.topActivationTargets[2].activationPriority).toBe(0.3);
  });

  it("computes bridging and bonding capital scores", () => {
    const connections = [
      makeConnection({ id: "1", industryCluster: "Tech" }),
      makeConnection({ id: "2", industryCluster: "Tech" }),
      makeConnection({ id: "3", industryCluster: "Finance" }),
      makeConnection({ id: "4", industryCluster: "Healthcare" }),
    ];

    const analysis = analyzeGaps(connections);
    // Dominant = Tech (2/4). Bridging = non-Tech = 2/4 = 0.5
    expect(analysis.bridgingCapitalScore).toBe(0.5);
    expect(analysis.bondingCapitalScore).toBe(0.5);
  });

  it("includes cluster distribution", () => {
    const connections = [
      makeConnection({ id: "1", industryCluster: "Tech" }),
      makeConnection({ id: "2", industryCluster: "Finance" }),
    ];

    const analysis = analyzeGaps(connections);
    expect(analysis.clusterDistribution.length).toBeGreaterThan(0);
    expect(analysis.clusterDistribution[0]).toHaveProperty("cluster");
    expect(analysis.clusterDistribution[0]).toHaveProperty("count");
    expect(analysis.clusterDistribution[0]).toHaveProperty("percentage");
  });
});

// ── buildGraphData ───────────────────────────────────────────────────────

describe("buildGraphData", () => {
  it("includes self node plus all connections", () => {
    const connections: Connection[] = [
      {
        id: "conn-0", name: "Test", firstName: "Test", lastName: "User",
        company: "Google", position: "Engineer", connectedOn: "2024-01-01",
        tieStrength: 0.5, tieCategory: "moderate", roleCategory: "Engineers/Devs",
        daysSinceConnected: 365, industryCluster: "Tech", isBridge: false,
        networkPosition: "anchor", confidenceLevel: "high", activationPriority: 0.5,
      },
    ];

    const graph = buildGraphData(connections);
    expect(graph.nodes).toHaveLength(2); // self + 1
    expect(graph.nodes[0].id).toBe("self");
    expect(graph.nodes[1].industryCluster).toBe("Tech");
    expect(graph.links).toHaveLength(1);
  });
});

// ── Role classification (kept for display) ───────────────────────────────

describe("classifyRole", () => {
  it("classifies engineering roles", () => {
    expect(classifyRole("Software Engineer")).toBe("Engineers/Devs");
    expect(classifyRole("Backend Developer")).toBe("Engineers/Devs");
  });

  it("classifies founders", () => {
    expect(classifyRole("CEO")).toBe("Founders/CEOs");
    expect(classifyRole("Co-founder")).toBe("Founders/CEOs");
  });

  it("returns Other for empty or unrecognized", () => {
    expect(classifyRole("")).toBe("Other");
    expect(classifyRole("Chief Happiness Officer")).toBe("Other");
  });
});
