/**
 * File Ingestor — Navox Network
 *
 * Normalizes any upload input (zip, folder, loose CSVs) into a uniform
 * Map<filename, csvContent> for downstream parsing. All processing is
 * client-side — no data is sent to any server.
 *
 * Recognized LinkedIn export files (case-insensitive):
 * - Connections.csv       (required)
 * - messages.csv          (enrichment)
 * - Positions.csv         (enrichment)
 * - Endorsements_Received_Info.csv (enrichment)
 * - Recommendations_Received.csv   (enrichment)
 * - Invitations.csv       (enrichment)
 */

import JSZip from "jszip";

const RECOGNIZED_FILES: string[] = [
  "connections.csv",
  "messages.csv",
  "positions.csv",
  "endorsements_received_info.csv",
  "recommendations_received.csv",
  "invitations.csv",
];

/** Max decompressed zip size: 50 MB (zip bomb protection) */
const MAX_DECOMPRESSED_BYTES = 50 * 1024 * 1024;

/**
 * Check if a filename (possibly nested in folders) matches a recognized
 * LinkedIn export file. Returns the canonical lowercase name or null.
 */
export function matchRecognizedFile(path: string): string | null {
  // Extract basename from path (zip entries may have folder prefixes)
  const basename = path.split("/").pop()?.split("\\").pop() || "";
  const lower = basename.toLowerCase();
  return RECOGNIZED_FILES.includes(lower) ? lower : null;
}

/**
 * Determine the input type from a list of files.
 * - If any file ends in .zip → "zip"
 * - If any entry is a directory → "folder" (handled via webkitGetAsEntry)
 * - Otherwise → "files" (loose CSVs)
 */
export type InputType = "zip" | "folder" | "files";

export function detectInputType(files: File[]): InputType {
  for (const f of files) {
    if (f.name.toLowerCase().endsWith(".zip")) return "zip";
  }
  // Check for directory entries via webkitRelativePath
  for (const f of files) {
    if (f.webkitRelativePath && f.webkitRelativePath.includes("/")) {
      return "folder";
    }
  }
  return "files";
}

/**
 * Extract recognized CSV files from a zip archive.
 * Returns Map<canonicalFilename, csvContent>.
 */
export async function extractFromZip(zipFile: File): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const arrayBuffer = await zipFile.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Check total decompressed size (zip bomb protection)
  let totalSize = 0;
  const entries: { canonicalName: string; zipEntry: JSZip.JSZipObject }[] = [];

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;
    const canonical = matchRecognizedFile(relativePath);
    if (canonical) {
      entries.push({ canonicalName: canonical, zipEntry });
    }
  });

  for (const { canonicalName, zipEntry } of entries) {
    const content = await zipEntry.async("string");
    totalSize += content.length;
    if (totalSize > MAX_DECOMPRESSED_BYTES) {
      throw new Error("Zip file exceeds maximum allowed size (50 MB decompressed).");
    }
    result.set(canonicalName, content);
  }

  return result;
}

/**
 * Read recognized CSV files from a folder upload (webkitdirectory).
 * Files come with webkitRelativePath set.
 */
export async function extractFromFolder(files: File[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    const canonical = matchRecognizedFile(path);
    if (canonical) {
      const content = await file.text();
      result.set(canonical, content);
    }
  }

  return result;
}

/**
 * Read recognized CSV files from loose file drops.
 * Unrecognized files are silently ignored.
 */
export async function extractFromFiles(files: File[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  for (const file of files) {
    const canonical = matchRecognizedFile(file.name);
    if (canonical) {
      const content = await file.text();
      result.set(canonical, content);
    }
  }

  return result;
}

/**
 * Main entry point: accepts an array of Files and returns a Map of
 * recognized filename → CSV content. Handles zip, folder, and loose files.
 *
 * Never throws for unrecognized files — silently ignores them.
 * Throws only for: corrupt zip, zip bomb, or missing Connections.csv.
 */
export async function ingestFiles(files: File[]): Promise<Map<string, string>> {
  if (files.length === 0) {
    return new Map();
  }

  const inputType = detectInputType(files);

  let fileMap: Map<string, string>;

  switch (inputType) {
    case "zip": {
      const zipFile = files.find((f) => f.name.toLowerCase().endsWith(".zip"));
      if (!zipFile) return new Map();
      fileMap = await extractFromZip(zipFile);
      break;
    }
    case "folder":
      fileMap = await extractFromFolder(files);
      break;
    case "files":
      fileMap = await extractFromFiles(files);
      break;
  }

  return fileMap;
}

/**
 * Validate that the ingested file map contains the required Connections.csv.
 * Returns an error message or null if valid.
 */
export function validateFileMap(fileMap: Map<string, string>): string | null {
  if (!fileMap.has("connections.csv")) {
    return "No Connections.csv found. This file is required for network analysis.";
  }
  return null;
}

/**
 * Get a summary of which files were found and which are missing.
 */
export interface FilePresenceSummary {
  loaded: string[];
  missing: string[];
  hasConnections: boolean;
  enrichmentFileCount: number;
}

export function summarizeFiles(fileMap: Map<string, string>): FilePresenceSummary {
  const loaded: string[] = [];
  const missing: string[] = [];

  for (const file of RECOGNIZED_FILES) {
    if (fileMap.has(file)) {
      loaded.push(file);
    } else {
      missing.push(file);
    }
  }

  return {
    loaded,
    missing,
    hasConnections: fileMap.has("connections.csv"),
    enrichmentFileCount: loaded.filter((f) => f !== "connections.csv").length,
  };
}
