/**
 * Enrichment Module — Navox Network
 *
 * Parses LinkedIn enrichment CSV files (messages, endorsements,
 * recommendations, invitations) and matches them to connections
 * via LinkedIn profile URL.
 *
 * Scientific basis:
 * - Rajkumar et al. (2022): interaction frequency is the strongest
 *   predictor of tie strength in professional networks.
 * - Bidirectional messages confirm active relationship (HIGH confidence).
 * - One-way inbound messages indicate warm lead (MEDIUM confidence).
 */

import type { Connection } from "./tieStrength";

// ── Raw record types from LinkedIn CSVs ──────────────────────────────────

export interface MessageRecord {
  senderProfileUrl: string;
  conversationId: string;
  date: string; // ISO or LinkedIn date format
  direction: "sent" | "received" | "unknown";
}

export interface EndorsementRecord {
  endorserProfileUrl: string;
  skillName: string;
}

export interface RecommendationRecord {
  recommenderProfileUrl: string;
}

export interface InvitationRecord {
  profileUrl: string;
  direction: "sent" | "received";
  sentAt: string;
}

// ── Per-connection enrichment data ──────────────────────────────────────

export interface ConnectionEnrichment {
  messageCount: number;
  lastMessageDate: string | null;
  messageBidirectional: boolean;
  sentCount: number;
  receivedCount: number;
  endorsementReceived: boolean;
  recommendationReceived: boolean;
  initiatedBy: "user" | "them" | null;
}

// ── Aggregate enrichment summary (for localStorage) ────────────────────

export interface EnrichmentSummary {
  filesLoaded: string[];
  messageStats: {
    totalMatched: number;
    totalUnmatched: number;
    uniqueUnmatchedSenders: number;
  };
  endorsementCount: number;
  recommendationCount: number;
  invitationStats: {
    sentByUser: number;
    receivedByUser: number;
  };
}

// ── URL normalization ──────────────────────────────────────────────────

/**
 * Normalize a LinkedIn profile URL for matching.
 * Strips trailing slashes, lowercases, removes query params.
 */
export function normalizeLinkedInUrl(url: string): string {
  if (!url) return "";
  let normalized = url.trim().toLowerCase();
  // Remove query params and fragments
  normalized = normalized.split("?")[0].split("#")[0];
  // Remove trailing slash(es)
  normalized = normalized.replace(/\/+$/, "");
  return normalized;
}

// ── CSV Parsers ──────────────────────────────────────────────────────────
// These parse raw CSV content (already split into rows by PapaParse or
// similar). They accept arrays of key-value row objects.

export interface RawMessageRow {
  "SENDER PROFILE URL"?: string;
  "Sender Profile URL"?: string;
  "CONVERSATION ID"?: string;
  "Conversation ID"?: string;
  "CONVERSATION TITLE"?: string;
  "Conversation Title"?: string;
  DATE?: string;
  Date?: string;
  FROM?: string;
  From?: string;
  DIRECTION?: string;
  Direction?: string;
  FOLDER?: string;
  Folder?: string;
  [key: string]: string | undefined;
}

export function parseMessages(rows: RawMessageRow[], userProfileUrl?: string): MessageRecord[] {
  return rows
    .filter((row) => {
      const url = row["SENDER PROFILE URL"] || row["Sender Profile URL"] || "";
      return url.trim().length > 0;
    })
    .map((row) => {
      const senderUrl = (row["SENDER PROFILE URL"] || row["Sender Profile URL"] || "").trim();
      const conversationId = (row["CONVERSATION ID"] || row["Conversation ID"] || "").trim();
      const date = (row["DATE"] || row["Date"] || "").trim();
      const folder = (row["FOLDER"] || row["Folder"] || "").trim().toLowerCase();

      let direction: "sent" | "received" | "unknown" = "unknown";
      if (userProfileUrl && normalizeLinkedInUrl(senderUrl) === normalizeLinkedInUrl(userProfileUrl)) {
        direction = "sent";
      } else if (folder === "inbox") {
        direction = "received";
      } else if (folder === "sent" || folder === "sentbox") {
        direction = "sent";
      } else if (senderUrl) {
        // If we have a sender URL but can't determine direction,
        // treat as received (the sender is the other person)
        direction = "received";
      }

      return {
        senderProfileUrl: normalizeLinkedInUrl(senderUrl),
        conversationId,
        date,
        direction,
      };
    });
}

