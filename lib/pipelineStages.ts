/**
 * Pipeline stage definitions and logic.
 * Extracted from PipelineBar component for testability.
 */
import type { ConnectionStatus } from "./types";

/**
 * Pipeline stages in order. "archived" is excluded -- it's a separate action,
 * not a pipeline progression stage.
 */
export const PIPELINE_STAGES: ConnectionStatus[] = [
  "new",
  "researching",
  "drafted",
  "sent",
  "replied",
  "meeting_scheduled",
  "converted",
];

export type StageState = "completed" | "current" | "upcoming";

export function getStageState(
  stage: ConnectionStatus,
  currentStatus: ConnectionStatus
): StageState {
  const currentIdx = PIPELINE_STAGES.indexOf(currentStatus);
  const stageIdx = PIPELINE_STAGES.indexOf(stage);

  // If current status is archived or not in pipeline, treat as "new"
  if (currentIdx === -1) {
    return stageIdx === 0 ? "current" : "upcoming";
  }

  if (stageIdx < currentIdx) return "completed";
  if (stageIdx === currentIdx) return "current";
  return "upcoming";
}

export function getNextStage(currentStatus: ConnectionStatus): ConnectionStatus | null {
  const currentIdx = PIPELINE_STAGES.indexOf(currentStatus);
  if (currentIdx === -1) return PIPELINE_STAGES[1]; // If archived/unknown, suggest "researching"
  if (currentIdx >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[currentIdx + 1];
}
