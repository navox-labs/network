"use client";

import type { ConnectionStatus } from "@/lib/types";
import { STATUS_CONFIG } from "@/lib/statusConfig";
import { PIPELINE_STAGES, getStageState, getNextStage } from "@/lib/pipelineStages";

interface PipelineBarProps {
  currentStatus: ConnectionStatus;
  onStatusChange: (status: ConnectionStatus) => void;
}

export default function PipelineBar({ currentStatus, onStatusChange }: PipelineBarProps) {
  const nextStage = getNextStage(currentStatus);

  return (
    <div data-testid="pipeline-bar">
      {/* Chevron stages */}
      <div className="flex w-full">
        {PIPELINE_STAGES.map((stage, i) => {
          const state = getStageState(stage, currentStatus);
          const config = STATUS_CONFIG[stage];
          const isFirst = i === 0;
          const isLast = i === PIPELINE_STAGES.length - 1;

          let bgClass = "bg-[rgba(255,255,255,0.04)]";
          let textClass = "text-[var(--text-muted)]";
          let fontClass = "font-normal";

          if (state === "completed") {
            bgClass = "bg-[rgba(34,197,94,0.15)]";
            textClass = "text-[#4ade80]";
          } else if (state === "current") {
            bgClass = "";
            textClass = "";
            fontClass = "font-bold";
          }

          return (
            <button
              key={stage}
              onClick={() => onStatusChange(stage)}
              className={`
                relative flex-1 flex items-center justify-center py-2 px-1
                text-[11px] font-mono tracking-wide cursor-pointer
                border-none transition-colors
                ${bgClass} ${textClass} ${fontClass}
                ${isFirst ? "rounded-l-md" : ""}
                ${isLast ? "rounded-r-md" : ""}
                hover:brightness-125
              `}
              style={
                state === "current"
                  ? { background: config.bg, color: config.text }
                  : undefined
              }
              data-testid={`pipeline-stage-${stage}`}
              title={config.label}
            >
              {/* Chevron separator */}
              {i > 0 && (
                <span className="absolute left-0 top-0 bottom-0 w-px bg-[var(--border)]" />
              )}
              <span className="truncate text-[10px] sm:text-[11px]">
                {config.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* "Mark as next stage" button */}
      {nextStage && (
        <div className="mt-2">
          <button
            onClick={() => onStatusChange(nextStage)}
            className="text-xs font-mono text-[var(--accent)] hover:underline cursor-pointer bg-transparent border-none px-0"
            data-testid="pipeline-next-action"
          >
            Mark as {STATUS_CONFIG[nextStage].label}
          </button>
        </div>
      )}
    </div>
  );
}

export type { PipelineBarProps };