export interface RawEndorsementRow {
  "Endorser Profile Url"?: string;
  "Endorser Profile URL"?: string;
  "Skill Name"?: string;
  [key: string]: string | undefined;
}

export function parseEndorsements(rows: RawEndorsementRow[]): EndorsementRecord[] {
  return rows
    .filter((row) => {
      const url = row["Endorser Profile Url"] || row["Endorser Profile URL"] || "";
      return url.trim().length > 0;
    })
    .map((row) => ({
      endorserProfileUrl: normalizeLinkedInUrl(
        (row["Endorser Profile Url"] || row["Endorser Profile URL"] || "").trim()
      ),
      skillName: (row["Skill Name"] || "").trim(),
    }));
}

export interface RawRecommendationRow {
  "Recommender Profile Url"?: string;
  "Recommender Profile URL"?: string;
  [key: string]: string | undefined;
}

export function parseRecommendations(rows: RawRecommendationRow[]): RecommendationRecord[] {
  return rows
    .filter((row) => {
      const url = row["Recommender Profile Url"] || row["Recommender Profile URL"] || "";
      return url.trim().length > 0;
    })
    .map((row) => ({
      recommenderProfileUrl: normalizeLinkedInUrl(
        (row["Recommender Profile Url"] || row["Recommender Profile URL"] || "").trim()
      ),
    }));
}

export interface RawInvitationRow {
  "Profile URL"?: string;
  "profile url"?: string;
  Direction?: string;
  "Sent At"?: string;
  [key: string]: string | undefined;
}

export function parseInvitations(rows: RawInvitationRow[]): InvitationRecord[] {
  return rows
    .filter((row) => {
      const url = row["Profile URL"] || row["profile url"] || "";
      return url.trim().length > 0;
    })
    .map((row) => {
      const dir = (row["Direction"] || "").trim().toLowerCase();
      return {
        profileUrl: normalizeLinkedInUrl(
          (row["Profile URL"] || row["profile url"] || "").trim()
        ),
        direction: dir === "incoming" || dir === "received" ? "received" : "sent",
        sentAt: (row["Sent At"] || "").trim(),
      };
    });
}

// ── Message matching ─────────────────────────────────────────────────────

interface MessageAggregation {
  totalCount: number;
  sentCount: number;
  receivedCount: number;
  lastDate: string | null;
  bidirectional: boolean;
}

/**
 * Parse a date string to a Date object for comparison.
 * Handles ISO dates, LinkedIn formats ("Jan 15, 2024", "1/15/2024"), etc.
 * Returns null if unparseable.
 */
function parseDateSafe(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
}

/**
 * Compare two date strings chronologically. Returns true if a > b.
 * Falls back to string comparison only if both fail to parse.
 */
function isMoreRecent(a: string, b: string): boolean {
  const da = parseDateSafe(a);
  const db = parseDateSafe(b);
  if (da && db) return da.getTime() > db.getTime();
  // Fallback: if only one parses, prefer the parseable one (it's more reliable)
  if (da && !db) return true;
  if (!da && db) return false;
  return a > b; // last resort string compare
}

/**
 * Match messages to connections by LinkedIn profile URL.
 * Uses conversation grouping to correctly attribute sent messages.
 *
 * Problem: messages sent BY the user have the user's own URL as sender,
 * not the connection's URL. Without conversation grouping, sent messages
 * can't be matched to the recipient connection.
 *
 * Solution: group messages by conversation ID. For each conversation,
 * identify the connection URL (the non-user sender). Attribute all
 * messages in that conversation to that connection, with correct
 * sent/received direction.
 *
 * Fallback: if no conversation IDs exist, use direct sender URL matching
 * (received messages only — sent messages are unattributable).
 */
