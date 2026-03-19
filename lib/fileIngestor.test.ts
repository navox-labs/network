import { describe, it, expect, vi } from "vitest";
import {
  matchRecognizedFile,
  detectInputType,
  extractFromFiles,
  extractFromFolder,
  extractFromZip,
  ingestFiles,
  validateFileMap,
  summarizeFiles,
} from "./fileIngestor";

// ── matchRecognizedFile ─────────────────────────────────────────────────

describe("matchRecognizedFile", () => {
  it("matches recognized files case-insensitively", () => {
    expect(matchRecognizedFile("Connections.csv")).toBe("connections.csv");
    expect(matchRecognizedFile("CONNECTIONS.CSV")).toBe("connections.csv");
    expect(matchRecognizedFile("messages.csv")).toBe("messages.csv");
    expect(matchRecognizedFile("Positions.csv")).toBe("positions.csv");
    expect(matchRecognizedFile("Endorsements_Received_Info.csv")).toBe("endorsements_received_info.csv");
    expect(matchRecognizedFile("Recommendations_Received.csv")).toBe("recommendations_received.csv");
    expect(matchRecognizedFile("Invitations.csv")).toBe("invitations.csv");
  });

  it("extracts basename from nested zip paths", () => {
    expect(matchRecognizedFile("Basic_LinkedInDataExport_03-18-2026/Connections.csv")).toBe("connections.csv");
    expect(matchRecognizedFile("export/subfolder/messages.csv")).toBe("messages.csv");
  });

  it("returns null for unrecognized files", () => {
    expect(matchRecognizedFile("profile.csv")).toBeNull();
    expect(matchRecognizedFile("README.txt")).toBeNull();
    expect(matchRecognizedFile("photo.jpg")).toBeNull();
    expect(matchRecognizedFile("")).toBeNull();
  });
});

// ── detectInputType ─────────────────────────────────────────────────────

describe("detectInputType", () => {
  const makeFile = (name: string, relativePath?: string): File => {
    const f = new File([""], name);
    if (relativePath) {
      Object.defineProperty(f, "webkitRelativePath", { value: relativePath });
    }
    return f;
  };

  it("detects zip files", () => {
    expect(detectInputType([makeFile("export.zip")])).toBe("zip");
    expect(detectInputType([makeFile("LinkedIn_Data.ZIP")])).toBe("zip");
  });

  it("detects folder uploads via webkitRelativePath", () => {
    expect(
      detectInputType([
        makeFile("Connections.csv", "export/Connections.csv"),
        makeFile("messages.csv", "export/messages.csv"),
      ])
    ).toBe("folder");
  });

  it("detects loose CSV files", () => {
    expect(
      detectInputType([
        makeFile("Connections.csv"),
        makeFile("messages.csv"),
      ])
    ).toBe("files");
  });

  it("zip takes priority over folder/files", () => {
    expect(
      detectInputType([
        makeFile("export.zip"),
        makeFile("Connections.csv"),
      ])
    ).toBe("zip");
  });
});

// ── extractFromFiles ────────────────────────────────────────────────────

describe("extractFromFiles", () => {
  const makeFile = (name: string, content: string): File => {
    return new File([content], name, { type: "text/csv" });
  };

  it("extracts recognized CSV files", async () => {
    const files = [
      makeFile("Connections.csv", "First Name,Last Name\nAlice,Smith"),
      makeFile("messages.csv", "SENDER PROFILE URL,DATE\nhttps://linkedin.com/in/alice,2024-01-01"),
    ];

    const result = await extractFromFiles(files);
    expect(result.size).toBe(2);
    expect(result.has("connections.csv")).toBe(true);
    expect(result.has("messages.csv")).toBe(true);
    expect(result.get("connections.csv")).toContain("Alice");
  });

  it("silently ignores unrecognized files", async () => {
    const files = [
      makeFile("Connections.csv", "data"),
      makeFile("photo.jpg", "binary"),
      makeFile("README.txt", "hello"),
    ];

    const result = await extractFromFiles(files);
    expect(result.size).toBe(1);
    expect(result.has("connections.csv")).toBe(true);
  });

  it("handles empty file list", async () => {
    const result = await extractFromFiles([]);
    expect(result.size).toBe(0);
  });
});

// ── extractFromFolder ───────────────────────────────────────────────────

