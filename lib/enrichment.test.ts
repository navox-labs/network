import { describe, it, expect } from "vitest";
import {
  normalizeLinkedInUrl,
  parseMessages,
  parseEndorsements,
  parseRecommendations,
  parseInvitations,
  matchMessagesToConnections,
  computeConnectionEnrichments,
  buildEnrichmentSummary,
  type RawMessageRow,
  type RawEndorsementRow,
  type RawRecommendationRow,
  type RawInvitationRow,
  type MessageRecord,
} from "./enrichment";
import type { Connection } from "./tieStrength";

// ── Helper ──────────────────────────────────────────────────────────────

const makeConnection = (overrides: Partial<Connection> = {}): Connection => ({
  id: "test",
  name: "Test Person",
  firstName: "Test",
  lastName: "Person",
  company: "Test Co",
  position: "Tester",
  connectedOn: "2024-01-01",
  tieStrength: 0.5,
  tieCategory: "moderate",
  roleCategory: "Other",
  daysSinceConnected: 365,
  industryCluster: "Tech",
  isBridge: false,
  networkPosition: "anchor",
  confidenceLevel: "low",
  activationPriority: 0.5,
  ...overrides,
});

const msg = (
  senderUrl: string,
  date: string,
  direction: "sent" | "received" | "unknown",
  conversationId = ""
): MessageRecord => ({
  senderProfileUrl: senderUrl,
  conversationId,
  date,
  direction,
});

// ── normalizeLinkedInUrl ────────────────────────────────────────────────

describe("normalizeLinkedInUrl", () => {
  it("strips trailing slashes", () => {
    expect(normalizeLinkedInUrl("https://www.linkedin.com/in/alice/")).toBe(
      "https://www.linkedin.com/in/alice"
    );
    expect(normalizeLinkedInUrl("https://www.linkedin.com/in/alice///")).toBe(
      "https://www.linkedin.com/in/alice"
    );
  });

  it("lowercases URL", () => {
    expect(normalizeLinkedInUrl("https://www.LinkedIn.com/in/Alice")).toBe(
      "https://www.linkedin.com/in/alice"
    );
  });

  it("removes query params and fragments", () => {
    expect(normalizeLinkedInUrl("https://www.linkedin.com/in/alice?trk=foo")).toBe(
      "https://www.linkedin.com/in/alice"
    );
    expect(normalizeLinkedInUrl("https://www.linkedin.com/in/alice#section")).toBe(
      "https://www.linkedin.com/in/alice"
    );
  });

  it("handles empty string", () => {
    expect(normalizeLinkedInUrl("")).toBe("");
  });

  it("trims whitespace", () => {
    expect(normalizeLinkedInUrl("  https://www.linkedin.com/in/alice  ")).toBe(
      "https://www.linkedin.com/in/alice"
    );
  });
});

// ── parseMessages ───────────────────────────────────────────────────────

describe("parseMessages", () => {
  it("parses message rows with SENDER PROFILE URL", () => {
    const rows: RawMessageRow[] = [
      {
        "SENDER PROFILE URL": "https://www.linkedin.com/in/alice",
        "CONVERSATION ID": "conv-1",
        DATE: "2024-06-01",
        FOLDER: "INBOX",
      },
    ];

    const messages = parseMessages(rows);
    expect(messages).toHaveLength(1);
    expect(messages[0].senderProfileUrl).toBe("https://www.linkedin.com/in/alice");
    expect(messages[0].conversationId).toBe("conv-1");
    expect(messages[0].date).toBe("2024-06-01");
    expect(messages[0].direction).toBe("received");
  });

  it("detects sent messages from folder", () => {
    const rows: RawMessageRow[] = [
      {
        "SENDER PROFILE URL": "https://www.linkedin.com/in/me",
        DATE: "2024-06-01",
        FOLDER: "SENT",
      },
    ];

    const messages = parseMessages(rows, "https://www.linkedin.com/in/me");
    expect(messages[0].direction).toBe("sent");
  });

  it("detects sent messages by matching user profile URL", () => {
    const rows: RawMessageRow[] = [
      {
        "SENDER PROFILE URL": "https://www.linkedin.com/in/me",
        DATE: "2024-06-01",
      },
    ];

    const messages = parseMessages(rows, "https://www.linkedin.com/in/me");
    expect(messages[0].direction).toBe("sent");
  });

  it("filters out rows without profile URL", () => {
    const rows: RawMessageRow[] = [
      { "SENDER PROFILE URL": "", DATE: "2024-06-01" },
      { "SENDER PROFILE URL": "https://linkedin.com/in/alice", DATE: "2024-06-01" },
    ];

    const messages = parseMessages(rows);
    expect(messages).toHaveLength(1);
  });

  it("handles alternate casing of column names", () => {
    const rows: RawMessageRow[] = [
      {
        "Sender Profile URL": "https://linkedin.com/in/alice",
        "Conversation ID": "conv-1",
        Date: "2024-06-01",
        Folder: "Inbox",
      },
    ];

    const messages = parseMessages(rows);
    expect(messages).toHaveLength(1);
    expect(messages[0].direction).toBe("received");
    expect(messages[0].conversationId).toBe("conv-1");
  });
});