export function matchMessagesToConnections(
  messages: MessageRecord[],
  connections: Connection[]
): Map<string, MessageAggregation> {
  const urlIndex = new Map<string, MessageAggregation>();

  // Build set of valid connection URLs for fast lookup
  const connectionUrls = new Set<string>();
  for (const c of connections) {
    if (c.url) {
      connectionUrls.add(normalizeLinkedInUrl(c.url));
    }
  }

  // Check if conversation IDs are available
  const hasConversationIds = messages.some((m) => m.conversationId.length > 0);

  if (hasConversationIds) {
    // Group messages by conversation ID
    const conversations = new Map<string, MessageRecord[]>();
    for (const msg of messages) {
      if (!msg.conversationId) continue;
      const existing = conversations.get(msg.conversationId);
      if (existing) {
        existing.push(msg);
      } else {
        conversations.set(msg.conversationId, [msg]);
      }
    }

    // For each conversation, find the connection URL (non-user sender)
    conversations.forEach((msgs) => {
      // Collect all unique sender URLs in this conversation
      const senderUrls = new Set(msgs.map((m) => m.senderProfileUrl).filter(Boolean));

      // Find which sender URL belongs to a connection
      let connectionUrl: string | null = null;
      senderUrls.forEach((url) => {
        if (connectionUrls.has(url)) {
          connectionUrl = url;
        }
      });

      if (!connectionUrl) return; // no connection found in this conversation

      // Attribute messages: if sender = connection URL, it's received; otherwise sent
      for (const msg of msgs) {
        const isReceived = msg.senderProfileUrl === connectionUrl;

        const existing = urlIndex.get(connectionUrl);
        if (existing) {
          existing.totalCount++;
          if (isReceived) existing.receivedCount++;
          else existing.sentCount++;
          if (msg.date && (!existing.lastDate || isMoreRecent(msg.date, existing.lastDate))) {
            existing.lastDate = msg.date;
          }
          existing.bidirectional = existing.sentCount > 0 && existing.receivedCount > 0;
        } else {
          urlIndex.set(connectionUrl, {
            totalCount: 1,
            sentCount: isReceived ? 0 : 1,
            receivedCount: isReceived ? 1 : 0,
            lastDate: msg.date || null,
            bidirectional: false,
          });
        }
      }
    });
  } else {
    // Fallback: no conversation IDs — direct sender URL matching (received only)
    for (const msg of messages) {
      if (!msg.senderProfileUrl) continue;
      if (!connectionUrls.has(msg.senderProfileUrl)) continue;

      const existing = urlIndex.get(msg.senderProfileUrl);
      if (existing) {
        existing.totalCount++;
        existing.receivedCount++;
        if (msg.date && (!existing.lastDate || isMoreRecent(msg.date, existing.lastDate))) {
          existing.lastDate = msg.date;
        }
      } else {
        urlIndex.set(msg.senderProfileUrl, {
          totalCount: 1,
          sentCount: 0,
          receivedCount: 1,
          lastDate: msg.date || null,
          bidirectional: false,
        });
      }
    }
  }

  return urlIndex;
}

// ── Compute enrichment for all connections ───────────────────────────────

/**
 * Compute per-connection enrichment from all enrichment data sources.
 * Returns a Map keyed by normalized connection URL.
 */
