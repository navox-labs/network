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
        DATE: "2024-06-01",
        FOLDER: "INBOX",
      },
    ];

    const messages = parseMessages(rows);
    expect(messages).toHaveLength(1);
    expect(messages[0].senderProfileUrl).toBe("https://www.linkedin.com/in/alice");
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
        Date: "2024-06-01",
        Folder: "Inbox",
      },
    ];

    const messages = parseMessages(rows);
    expect(messages).toHaveLength(1);
    expect(messages[0].direction).toBe("received");
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
  it("matches messages to connections by URL", () => {
    const connections = [
      makeConnection({ id: "1", url: "https://www.linkedin.com/in/alice" }),
      makeConnection({ id: "2", url: "https://www.linkedin.com/in/bob" }),
    ];

    const messages: MessageRecord[] = [
      { senderProfileUrl: "https://www.linkedin.com/in/alice", date: "2024-06-01", direction: "received" },
      { senderProfileUrl: "https://www.linkedin.com/in/alice", date: "2024-06-15", direction: "sent" },
      { senderProfileUrl: "https://www.linkedin.com/in/unknown", date: "2024-06-01", direction: "received" },
    ];

    const result = matchMessagesToConnections(messages, connections);
    expect(result.size).toBe(1); // only alice matched
    const alice = result.get("https://www.linkedin.com/in/alice");
    expect(alice).toBeDefined();
    expect(alice!.totalCount).toBe(2);
    expect(alice!.sentCount).toBe(1);
    expect(alice!.receivedCount).toBe(1);
    expect(alice!.bidirectional).toBe(true);
    expect(alice!.lastDate).toBe("2024-06-15");
  });

  it("handles URL normalization differences", () => {
    const connections = [
      makeConnection({ id: "1", url: "https://www.linkedin.com/in/alice/" }),
    ];

    const messages: MessageRecord[] = [
      { senderProfileUrl: "https://www.linkedin.com/in/alice", date: "2024-06-01", direction: "received" },
    ];

    const result = matchMessagesToConnections(messages, connections);
    expect(result.size).toBe(1);
  });

  it("returns empty map when no messages match", () => {
    const connections = [
      makeConnection({ id: "1", url: "https://www.linkedin.com/in/alice" }),
    ];

    const messages: MessageRecord[] = [
      { senderProfileUrl: "https://www.linkedin.com/in/stranger", date: "2024-06-01", direction: "received" },
    ];

    const result = matchMessagesToConnections(messages, connections);
    expect(result.size).toBe(0);
  });

  it("tracks one-way messages correctly (not bidirectional)", () => {
    const connections = [
      makeConnection({ id: "1", url: "https://www.linkedin.com/in/alice" }),
    ];

    const messages: MessageRecord[] = [
      { senderProfileUrl: "https://www.linkedin.com/in/alice", date: "2024-06-01", direction: "received" },
      { senderProfileUrl: "https://www.linkedin.com/in/alice", date: "2024-06-02", direction: "received" },
    ];

    const result = matchMessagesToConnections(messages, connections);
    const alice = result.get("https://www.linkedin.com/in/alice");
    expect(alice!.bidirectional).toBe(false);
    expect(alice!.receivedCount).toBe(2);
    expect(alice!.sentCount).toBe(0);
  });

  it("skips connections without URL", () => {
    const connections = [
      makeConnection({ id: "1", url: undefined }),
    ];

    const messages: MessageRecord[] = [
      { senderProfileUrl: "https://www.linkedin.com/in/alice", date: "2024-06-01", direction: "received" },
    ];

    const result = matchMessagesToConnections(messages, connections);
    expect(result.size).toBe(0);
  });
});

// ── computeConnectionEnrichments ────────────────────────────────────────

describe("computeConnectionEnrichments", () => {
  it("combines messages, endorsements, recommendations, and invitations", () => {
    const connections = [
      makeConnection({ id: "1", url: "https://www.linkedin.com/in/alice" }),
      makeConnection({ id: "2", url: "https://www.linkedin.com/in/bob" }),
    ];

    const messages: MessageRecord[] = [
      { senderProfileUrl: "https://www.linkedin.com/in/alice", date: "2024-06-01", direction: "received" },
      { senderProfileUrl: "https://www.linkedin.com/in/alice", date: "2024-06-15", direction: "sent" },
    ];

    const endorsements = [
      { endorserProfileUrl: "https://www.linkedin.com/in/alice", skillName: "Python" },
    ];

    const recommendations = [
      { recommenderProfileUrl: "https://www.linkedin.com/in/bob" },
    ];

    const invitations = [
      { profileUrl: "https://www.linkedin.com/in/alice", direction: "sent" as const, sentAt: "2024-01-01" },
    ];

    const result = computeConnectionEnrichments(messages, endorsements, recommendations, invitations, connections);

    const alice = result.get("https://www.linkedin.com/in/alice");
    expect(alice).toBeDefined();
    expect(alice!.messageCount).toBe(2);
    expect(alice!.messageBidirectional).toBe(true);
    expect(alice!.endorsementReceived).toBe(true);
    expect(alice!.initiatedBy).toBe("user");

    const bob = result.get("https://www.linkedin.com/in/bob");
    expect(bob).toBeDefined();
    expect(bob!.messageCount).toBe(0);
    expect(bob!.recommendationReceived).toBe(true);
  });

  it("returns empty map when no enrichment data matches", () => {
    const connections = [
      makeConnection({ id: "1", url: "https://www.linkedin.com/in/alice" }),
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
      invitations
    );

    expect(summary.filesLoaded).toHaveLength(3);
    expect(summary.messageStats.totalMatched).toBe(1); // only alice has messages
    expect(summary.endorsementCount).toBe(1);
    expect(summary.recommendationCount).toBe(1);
    expect(summary.invitationStats.sentByUser).toBe(1);
    expect(summary.invitationStats.receivedByUser).toBe(1);
  });
});
