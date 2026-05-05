/**
 * Set Logic — Navox Network V1
 *
 * Multi-source contact management: merging contacts from different sources
 * and identifying latent ties (people in source B not in source A).
 *
 * Matching strategy:
 *   1. Email (exact, case-insensitive) — strongest signal
 *   2. firstName + lastName + company (all case-insensitive) — fallback
 *
 * When a match is found, the existing contact keeps its data but gains:
 *   - The new source added to sources[]
 *   - The higher tie strength of the two
 *
 * Privacy: all processing is client-side. No data leaves the browser.
 */

import type { Connection } from "./tieStrength";
import type { DataSource } from "./types";

/**
 * Check if two contacts match by email (exact, case-insensitive).
 * Empty/missing emails never match.
 */
export function matchByEmail(a: Connection, b: Connection): boolean {
  if (!a.email || !b.email) return false;
  return a.email.toLowerCase().trim() === b.email.toLowerCase().trim();
}

/**
 * Check if two contacts match by firstName + lastName + company
 * (all case-insensitive, trimmed). All three must be non-empty and match.
 */
export function matchByNameAndCompany(a: Connection, b: Connection): boolean {
  const aFirst = (a.firstName || "").toLowerCase().trim();
  const bFirst = (b.firstName || "").toLowerCase().trim();
  const aLast = (a.lastName || "").toLowerCase().trim();
  const bLast = (b.lastName || "").toLowerCase().trim();
  const aCompany = (a.company || "").toLowerCase().trim();
  const bCompany = (b.company || "").toLowerCase().trim();

  if (!aFirst || !bFirst || !aLast || !bLast || !aCompany || !bCompany) {
    return false;
  }

  return aFirst === bFirst && aLast === bLast && aCompany === bCompany;
}

/**
 * Check if two contacts match by either email or name+company.
 */
export function contactsMatch(a: Connection, b: Connection): boolean {
  return matchByEmail(a, b) || matchByNameAndCompany(a, b);
}

/**
 * Merge contacts from multiple sources.
 *
 * For each incoming contact:
 *   - If a match is found in existing: add source to sources[], keep higher tie strength
 *   - If no match: add as new connection with source set
 *
 * Returns a new array (does not mutate inputs).
 */
export function mergeMultiSourceContacts(
  existing: Connection[],
  incoming: Connection[],
  incomingSource: DataSource
): Connection[] {
  // Clone existing connections to avoid mutation
  const merged = existing.map((c) => ({ ...c }));

  for (const inc of incoming) {
    const matchIdx = merged.findIndex((ex) => contactsMatch(ex, inc));

    if (matchIdx !== -1) {
      // Match found — merge sources and keep higher tie strength
      const ex = merged[matchIdx];
      const existingSources = ex.sources || [ex.source || "linkedin_csv"];
      if (!existingSources.includes(incomingSource)) {
        existingSources.push(incomingSource);
      }
      merged[matchIdx] = {
        ...ex,
        sources: existingSources,
        tieStrength: Math.max(ex.tieStrength, inc.tieStrength),
        // Backfill email if existing is missing it
        email: ex.email || inc.email,
      };
    } else {
      // No match — add as new connection
      merged.push({
        ...inc,
        source: incomingSource,
        sources: [incomingSource],
      });
    }
  }

  return merged;
}

/**
 * Find contacts in secondaryConnections that have no match in primaryConnections.
 * These are "latent ties" — people you interact with in one channel
 * but aren't connected to in another (e.g., email contacts not on LinkedIn).
 *
 * Returns copies of the unmatched secondary connections with isLatentTie = true.
 */
export function findLatentTies(
  primaryConnections: Connection[],
  secondaryConnections: Connection[]
): Connection[] {
  return secondaryConnections
    .filter((sec) => !primaryConnections.some((pri) => contactsMatch(pri, sec)))
    .map((c) => ({
      ...c,
      isLatentTie: true,
    }));
}
