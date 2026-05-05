/**
 * Status pill configuration — shared between StatusPill component and tests.
 */
import type { ConnectionStatus } from "./types";

export interface StatusStyle {
  label: string;
  bg: string;
  text: string;
}

export const STATUS_CONFIG: Record<ConnectionStatus, StatusStyle> = {
  new:                { label: "New",               bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
  researching:        { label: "Researching",       bg: "rgba(59,130,246,0.15)",  text: "#60a5fa" },
  drafted:            { label: "Drafted",           bg: "rgba(234,179,8,0.15)",   text: "#facc15" },
  sent:               { label: "Sent",              bg: "rgba(249,115,22,0.15)",  text: "#fb923c" },
  replied:            { label: "Replied",           bg: "rgba(34,197,94,0.15)",   text: "#4ade80" },
  meeting_scheduled:  { label: "Meeting",           bg: "rgba(168,85,247,0.15)",  text: "#c084fc" },
  converted:          { label: "Converted",         bg: "rgba(16,185,129,0.15)",  text: "#34d399" },
  archived:           { label: "Archived",          bg: "rgba(107,114,128,0.10)", text: "#6b7280" },
};

export const ALL_STATUSES: ConnectionStatus[] = [
  "new", "researching", "drafted", "sent", "replied",
  "meeting_scheduled", "converted", "archived",
];

export const NOTES_MAX_CHARS = 2000;
