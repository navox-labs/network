/**
 * Gmail Integration — Barrel Export
 *
 * Re-exports all public API for Gmail integration.
 */

export type { EmailContact, GmailSyncState } from "./types";
export {
  getGmailAuth,
  saveGmailAuth,
  clearGmailAuth,
  isGmailConnected,
  fetchEmailContacts,
  extractEmail,
  extractName,
  startGmailOAuth,
} from "./client";
export { emailContactsToConnections } from "./parser";
