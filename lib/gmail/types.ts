/**
 * Gmail Integration Types — Navox Network V1
 *
 * Types for Gmail OAuth state and extracted email contact metadata.
 * Only email metadata (sender, recipient, dates) is extracted — never message bodies.
 * All data stays in the browser via IndexedDB.
 */

export interface EmailContact {
  email: string;
  name?: string;
  frequency: number; // number of emails exchanged
  lastDate: string; // ISO date of most recent email
  direction: "sent" | "received" | "both";
}

export interface GmailSyncState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp ms
  lastSyncAt?: string;
  syncedMessageCount?: number;
}
