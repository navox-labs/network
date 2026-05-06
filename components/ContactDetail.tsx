"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Mail,
  FileText,
  Sparkles,
  Activity,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { Connection } from "@/lib/tieStrength";
import type { ConnectionStatus, OutreachVoice } from "@/lib/types";
import StatusPill from "./StatusPill";
import NotesPanel from "./NotesPanel";
import VoiceSampleInput from "./VoiceSampleInput";
import PipelineBar from "./PipelineBar";

interface ContactDetailProps {
  connection: Connection;
  onBack: () => void;
  onStatusChange: (id: string, status: ConnectionStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
  onVoiceChange: (id: string, voice: OutreachVoice) => void;
  onDraftMessage: (connection: Connection) => void;
  draftMessage?: string;
  isDrafting: boolean;
  onOpenSettings: () => void;
}

type TabId = "details" | "notes" | "ai-draft" | "activity";

const TABS: { id: TabId; label: string; icon: typeof FileText }[] = [
  { id: "details", label: "Details", icon: FileText },
  { id: "notes", label: "Notes", icon: Mail },
  { id: "ai-draft", label: "AI Draft", icon: Sparkles },
  { id: "activity", label: "Activity", icon: Activity },
];

/* ---------- Tie category badge colors ---------- */
const TIE_COLORS: Record<string, { bg: string; text: string }> = {
  strong:   { bg: "rgba(22,163,107,0.15)", text: "var(--strong)" },
  moderate: { bg: "rgba(217,150,10,0.15)",  text: "var(--moderate)" },
  weak:     { bg: "rgba(99,102,241,0.15)",  text: "var(--weak)" },
  dormant:  { bg: "rgba(156,163,175,0.15)", text: "var(--dormant)" },
};

/* ---------- Network position colors ---------- */
const POSITION_COLORS: Record<string, { bg: string; text: string }> = {
  core:       { bg: "rgba(22,163,107,0.15)", text: "#4ade80" },
  bridge:     { bg: "rgba(168,85,247,0.15)", text: "#c084fc" },
  peripheral: { bg: "rgba(234,179,8,0.15)",  text: "#facc15" },
  satellite:  { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
};

/* ---------- Confidence level colors ---------- */
const CONFIDENCE_COLORS: Record<string, { bg: string; text: string }> = {
  high:     { bg: "rgba(34,197,94,0.15)",  text: "#4ade80" },
  medium:   { bg: "rgba(234,179,8,0.15)",  text: "#facc15" },
  low:      { bg: "rgba(249,115,22,0.15)", text: "#fb923c" },
  very_low: { bg: "rgba(239,68,68,0.15)",  text: "#f87171" },
};

/* ---------- Helper: format source ---------- */
function formatSource(source?: string): string {
  if (!source) return "Unknown";
  return source
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ---------- Helper: format date ---------- */
function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/* ---------- Badge sub-component ---------- */
function Badge({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium font-mono whitespace-nowrap"
      style={{ background: bg, color: text }}
    >
      {label}
    </span>
  );
}

/* ---------- Detail row sub-component ---------- */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2.5 border-b border-[var(--border)]">
      <span className="text-[11px] font-mono uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      <div className="text-sm text-[var(--text-primary)]">{children}</div>
    </div>
  );
}

/* ========== Main component ========== */
export default function ContactDetail({
  connection,
  onBack,
  onStatusChange,
  onNotesChange,
  onVoiceChange,
  onDraftMessage,
  draftMessage,
  isDrafting,
  onOpenSettings,
}: ContactDetailProps) {
  const [activeTabId, setActiveTabId] = useState<TabId>("details");

  const tieColor = TIE_COLORS[connection.tieCategory] || TIE_COLORS.dormant;
  const posColor = POSITION_COLORS[connection.networkPosition] || POSITION_COLORS.satellite;
  const confColor = CONFIDENCE_COLORS[connection.confidenceLevel] || CONFIDENCE_COLORS.low;

  const subtitle = [connection.position, connection.company, connection.email]
    .filter(Boolean)
    .join(" \u00B7 ");

  return (
    <div className="h-full overflow-y-auto" data-testid="contact-detail">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        {/* ---- Back button ---- */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer mb-4 px-0 transition-colors"
          data-testid="contact-back-button"
        >
          <ArrowLeft size={16} />
          Back to List
        </button>

        {/* ---- Header ---- */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-[var(--text-primary)] truncate">
              {connection.name}
            </h1>
            {subtitle && (
              <p className="text-sm text-[var(--text-secondary)] mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusPill
              status={connection.status}
              onChange={(s) => onStatusChange(connection.id, s)}
            />
            <button
              onClick={() => onDraftMessage(connection)}
              disabled={isDrafting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono bg-[var(--accent)] text-white border-none cursor-pointer hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="contact-draft-btn"
            >
              <Sparkles size={13} />
              Draft Message
            </button>
            {connection.url && (
              <a
                href={connection.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-mono text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-hi)] transition-colors"
                data-testid="contact-linkedin-link"
              >
                <ExternalLink size={13} />
                Profile
              </a>
            )}
          </div>
        </div>

        {/* ---- Pipeline bar ---- */}
        <div className="mb-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3">
          <PipelineBar
            currentStatus={connection.status || "new"}
            onStatusChange={(s) => onStatusChange(connection.id, s)}
          />
        </div>

        {/* ---- Tabs ---- */}
        <div className="flex border-b border-[var(--border)] mb-4 gap-0 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono border-none bg-transparent cursor-pointer whitespace-nowrap transition-colors
                  ${
                    isActive
                      ? "text-[var(--accent)] border-b-2 border-b-[var(--accent)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }
                `}
                style={isActive ? { borderBottomWidth: "2px", borderBottomStyle: "solid", borderBottomColor: "var(--accent)", marginBottom: "-1px" } : undefined}
                data-testid={`tab-${tab.id}`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ---- Tab content ---- */}
        <div className="min-h-[300px]">
          {/* Details tab */}
          {activeTabId === "details" && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-x-8"
              data-testid="tab-content-details"
            >
              {/* Tie Strength */}
              <DetailRow label="Tie Strength">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">
                    {(connection.tieStrength * 100).toFixed(0)}%
                  </span>
                  <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden max-w-[120px]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${connection.tieStrength * 100}%`,
                        background: tieColor.text,
                      }}
                    />
                  </div>
                  <Badge
                    label={connection.tieCategory}
                    bg={tieColor.bg}
                    text={tieColor.text}
                  />
                </div>
              </DetailRow>

              {/* Network Position */}
              <DetailRow label="Network Position">
                <Badge
                  label={connection.networkPosition}
                  bg={posColor.bg}
                  text={posColor.text}
                />
              </DetailRow>

              {/* Industry Cluster */}
              <DetailRow label="Industry Cluster">
                <span className="font-mono text-sm">{connection.industryCluster}</span>
              </DetailRow>

              {/* Confidence Level */}
              <DetailRow label="Confidence Level">
                <Badge
                  label={connection.confidenceLevel.replace("_", " ")}
                  bg={confColor.bg}
                  text={confColor.text}
                />
              </DetailRow>

              {/* Source */}
              <DetailRow label="Source">
                <span className="font-mono text-sm">
                  {connection.sources
                    ? connection.sources.map(formatSource).join(", ")
                    : formatSource(connection.source)}
                </span>
              </DetailRow>

              {/* Connected Date */}
              <DetailRow label="Connected Date">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {formatDate(connection.connectedOn)}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    ({connection.daysSinceConnected}d ago)
                  </span>
                </div>
              </DetailRow>

              {/* Bridge Status */}
              <DetailRow label="Bridge Status">
                {connection.isBridge ? (
                  <Badge label="Bridge" bg="rgba(168,85,247,0.15)" text="#c084fc" />
                ) : (
                  <span className="text-[var(--text-muted)] text-sm">No</span>
                )}
              </DetailRow>

              {/* Activation Priority */}
              <DetailRow label="Activation Priority">
                <span className="font-mono text-sm">
                  {(connection.activationPriority * 100).toFixed(0)}%
                </span>
              </DetailRow>

              {/* Enrichment signals (if available) */}
              {connection.messageCount !== undefined && connection.messageCount > 0 && (
                <DetailRow label="Message Count">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{connection.messageCount}</span>
                    {connection.messageBidirectional && (
                      <Badge label="Bidirectional" bg="rgba(34,197,94,0.15)" text="#4ade80" />
                    )}
                  </div>
                </DetailRow>
              )}

              {connection.lastMessageDate && (
                <DetailRow label="Last Message">
                  <span className="font-mono text-sm">
                    {formatDate(connection.lastMessageDate)}
                  </span>
                </DetailRow>
              )}

              {(connection.endorsementReceived || connection.endorsementGiven) && (
                <DetailRow label="Endorsements">
                  <div className="flex items-center gap-2">
                    {connection.endorsementReceived && (
                      <Badge label="Received" bg="rgba(34,197,94,0.15)" text="#4ade80" />
                    )}
                    {connection.endorsementGiven && (
                      <Badge label="Given" bg="rgba(59,130,246,0.15)" text="#60a5fa" />
                    )}
                  </div>
                </DetailRow>
              )}

              {connection.recommendationReceived && (
                <DetailRow label="Recommendation">
                  <Badge label="Received" bg="rgba(34,197,94,0.15)" text="#4ade80" />
                </DetailRow>
              )}

              {connection.initiatedBy && (
                <DetailRow label="Connection Initiated By">
                  <span className="font-mono text-sm capitalize">
                    {connection.initiatedBy === "user" ? "You" : "Them"}
                  </span>
                </DetailRow>
              )}

              {connection.isLatentTie && (
                <DetailRow label="Latent Tie">
                  <Badge label="Latent Tie" bg="rgba(249,115,22,0.15)" text="#fb923c" />
                </DetailRow>
              )}
            </div>
          )}

          {/* Notes tab */}
          {activeTabId === "notes" && (
            <div data-testid="tab-content-notes" className="max-w-xl">
              <NotesPanel
                notes={connection.notes || ""}
                onChange={(notes) => onNotesChange(connection.id, notes)}
              />
            </div>
          )}

          {/* AI Draft tab */}
          {activeTabId === "ai-draft" && (
            <div data-testid="tab-content-ai-draft" className="space-y-4 max-w-xl">
              <VoiceSampleInput
                voice={connection.outreachVoice}
                onChange={(voice) => onVoiceChange(connection.id, voice)}
              />

              <button
                onClick={() => onDraftMessage(connection)}
                disabled={isDrafting}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono bg-[var(--accent)] text-white border-none cursor-pointer hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="generate-draft-btn"
              >
                {isDrafting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate Draft
                  </>
                )}
              </button>

              {/* Draft display */}
              {draftMessage ? (
                <div
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4"
                  data-testid="draft-message-display"
                >
                  <p className="text-[11px] font-mono uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    Generated Draft
                  </p>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                    {draftMessage}
                  </p>
                </div>
              ) : !isDrafting ? (
                <p className="text-sm text-[var(--text-muted)] font-mono">
                  No draft yet. Click &quot;Generate Draft&quot; to create a personalized message.
                </p>
              ) : null}
            </div>
          )}

          {/* Activity tab */}
          {activeTabId === "activity" && (
            <div data-testid="tab-content-activity" className="space-y-4">
              {/* Current status entry */}
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm text-[var(--text-primary)]">
                    Status:{" "}
                    <span className="font-semibold capitalize">
                      {(connection.status || "new").replace("_", " ")}
                    </span>
                  </p>
                  {connection.statusUpdatedAt && (
                    <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                      {formatDate(connection.statusUpdatedAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Connected date entry */}
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--text-muted)] mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm text-[var(--text-primary)]">Connected</p>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                    {formatDate(connection.connectedOn)}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)] font-mono mt-6 border-t border-[var(--border)] pt-4">
                Full activity tracking coming soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { ContactDetailProps, TabId };