describe("extractFromFolder", () => {
  it("extracts files using webkitRelativePath", async () => {
    const f1 = new File(["conn data"], "Connections.csv");
    Object.defineProperty(f1, "webkitRelativePath", { value: "export/Connections.csv" });

    const f2 = new File(["msg data"], "messages.csv");
    Object.defineProperty(f2, "webkitRelativePath", { value: "export/messages.csv" });

    const f3 = new File(["ignored"], "photo.jpg");
    Object.defineProperty(f3, "webkitRelativePath", { value: "export/photo.jpg" });

    const result = await extractFromFolder([f1, f2, f3]);
    expect(result.size).toBe(2);
    expect(result.get("connections.csv")).toBe("conn data");
    expect(result.get("messages.csv")).toBe("msg data");
  });
});

// ── extractFromZip ──────────────────────────────────────────────────────

describe("extractFromZip", () => {
  it("extracts recognized files from a zip", async () => {
    // Create a real zip using JSZip
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("Connections.csv", "First Name,Last Name\nAlice,Smith");
    zip.file("messages.csv", "SENDER PROFILE URL\nhttps://linkedin.com/in/alice");
    zip.file("README.txt", "This is not a CSV");
    zip.file("photo.jpg", "fake binary");

    const blob = await zip.generateAsync({ type: "blob" });
    const zipFile = new File([blob], "export.zip", { type: "application/zip" });

    const result = await extractFromZip(zipFile);
    expect(result.size).toBe(2);
    expect(result.has("connections.csv")).toBe(true);
    expect(result.has("messages.csv")).toBe(true);
    expect(result.get("connections.csv")).toContain("Alice");
  });

  it("handles nested folder structure in zip", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("Basic_LinkedInDataExport_03-18-2026/Connections.csv", "data");
    zip.file("Basic_LinkedInDataExport_03-18-2026/messages.csv", "msg data");

    const blob = await zip.generateAsync({ type: "blob" });
    const zipFile = new File([blob], "export.zip");

    const result = await extractFromZip(zipFile);
    expect(result.size).toBe(2);
    expect(result.has("connections.csv")).toBe(true);
    expect(result.has("messages.csv")).toBe(true);
  });

  it("silently ignores unrecognized files in zip", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("Connections.csv", "data");
    zip.file("SomeOtherFile.csv", "other data");
    zip.file("profile.pdf", "pdf binary");

    const blob = await zip.generateAsync({ type: "blob" });
    const zipFile = new File([blob], "export.zip");

    const result = await extractFromZip(zipFile);
    expect(result.size).toBe(1);
  });
});

// ── ingestFiles ─────────────────────────────────────────────────────────

describe("ingestFiles", () => {
  it("returns empty map for empty input", async () => {
    const result = await ingestFiles([]);
    expect(result.size).toBe(0);
  });

  it("handles loose CSV files", async () => {
    const files = [
      new File(["conn data"], "Connections.csv"),
      new File(["msg data"], "messages.csv"),
    ];
    const result = await ingestFiles(files);
    expect(result.size).toBe(2);
  });

  it("handles zip files", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("Connections.csv", "conn data");
    const blob = await zip.generateAsync({ type: "blob" });
    const zipFile = new File([blob], "export.zip");

    const result = await ingestFiles([zipFile]);
    expect(result.size).toBe(1);
    expect(result.get("connections.csv")).toBe("conn data");
  });
});

// ── validateFileMap ─────────────────────────────────────────────────────

describe("validateFileMap", () => {
  it("returns null when connections.csv is present", () => {
    const map = new Map([["connections.csv", "data"]]);
    expect(validateFileMap(map)).toBeNull();
  });

  it("returns error when connections.csv is missing", () => {
    const map = new Map([["messages.csv", "data"]]);
    expect(validateFileMap(map)).toContain("Connections.csv");
  });

  it("returns error for empty map", () => {
    expect(validateFileMap(new Map())).toContain("Connections.csv");
  });
});

// ── summarizeFiles ──────────────────────────────────────────────────────

describe("summarizeFiles", () => {
  it("correctly summarizes loaded and missing files", () => {
    const map = new Map([
      ["connections.csv", "data"],
      ["messages.csv", "data"],
    ]);
    const summary = summarizeFiles(map);

    expect(summary.hasConnections).toBe(true);
    expect(summary.loaded).toContain("connections.csv");
    expect(summary.loaded).toContain("messages.csv");
    expect(summary.missing).toContain("positions.csv");
    expect(summary.missing).toContain("endorsements_received_info.csv");
    expect(summary.enrichmentFileCount).toBe(1); // messages only
  });

  it("reports zero enrichment for connections-only", () => {
    const map = new Map([["connections.csv", "data"]]);
    const summary = summarizeFiles(map);
    expect(summary.enrichmentFileCount).toBe(0);
    expect(summary.hasConnections).toBe(true);
  });
});
