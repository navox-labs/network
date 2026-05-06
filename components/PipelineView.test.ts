/**
 * PipelineView logic tests.
 *
 * Tests the grouping logic, filtering, and data transformations used by PipelineView.
 * DOM rendering tests would require @testing-library/react (not in deps).
 */
import { describe, it, expect } from "vitest";
import { PIPELINE_STAGES } from "@/lib/pipelineStages";
import { STATUS_CONFIG } from "@/lib/statusConfig";
import type { ConnectionStatus } from "@/lib/types";

/* ---- Replicate the grouping logic from PipelineView for testing ---- */

interface MockConnection {
  id: string;
  name: string;
  company: string;
  tieStrength: number;
  tieCategory: "strong" | "moderate" | "weak" | "dormant";
  status?: ConnectionStatus;
}

function groupByStage(connections: MockConnection[]) {
  const grouped = new Map<ConnectionStatus, MockConnection[]>();

  for (const stage of PIPELINE_STAGES) {
    grouped.set(stage, []);
  }

  for (const conn of connections) {
    if (conn.status === "archived") continue;
    const status: ConnectionStatus = conn.status || "new";
    const bucket = grouped.get(status);
    if (bucket) {
      bucket.push(conn);
    } else {
      grouped.get("new")!.push(conn);
    }
  }

  return PIPELINE_STAGES.map((stage) => ({
    stage,
    connections: grouped.get(stage) || [],
  }));
}

const TIE_COLORS: Record<string, string> = {
  strong: "var(--strong)",
  moderate: "var(--moderate)",
  weak: "var(--weak)",
  dormant: "var(--dormant)",
};

/* ---- Fixtures ---- */

function makeConnection(overrides: Partial<MockConnection> = {}): MockConnection {
  return {
    id: overrides.id || "test-1",
    name: overrides.name || "Alice Smith",
    company: overrides.company || "Acme Corp",
    tieStrength: overrides.tieStrength ?? 0.72,
    tieCategory: overrides.tieCategory || "strong",
    status: overrides.status,
  };
}

/* ---- Tests ---- */

describe("PipelineView grouping logic", () => {
  it("creates columns for all 7 pipeline stages", () => {
    const columns = groupByStage([]);
    expect(columns).toHaveLength(7);
    expect(columns.map((c) => c.stage)).toEqual(PIPELINE_STAGES);
  });

  it("defaults connections without status to 'new'", () => {
    const conns = [
      makeConnection({ id: "1", status: undefined }),
      makeConnection({ id: "2", status: undefined }),
    ];
    const columns = groupByStage(conns);
    const newCol = columns.find((c) => c.stage === "new")!;
    expect(newCol.connections).toHaveLength(2);
  });

  it("places connections in the correct stage column", () => {
    const conns = [
      makeConnection({ id: "1", status: "new" }),
      makeConnection({ id: "2", status: "drafted" }),
      makeConnection({ id: "3", status: "drafted" }),
      makeConnection({ id: "4", status: "converted" }),
    ];
    const columns = groupByStage(conns);

    expect(columns.find((c) => c.stage === "new")!.connections).toHaveLength(1);
    expect(columns.find((c) => c.stage === "drafted")!.connections).toHaveLength(2);
    expect(columns.find((c) => c.stage === "converted")!.connections).toHaveLength(1);
    expect(columns.find((c) => c.stage === "researching")!.connections).toHaveLength(0);
  });

  it("excludes archived connections from all columns", () => {
    const conns = [
      makeConnection({ id: "1", status: "archived" }),
      makeConnection({ id: "2", status: "new" }),
      makeConnection({ id: "3", status: "archived" }),
    ];
    const columns = groupByStage(conns);
    const totalCards = columns.reduce((sum, col) => sum + col.connections.length, 0);
    expect(totalCards).toBe(1);
  });

  it("handles all connections being archived", () => {
    const conns = [
      makeConnection({ id: "1", status: "archived" }),
      makeConnection({ id: "2", status: "archived" }),
    ];
    const columns = groupByStage(conns);
    const totalCards = columns.reduce((sum, col) => sum + col.connections.length, 0);
    expect(totalCards).toBe(0);
  });

  it("handles empty connections array", () => {
    const columns = groupByStage([]);
    expect(columns).toHaveLength(7);
    for (const col of columns) {
      expect(col.connections).toHaveLength(0);
    }
  });

  it("distributes connections across all stages correctly", () => {
    const conns = PIPELINE_STAGES.map((stage, i) =>
      makeConnection({ id: `conn-${i}`, status: stage })
    );
    const columns = groupByStage(conns);
    for (const col of columns) {
      expect(col.connections).toHaveLength(1);
    }
  });
});

describe("Pipeline stage configuration", () => {
  it("every pipeline stage has a STATUS_CONFIG entry", () => {
    for (const stage of PIPELINE_STAGES) {
      const config = STATUS_CONFIG[stage];
      expect(config).toBeDefined();
      expect(config.label).toBeTruthy();
      expect(config.bg).toBeTruthy();
      expect(config.text).toBeTruthy();
    }
  });

  it("archived is NOT in PIPELINE_STAGES", () => {
    expect(PIPELINE_STAGES).not.toContain("archived");
  });

  it("PIPELINE_STAGES has exactly 7 stages", () => {
    expect(PIPELINE_STAGES).toHaveLength(7);
  });

  it("stages are in the correct progression order", () => {
    expect(PIPELINE_STAGES).toEqual([
      "new",
      "researching",
      "drafted",
      "sent",
      "replied",
      "meeting_scheduled",
      "converted",
    ]);
  });
});

describe("Tie category color mapping", () => {
  it("all 4 tie categories have color entries", () => {
    const categories = ["strong", "moderate", "weak", "dormant"];
    for (const cat of categories) {
      expect(TIE_COLORS[cat]).toBeDefined();
      expect(TIE_COLORS[cat]).toContain("var(--");
    }
  });

  it("each category maps to its correct CSS variable", () => {
    expect(TIE_COLORS.strong).toBe("var(--strong)");
    expect(TIE_COLORS.moderate).toBe("var(--moderate)");
    expect(TIE_COLORS.weak).toBe("var(--weak)");
    expect(TIE_COLORS.dormant).toBe("var(--dormant)");
  });
});

describe("Card data display logic", () => {
  it("tie strength is formatted to 2 decimal places", () => {
    const conn = makeConnection({ tieStrength: 0.7234 });
    expect(conn.tieStrength.toFixed(2)).toBe("0.72");
  });

  it("tie strength of 1.0 formats correctly", () => {
    const conn = makeConnection({ tieStrength: 1.0 });
    expect(conn.tieStrength.toFixed(2)).toBe("1.00");
  });

  it("tie strength of 0 formats correctly", () => {
    const conn = makeConnection({ tieStrength: 0 });
    expect(conn.tieStrength.toFixed(2)).toBe("0.00");
  });
});
