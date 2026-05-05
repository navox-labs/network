/**
 * Navox Network V1 — Extended Types
 *
 * Additive types for multi-source ingestion, status tracking,
 * voice-personalized outreach, and license key management.
 */

export type DataSource = "linkedin_csv" | "generic_csv" | "manual_entry" | "email_import";

export type ConnectionStatus =
  | "new"
  | "researching"
  | "drafted"
  | "sent"
  | "replied"
  | "meeting_scheduled"
  | "converted"
  | "archived";

export interface OutreachVoice {
  sample: string;
  additionalNotes?: string;
}

export interface ImportBatch {
  id: string;
  source: DataSource;
  filename?: string;
  importedAt: string;
  connectionCount: number;
}

export interface LicenseState {
  key: string;
  status: "active" | "expired" | "cancelled";
  validatedAt: string;
}