// ── parseEndorsements ───────────────────────────────────────────────────

describe("parseEndorsements", () => {
  it("parses endorsement rows", () => {
    const rows: RawEndorsementRow[] = [
      { "Endorser Profile Url": "https://linkedin.com/in/alice", "Skill Name": "Python" },
      { "Endorser Profile Url": "https://linkedin.com/in/bob", "Skill Name": "TypeScript" },
    ];

    const endorsements = parseEndorsements(rows);
    expect(endorsements).toHaveLength(2);
    expect(endorsements[0].endorserProfileUrl).toBe("https://linkedin.com/in/alice");
    expect(endorsements[0].skillName).toBe("Python");
  });

  it("filters out rows without URL", () => {
    const rows: RawEndorsementRow[] = [
      { "Endorser Profile Url": "", "Skill Name": "Python" },
    ];
    expect(parseEndorsements(rows)).toHaveLength(0);
  });
});

// ── parseRecommendations ────────────────────────────────────────────────

describe("parseRecommendations", () => {
  it("parses recommendation rows", () => {
    const rows: RawRecommendationRow[] = [
      { "Recommender Profile Url": "https://linkedin.com/in/alice" },
    ];

    const recs = parseRecommendations(rows);
    expect(recs).toHaveLength(1);
    expect(recs[0].recommenderProfileUrl).toBe("https://linkedin.com/in/alice");
  });
});

// ── parseInvitations ────────────────────────────────────────────────────

describe("parseInvitations", () => {
  it("parses invitation rows with direction", () => {
    const rows: RawInvitationRow[] = [
      { "Profile URL": "https://linkedin.com/in/alice", Direction: "INCOMING", "Sent At": "2024-01-01" },
      { "Profile URL": "https://linkedin.com/in/bob", Direction: "Sent", "Sent At": "2024-02-01" },
    ];

    const invitations = parseInvitations(rows);
    expect(invitations).toHaveLength(2);
    expect(invitations[0].direction).toBe("received");
    expect(invitations[1].direction).toBe("sent");
  });

  it("defaults to sent for unknown direction", () => {
    const rows: RawInvitationRow[] = [
      { "Profile URL": "https://linkedin.com/in/alice", Direction: "" },
    ];

    const invitations = parseInvitations(rows);
    expect(invitations[0].direction).toBe("sent");
  });
});

// ── matchMessagesToConnections ───────────────────────────────────────────

