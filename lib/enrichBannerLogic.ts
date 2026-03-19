/**
 * EnrichBanner Logic — Pure functions for banner visibility and file tracking.
 * Extracted from EnrichBanner.tsx so they can be tested without JSX parsing.
 */

import type { EnrichmentSummary } from "./enrichment";

export const ENRICHMENT_FILES = [
  { key: "messages.csv", label: "Messages" },
  { key: "endorsements_received_info.csv", label: "Endorsements" },
  { key: "recommendations_received.csv", label: "Recommendations" },
  { key: "invitations.csv", label: "Invitations" },
] as const;

export const DISMISS_KEY = "navox-enrich-banner-dismissed";

/**
 * Determine which enrichment files are missing given the current summary.
 * Returns the list of missing file keys.
 */
export function getMissingEnrichmentFiles(
  enrichmentSummary: EnrichmentSummary | null
): string[] {
  const loaded = new Set(
    (enrichmentSummary?.filesLoaded ?? []).map((f) => f.toLowerCase())
  );
  return ENRICHMENT_FILES
    .filter((f) => !loaded.has(f.key))
    .map((f) => f.key);
}

/**
 * Check if the banner should be visible.
 */
export function shouldShowBanner(
  hasConnections: boolean,
  enrichmentSummary: EnrichmentSummary | null,
  dismissed: boolean
): boolean {
  if (!hasConnections) return false;
  if (dismissed) return false;
  const missing = getMissingEnrichmentFiles(enrichmentSummary);
  return missing.length > 0;
}