export function computeConnectionEnrichments(
  messages: MessageRecord[],
  endorsements: EndorsementRecord[],
  recommendations: RecommendationRecord[],
  invitations: InvitationRecord[],
  connections: Connection[]
): Map<string, ConnectionEnrichment> {
  const enrichmentMap = new Map<string, ConnectionEnrichment>();

  // Message matching
  const messageMatches = matchMessagesToConnections(messages, connections);
  messageMatches.forEach((agg, url) => {
    enrichmentMap.set(url, {
      messageCount: agg.totalCount,
      lastMessageDate: agg.lastDate,
      messageBidirectional: agg.bidirectional,
      sentCount: agg.sentCount,
      receivedCount: agg.receivedCount,
      endorsementReceived: false,
      recommendationReceived: false,
      initiatedBy: null,
    });
  });

  // Endorsement matching
  const endorserUrls = new Set(endorsements.map((e) => e.endorserProfileUrl));

  // Recommendation matching
  const recommenderUrls = new Set(recommendations.map((r) => r.recommenderProfileUrl));

  // Invitation matching — build a map of URL → direction
  const invitationMap = new Map<string, "user" | "them">();
  for (const inv of invitations) {
    invitationMap.set(inv.profileUrl, inv.direction === "sent" ? "user" : "them");
  }

  // Apply endorsements, recommendations, invitations to enrichment map
  for (const c of connections) {
    if (!c.url) continue;
    const normalizedUrl = normalizeLinkedInUrl(c.url);

    let enrichment = enrichmentMap.get(normalizedUrl);
    if (!enrichment) {
      // Check if this connection has any non-message enrichment
      const hasEndorsement = endorserUrls.has(normalizedUrl);
      const hasRecommendation = recommenderUrls.has(normalizedUrl);
      const hasInvitation = invitationMap.has(normalizedUrl);

      if (!hasEndorsement && !hasRecommendation && !hasInvitation) continue;

      enrichment = {
        messageCount: 0,
        lastMessageDate: null,
        messageBidirectional: false,
        sentCount: 0,
        receivedCount: 0,
        endorsementReceived: false,
        recommendationReceived: false,
        initiatedBy: null,
      };
      enrichmentMap.set(normalizedUrl, enrichment);
    }

    if (endorserUrls.has(normalizedUrl)) {
      enrichment.endorsementReceived = true;
    }
    if (recommenderUrls.has(normalizedUrl)) {
      enrichment.recommendationReceived = true;
    }
    if (invitationMap.has(normalizedUrl)) {
      enrichment.initiatedBy = invitationMap.get(normalizedUrl)!;
    }
  }

  return enrichmentMap;
}

/**
 * Count unique sender profile URLs in messages that don't match any
 * connection URL. These are "latent ties" — people who messaged but
 * aren't connected.
 */
export function countUniqueUnmatchedSenders(
  messages: MessageRecord[],
  connections: Connection[]
): number {
  const connectionUrls = new Set<string>();
  for (const c of connections) {
    if (c.url) connectionUrls.add(normalizeLinkedInUrl(c.url));
  }

  const unmatchedSenders = new Set<string>();
  for (const m of messages) {
    if (!m.senderProfileUrl) continue;
    if (!connectionUrls.has(m.senderProfileUrl)) {
      unmatchedSenders.add(m.senderProfileUrl);
    }
  }

  return unmatchedSenders.size;
}

/**
 * Build the aggregate enrichment summary for localStorage.
 */
export function buildEnrichmentSummary(
  filesLoaded: string[],
  enrichmentMap: Map<string, ConnectionEnrichment>,
  invitations: InvitationRecord[],
  totalMessageCount: number,
  messages: MessageRecord[] = [],
  connections: Connection[] = []
): EnrichmentSummary {
  let totalMatched = 0;
  let endorsementCount = 0;
  let recommendationCount = 0;

  enrichmentMap.forEach((e) => {
    if (e.messageCount > 0) totalMatched++;
    if (e.endorsementReceived) endorsementCount++;
    if (e.recommendationReceived) recommendationCount++;
  });

  let sentByUser = 0;
  let receivedByUser = 0;
  for (const inv of invitations) {
    if (inv.direction === "sent") sentByUser++;
    else receivedByUser++;
  }

  const uniqueUnmatchedSenders = messages.length > 0
    ? countUniqueUnmatchedSenders(messages, connections)
    : 0;

  return {
    filesLoaded,
    messageStats: {
      totalMatched,
      totalUnmatched: Math.max(0, totalMessageCount - totalMatched),
      uniqueUnmatchedSenders,
    },
    endorsementCount,
    recommendationCount,
    invitationStats: { sentByUser, receivedByUser },
  };
}
