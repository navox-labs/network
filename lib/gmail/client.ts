/**
 * Gmail Client — Browser-side Gmail API calls
 *
 * Handles OAuth state persistence in IndexedDB and fetching email metadata
 * directly from the Gmail API using the user's access token.
 *
 * Privacy: tokens are stored locally in IndexedDB, never sent to our server.
 * Only email metadata (From, To, Date headers) is extracted — never message bodies.
 */

import type { GmailSyncState, EmailContact } from "./types";
import { getSetting, setSetting, deleteSetting } from "@/lib/localDB";

const GMAIL_AUTH_KEY = "gmailAuth";

// ── Auth state management ─────────────────────────────────────────────────

export async function getGmailAuth(): Promise<GmailSyncState | null> {
  const state = await getSetting<GmailSyncState>(GMAIL_AUTH_KEY);
  return state ?? null;
}

export async function saveGmailAuth(state: GmailSyncState): Promise<void> {
  await setSetting(GMAIL_AUTH_KEY, state);
}

export async function clearGmailAuth(): Promise<void> {
  await deleteSetting(GMAIL_AUTH_KEY);
}

export async function isGmailConnected(): Promise<boolean> {
  const auth = await getGmailAuth();
  if (!auth) return false;
  return auth.expiresAt > Date.now();
}

// ── Email header parsing ──────────────────────────────────────────────────

/**
 * Extract email address from a header value like "Jane Doe <jane@example.com>"
 * or plain "jane@example.com".
 */
export function extractEmail(headerValue: string): string | null {
  const match = headerValue.match(/<([^>]+)>/);
  if (match) return match[1];
  // Plain email without angle brackets
  if (headerValue.includes("@")) return headerValue.trim();
  return null;
}

/**
 * Extract display name from a header value like "Jane Doe <jane@example.com>"
 * or '"Jane Doe" <jane@example.com>'.
 */
export function extractName(headerValue: string): string | null {
  const match = headerValue.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  return null;
}

// ── Gmail API types ───────────────────────────────────────────────────────

interface GmailMessageListResponse {
  messages?: { id: string }[];
  nextPageToken?: string;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessageResponse {
  payload?: {
    headers?: GmailHeader[];
  };
  labelIds?: string[];
}

// ── Fetch email contacts ──────────────────────────────────────────────────

/**
 * Fetch email metadata from Gmail API (browser-side).
 * Extracts From, To, Date headers only — never reads message bodies.
 * Limits to MAX_MESSAGES to prevent excessive API calls.
 */
export async function fetchEmailContacts(
  accessToken: string
): Promise<EmailContact[]> {
  const contacts = new Map<string, EmailContact>();
  let pageToken: string | undefined;
  let totalFetched = 0;
  const MAX_MESSAGES = 500;

  while (totalFetched < MAX_MESSAGES) {
    const url = new URL(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    );
    url.searchParams.set("maxResults", "100");
    url.searchParams.set("q", "in:sent OR in:inbox");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const listRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      throw new Error(`Gmail API error: ${listRes.status}`);
    }

    const listData: GmailMessageListResponse = await listRes.json();
    const messageIds: string[] = (listData.messages || []).map((m) => m.id);

    if (messageIds.length === 0) break;

    // Fetch message headers individually
    for (const msgId of messageIds) {
      if (totalFetched >= MAX_MESSAGES) break;

      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!msgRes.ok) continue;

      const msgData: GmailMessageResponse = await msgRes.json();
      const headers = msgData.payload?.headers || [];

      const from =
        headers.find((h) => h.name === "From")?.value || "";
      const to =
        headers.find((h) => h.name === "To")?.value || "";
      const date =
        headers.find((h) => h.name === "Date")?.value || "";

      const fromEmail = extractEmail(from);
      const toEmail = extractEmail(to);

      let isoDate: string;
      try {
        isoDate = new Date(date).toISOString();
      } catch {
        isoDate = new Date().toISOString();
      }

      // Determine if sent or received based on label
      const labels: string[] = msgData.labelIds || [];
      const isSent = labels.includes("SENT");

      const contactEmail = isSent ? toEmail : fromEmail;
      if (!contactEmail) continue;

      const key = contactEmail.toLowerCase();
      const existing = contacts.get(key);

      if (existing) {
        existing.frequency++;
        if (new Date(isoDate) > new Date(existing.lastDate)) {
          existing.lastDate = isoDate;
        }
        if (isSent && existing.direction === "received")
          existing.direction = "both";
        if (!isSent && existing.direction === "sent")
          existing.direction = "both";
      } else {
        const name = isSent ? extractName(to) : extractName(from);
        contacts.set(key, {
          email: key,
          name: name || undefined,
          frequency: 1,
          lastDate: isoDate,
          direction: isSent ? "sent" : "received",
        });
      }

      totalFetched++;
    }

    pageToken = listData.nextPageToken;
    if (!pageToken) break;
  }

  return Array.from(contacts.values());
}

// ── OAuth initiation ──────────────────────────────────────────────────────

/**
 * Redirect the browser to the server-side OAuth initiator.
 * The server handles the Google OAuth consent screen redirect.
 */
export function startGmailOAuth(): void {
  window.location.href = "/network/api/gmail/auth";
}