describe("matchMessagesToConnections", () => {
  const ALICE = "https://www.linkedin.com/in/alice";
  const BOB = "https://www.linkedin.com/in/bob";
  const USER = "https://www.linkedin.com/in/me";

  it("matches messages with conversation IDs — detects bidirectional", () => {
    const connections = [
      makeConnection({ id: "1", url: ALICE }),
      makeConnection({ id: "2", url: BOB }),
    ];

    // Conversation between user and alice: user sent, alice replied
    const messages: MessageRecord[] = [
      msg(USER, "2024-06-01", "sent", "conv-1"),
      msg(ALICE, "2024-06-02", "received", "conv-1"),
      // Unrelated message from unknown person
      msg("https://www.linkedin.com/in/unknown", "2024-06-01", "received", "conv-2"),
    ];

    const result = matchMessagesToConnections(messages, connections);
    expect(result.size).toBe(1);
    const alice = result.get(ALICE);
    expect(alice).toBeDefined();
    expect(alice!.totalCount).toBe(2);
    expect(alice!.sentCount).toBe(1);
    expect(alice!.receivedCount).toBe(1);
    expect(alice!.bidirectional).toBe(true);
  });

  it("fallback: matches by sender URL when no conversation IDs", () => {
    const connections = [
      makeConnection({ id: "1", url: ALICE }),
    ];

    const messages: MessageRecord[] = [
      msg(ALICE, "2024-06-01", "received"),
      msg(ALICE, "2024-06-15", "received"),
    ];

    const result = matchMessagesToConnections(messages, connections);
    expect(result.size).toBe(1);
    const alice = result.get(ALICE);
    expect(alice!.totalCount).toBe(2);
    expect(alice!.receivedCount).toBe(2);
    expect(alice!.bidirectional).toBe(false);
  });

  it("handles URL normalization differences", () => {
    const connections = [
      makeConnection({ id: "1", url: "https://www.linkedin.com/in/alice/" }),
    ];

    const messages: MessageRecord[] = [
      msg(ALICE, "2024-06-01", "received"),
    ];

    const result = matchMessagesToConnections(messages, connections);
    expect(result.size).toBe(1);
  });

  it("returns empty map when no messages match", () => {
    const connections = [
      makeConnection({ id: "1", url: ALICE }),
    ];

    const messages: MessageRecord[] = [
      msg("https://www.linkedin.com/in/stranger", "2024-06-01", "received"),
    ];

    const result = matchMessagesToConnections(messages, connections);
    expect(result.size).toBe(0);
  });

  it("tracks one-way messages correctly (not bidirectional)", () => {
    const connections = [
      makeConnection({ id: "1", url: ALICE }),
    ];

    // Alice sent two messages, user never replied (with conversation IDs)
    const messages: MessageRecord[] = [
      msg(ALICE, "2024-06-01", "received", "conv-1"),
      msg(ALICE, "2024-06-02", "received", "conv-1"),
    ];

    const result = matchMessagesToConnections(messages, connections);
    const alice = result.get(ALICE);
    expect(alice!.bidirectional).toBe(false);
    expect(alice!.receivedCount).toBe(2);
    expect(alice!.sentCount).toBe(0);
  });

  it("skips connections without URL", () => {
    const connections = [
      makeConnection({ id: "1", url: undefined }),
    ];

    const messages: MessageRecord[] = [
      msg(ALICE, "2024-06-01", "received"),
    ];

    const result = matchMessagesToConnections(messages, connections);
    expect(result.size).toBe(0);
  });

  it("uses date parsing for lastDate comparison (not string compare)", () => {
    const connections = [
      makeConnection({ id: "1", url: ALICE }),
    ];

    // Non-ISO dates where string comparison gives wrong result
    const messages: MessageRecord[] = [
      msg(ALICE, "Jan 15, 2024", "received", "conv-1"),
      msg(ALICE, "Sep 1, 2020", "received", "conv-1"),
    ];

    const result = matchMessagesToConnections(messages, connections);
    const alice = result.get(ALICE);
    // Jan 15, 2024 is more recent than Sep 1, 2020
    expect(alice!.lastDate).toBe("Jan 15, 2024");
  });

  it("handles multiple conversations with the same connection", () => {
    const connections = [
      makeConnection({ id: "1", url: ALICE }),
    ];

    const messages: MessageRecord[] = [
      msg(USER, "2024-01-01", "sent", "conv-1"),
      msg(ALICE, "2024-01-02", "received", "conv-1"),
      msg(USER, "2024-06-01", "sent", "conv-2"),
      msg(ALICE, "2024-06-02", "received", "conv-2"),
    ];

    const result = matchMessagesToConnections(messages, connections);
    const alice = result.get(ALICE);
    expect(alice!.totalCount).toBe(4);
    expect(alice!.sentCount).toBe(2);
    expect(alice!.receivedCount).toBe(2);
    expect(alice!.bidirectional).toBe(true);
  });
});

// ── computeConnectionEnrichments ────────────────────────────────────────

