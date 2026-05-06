/**
 * List view filter predicates for the Contacts table.
 * Pure functions — no React dependencies.
 */
import type { Connection } from "./tieStrength";

export type ListViewId =
  | "all"
  | "weak_ties"
  | "bridges"
  | "new_uncontacted"
  | "in_progress"
  | "linkedin"
  | "gmail"
  | "latent";

export interface ListViewDef {
  id: ListViewId;
  label: string;
}

export const LIST_VIEW_DEFS: ListViewDef[] = [
  { id: "all", label: "All Contacts" },
  { id: "weak_ties", label: "Weak Ties" },
  { id: "bridges", label: "Bridge Connections" },
  { id: "new_uncontacted", label: "New (uncontacted)" },
  { id: "in_progress", label: "In Progress" },
  { id: "linkedin", label: "LinkedIn Imports" },
  { id: "gmail", label: "Gmail Imports" },
  { id: "latent", label: "Latent Ties" },
];

export function filterConnections(
  connections: Connection[],
  view: ListViewId
): Connection[] {
  switch (view) {
    case "all":
      return connections;
    case "weak_ties":
      return connections.filter((c) => c.tieCategory === "weak");
    case "bridges":
      return connections.filter((c) => c.isBridge);
    case "new_uncontacted":
      return connections.filter((c) => !c.status || c.status === "new");
    case "in_progress":
      return connections.filter(
        (c) =>
          c.status === "researching" ||
          c.status === "drafted" ||
          c.status === "sent"
      );
    case "linkedin":
      return connections.filter((c) => c.source === "linkedin_csv");
    case "gmail":
      return connections.filter((c) => c.source === "email_import");
    case "latent":
      return connections.filter((c) => c.isLatentTie);
  }
}

/**
 * Count connections per view. Single pass over the array.
 */
export function countByView(
  connections: Connection[]
): Record<ListViewId, number> {
  const map: Record<ListViewId, number> = {
    all: connections.length,
    weak_ties: 0,
    bridges: 0,
    new_uncontacted: 0,
    in_progress: 0,
    linkedin: 0,
    gmail: 0,
    latent: 0,
  };
  for (const c of connections) {
    if (c.tieCategory === "weak") map.weak_ties++;
    if (c.isBridge) map.bridges++;
    if (!c.status || c.status === "new") map.new_uncontacted++;
    if (
      c.status === "researching" ||
      c.status === "drafted" ||
      c.status === "sent"
    )
      map.in_progress++;
    if (c.source === "linkedin_csv") map.linkedin++;
    if (c.source === "email_import") map.gmail++;
    if (c.isLatentTie) map.latent++;
  }
  return map;
}
