/**
 * Gmail Contact Parser — Navox Network V1
 *
 * Converts EmailContact records (extracted from Gmail metadata) into
 * the Connection format used throughout the app.
 *
 * Email contacts have less data than LinkedIn imports (no company/position),
 * so they are marked as latent ties by default. When merged with LinkedIn
 * data, the enrichment engine can match by email and upgrade them.
 */

import type { EmailContact } from "./types";
import type { Connection } from "@/lib/tieStrength";
import {
  calculateTieStrength,
  tieCategoryFromStrength,
  classifyIndustry,
  classifyRole,
  activationPriority,
  assignConfidenceLevel,
} from "@/lib/tieStrength";

/**
 * Convert an array of EmailContact records into Connection objects.
 * Filters out contacts with fewer than 2 emails (noise reduction).
 *
 * @param emailContacts - Raw email contacts from Gmail metadata extraction
 * @param startId - Starting index for ID generation (to avoid collisions with existing connections)
 * @returns Connection[] ready to merge into the main connections store
 */
export function emailContactsToConnections(
  emailContacts: EmailContact[],
  startId: number = 0
): Connection[] {
  return emailContacts
    .filter((c) => c.email && c.frequency >= 2)
    .map((contact, i) => {
      const nameParts = (
        contact.name || contact.email.split("@")[0]
      ).split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const name = `${firstName} ${lastName}`.trim();

      // Use last email date as proxy for connection date
      const connectedOn = contact.lastDate;
      const daysSince = Math.floor(
        (Date.now() - new Date(connectedOn).getTime()) / 86400000
      );

      const tieStrength = calculateTieStrength(connectedOn);
      const tieCategory = tieCategoryFromStrength(tieStrength);
      // No company/position available from email metadata
      const industryCluster = classifyIndustry("", "");
      const roleCategory = classifyRole("");
      const confidenceLevel = assignConfidenceLevel(daysSince);
      const isBridge = false;
      const networkPosition = "explorer" as const;
      const priority = activationPriority(
        tieStrength,
        isBridge,
        networkPosition
      );

      return {
        id: `email-${startId + i}`,
        name,
        firstName,
        lastName,
        company: "",
        position: "",
        connectedOn,
        email: contact.email,
        tieStrength,
        tieCategory,
        roleCategory,
        daysSinceConnected: daysSince,
        industryCluster,
        isBridge,
        networkPosition,
        confidenceLevel,
        activationPriority: priority,
        source: "email_import" as const,
        sources: ["email_import" as const],
        isLatentTie: true,
      };
    });
}