describe("computeConnectionEnrichments", () => {
  const ALICE = "https://www.linkedin.com/in/alice";
  const BOB = "https://www.linkedin.com/in/bob";
  const USER = "https://www.linkedin.com/in/me";

  it("combines messages, endorsements, recommendations, and invitations", () => {
    const connections = [
      makeConnection({ id: "1", url: ALICE }),
      makeConnection({ id: "2", url: BOB }),
    ];

    const messages: MessageRecord[] = [
      msg(USER, "2024-06-01", "sent", "conv-1"),
      msg(ALICE, "2024-06-15", "received", "conv-1"),
    ];

    const endorsements = [
      { endorserProfileUrl: ALICE, skillName: "Python" },
    ];

    const recommendations = [
      { recommenderProfileUrl: BOB },
    ];

    const invitations = [
      { profileUrl: ALICE, direction: "sent" as const, sentAt: "2024-01-01" },
    ];

    const result = computeConnectionEnrichments(messages, endorsements, recommendations, invitations, connections);

    const alice = result.get(ALICE);
    expect(alice).toBeDefined();
    expect(alice!.messageCount).toBe(2);
    expect(alice!.messageBidirectional).toBe(true);
    expect(alice!.endorsementReceived).toBe(true);
    expect(alice!.initiatedBy).toBe("user");

    const bob = result.get(BOB);
    expect(bob).toBeDefined();
    expect(bob!.messageCount).toBe(0);
    expect(bob!.recommendationReceived).toBe(true);
  });

  it("returns empty map when no enrichment data matches", () => {
    const connections = [
      makeConnection({ id: "1", url: ALICE }),
    ];

    const result = computeConnectionEnrichments([], [], [], [], connections);
    expect(result.size).toBe(0);
  });

  it("handles connections without URLs", () => {
    const connections = [
      makeConnection({ id: "1", url: undefined }),
    ];

    const endorsements = [
      { endorserProfileUrl: "https://www.linkedin.com/in/unknown", skillName: "Python" },
    ];

    const result = computeConnectionEnrichments([], endorsements, [], [], connections);
    expect(result.size).toBe(0);
  });
});

// ── buildEnrichmentSummary ──────────────────────────────────────────────

describe("buildEnrichmentSummary", () => {
  it("builds correct summary from enrichment map", () => {
    const enrichmentMap = new Map([
      [
        "https://www.linkedin.com/in/alice",
        {
          messageCount: 5,
          lastMessageDate: "2024-06-15",
          messageBidirectional: true,
          sentCount: 3,
          receivedCount: 2,
          endorsementReceived: true,
          recommendationReceived: false,
          initiatedBy: "user" as const,
        },
      ],
      [
        "https://www.linkedin.com/in/bob",
        {
          messageCount: 0,
          lastMessageDate: null,
          messageBidirectional: false,
          sentCount: 0,
          receivedCount: 0,
          endorsementReceived: false,
          recommendationReceived: true,
          initiatedBy: null,
        },
      ],
    ]);

    const invitations = [
      { profileUrl: "https://www.linkedin.com/in/alice", direction: "sent" as const, sentAt: "2024-01-01" },
      { profileUrl: "https://www.linkedin.com/in/bob", direction: "received" as const, sentAt: "2024-02-01" },
    ];

    const summary = buildEnrichmentSummary(
      ["connections.csv", "messages.csv", "endorsements_received_info.csv"],
      enrichmentMap,
      invitations,
      20 // total message count
    );

    expect(summary.filesLoaded).toHaveLength(3);
    expect(summary.messageStats.totalMatched).toBe(1); // only alice has messages
    expect(summary.messageStats.totalUnmatched).toBe(19); // 20 - 1
    expect(summary.endorsementCount).toBe(1);
    expect(summary.recommendationCount).toBe(1);
    expect(summary.invitationStats.sentByUser).toBe(1);
    expect(summary.invitationStats.receivedByUser).toBe(1);
  });

  it("handles zero messages", () => {
    const enrichmentMap = new Map<string, {
      messageCount: number; lastMessageDate: string | null;
      messageBidirectional: boolean; sentCount: number; receivedCount: number;
      endorsementReceived: boolean; recommendationReceived: boolean;
      initiatedBy: "user" | "them" | null;
    }>();
    const summary = buildEnrichmentSummary(["connections.csv"], enrichmentMap, [], 0);
    expect(summary.messageStats.totalMatched).toBe(0);
    expect(summary.messageStats.totalUnmatched).toBe(0);
  });
});
