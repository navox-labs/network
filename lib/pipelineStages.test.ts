import { describe, it, expect } from "vitest";
import { PIPELINE_STAGES, getStageState, getNextStage } from "./pipelineStages";
import type { ConnectionStatus } from "./types";

describe("PIPELINE_STAGES", () => {
  it("contains 7 stages (excludes archived)", () => {
    expect(PIPELINE_STAGES).toHaveLength(7);
  });

  it("does not include archived", () => {
    expect(PIPELINE_STAGES).not.toContain("archived");
  });

  it("is in the correct order", () => {
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

describe("getStageState", () => {
  it("marks earlier stages as completed", () => {
    expect(getStageState("new", "drafted")).toBe("completed");
    expect(getStageState("researching", "drafted")).toBe("completed");
  });

  it("marks the current stage as current", () => {
    expect(getStageState("drafted", "drafted")).toBe("current");
    expect(getStageState("new", "new")).toBe("current");
    expect(getStageState("converted", "converted")).toBe("current");
  });

  it("marks later stages as upcoming", () => {
    expect(getStageState("sent", "drafted")).toBe("upcoming");
    expect(getStageState("converted", "new")).toBe("upcoming");
  });

  it("treats archived status as if at 'new'", () => {
    expect(getStageState("new", "archived" as ConnectionStatus)).toBe("current");
    expect(getStageState("researching", "archived" as ConnectionStatus)).toBe("upcoming");
  });

  it("handles every pipeline stage as current", () => {
    for (const stage of PIPELINE_STAGES) {
      expect(getStageState(stage, stage)).toBe("current");
    }
  });

  it("all stages before current are completed", () => {
    const currentIdx = PIPELINE_STAGES.indexOf("replied");
    for (let i = 0; i < currentIdx; i++) {
      expect(getStageState(PIPELINE_STAGES[i], "replied")).toBe("completed");
    }
  });

  it("all stages after current are upcoming", () => {
    const currentIdx = PIPELINE_STAGES.indexOf("replied");
    for (let i = currentIdx + 1; i < PIPELINE_STAGES.length; i++) {
      expect(getStageState(PIPELINE_STAGES[i], "replied")).toBe("upcoming");
    }
  });
});

describe("getNextStage", () => {
  it("returns researching when current is new", () => {
    expect(getNextStage("new")).toBe("researching");
  });

  it("returns drafted when current is researching", () => {
    expect(getNextStage("researching")).toBe("drafted");
  });

  it("returns sent when current is drafted", () => {
    expect(getNextStage("drafted")).toBe("sent");
  });

  it("returns replied when current is sent", () => {
    expect(getNextStage("sent")).toBe("replied");
  });

  it("returns meeting_scheduled when current is replied", () => {
    expect(getNextStage("replied")).toBe("meeting_scheduled");
  });

  it("returns converted when current is meeting_scheduled", () => {
    expect(getNextStage("meeting_scheduled")).toBe("converted");
  });

  it("returns null when at the last stage (converted)", () => {
    expect(getNextStage("converted")).toBeNull();
  });

  it("returns researching when current is archived (not in pipeline)", () => {
    expect(getNextStage("archived")).toBe("researching");
  });
});
