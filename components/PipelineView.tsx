"use client";

import { useMemo } from "react";
import { PIPELINE_STAGES } from "@/lib/pipelineStages";
import { STATUS_CONFIG } from "@/lib/statusConfig";
import type { Connection } from "@/lib/tieStrength";
import type { ConnectionStatus } from "@/lib/types";

export interface PipelineViewProps {
  connections: Connection[];
  onSelectContact: (id: string) => void;
  onStatusChange: (id: string, status: ConnectionStatus) => void;
}

const TIE_COLORS: Record<string, string> = {
  strong: "var(--strong)",
  moderate: "var(--moderate)",
  weak: "var(--weak)",
  dormant: "var(--dormant)",
};

export default function PipelineView({
  connections,
  onSelectContact,
  onStatusChange,
}: PipelineViewProps) {
  // Group connections by pipeline status, excluding archived
  const columns = useMemo(() => {
    const grouped = new Map<ConnectionStatus, Connection[]>();

    // Initialize all pipeline stages with empty arrays
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
        // If status is not a pipeline stage (e.g. unknown), default to "new"
        grouped.get("new")!.push(conn);
      }
    }

    return PIPELINE_STAGES.map((stage) => ({
      stage,
      config: STATUS_CONFIG[stage],
      connections: grouped.get(stage) || [],
    }));
  }, [connections]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Pipeline
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Track contacts through your outreach stages
        </p>
      </div>

      {/* Kanban board - horizontal scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4">
        <div className="flex gap-3 h-full min-w-min">
          {columns.map(({ stage, config, connections: stageConnections }) => (
            <div
              key={stage}
              className="flex flex-col min-w-[220px] w-[220px] flex-shrink-0 bg-[var(--bg-panel)] rounded-lg border border-[var(--border)]"
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: config.text }}
                  />
                  <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                    {config.label}
                  </span>
                </div>
                <span
                  className="text-[10px] font-medium rounded-full min-w-[20px] px-1.5 py-0.5 text-center"
                  style={{
                    backgroundColor: config.bg,
                    color: config.text,
                  }}
                >
                  {stageConnections.length}
                </span>
              </div>

              {/* Cards container */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {stageConnections.length === 0 ? (
                  <p className="text-[11px] text-[var(--text-muted)] text-center py-6">
                    No contacts
                  </p>
                ) : (
                  stageConnections.map((conn) => (
                    <PipelineCard
                      key={conn.id}
                      connection={conn}
                      onClick={() => onSelectContact(conn.id)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----- Card subcomponent ----- */

function PipelineCard({
  connection,
  onClick,
}: {
  connection: Connection;
  onClick: () => void;
}) {
  const tieColor = TIE_COLORS[connection.tieCategory] || TIE_COLORS.dormant;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-[var(--bg)] border border-[var(--border)] rounded-md shadow-sm px-3 py-2.5 hover:border-[var(--border-hi)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
    >
      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
        {connection.name}
      </p>
      {connection.company && (
        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
          {connection.company}
        </p>
      )}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: tieColor }}
        />
        <span
          className="text-[10px] font-medium"
          style={{ color: tieColor }}
        >
          {connection.tieStrength.toFixed(2)} {connection.tieCategory}
        </span>
      </div>
    </button>
  );
}
