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
 * - Endorsement_Received_Info.csv / Endorsements_Received_Info.csv (enrichment)
 * - Endorsement_Given_Info.csv / Endorsements_Given_Info.csv       (enrichment)
 * - Recommendations_Received.csv   (enrichment)
 * - Invitations.csv       (enrichment)
 */

import JSZip from "jszip";

const RECOGNIZED_FILES: string[] = [
  "connections.csv",
  "messages.csv",
  "positions.csv",
  "endorsement_received_info.csv",
  "endorsement_given_info.csv",
  "recommendations_received.csv",
  "invitations.csv",
];

/**
 * Map variant filenames to their canonical form.
 * LinkedIn exports use both singular and plural naming for endorsement files.
 */
const FILENAME_ALIASES: Record<string, string> = {
  "endorsements_received_info.csv": "endorsement_received_info.csv",
  "endorsements_given_info.csv": "endorsement_given_info.csv",
};

/** Max decompressed size per file: 10 MB */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Max total decompressed size across all files: 50 MB */
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

/**
 * Check if a filename (possibly nested in folders) matches a recognized
 * LinkedIn export file. Returns the canonical lowercase name or null.
 */
export function matchRecognizedFile(path: string): string | null {
  // Extract basename from path (zip entries may have folder prefixes)
  const basename = path.split("/").pop()?.split("\\").pop() || "";
  const lower = basename.toLowerCase();
  // Normalize variant filenames to canonical form
  const canonical = FILENAME_ALIASES[lower] ?? lower;
  return RECOGNIZED_FILES.includes(canonical) ? canonical : null;
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

  // Collect recognized entries and check reported sizes before decompressing
  const entries: { canonicalName: string; zipEntry: JSZip.JSZipObject }[] = [];
  let estimatedTotal = 0;

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;
    const canonical = matchRecognizedFile(relativePath);
    if (canonical) {
      // Guard: reject if reported uncompressed size exceeds per-file limit.
      // JSZip exposes _data.uncompressedSize for zip entries.
      const reportedSize = (zipEntry as unknown as Record<string, unknown>)._data
        ? ((zipEntry as unknown as Record<string, { uncompressedSize?: number }>)._data?.uncompressedSize ?? 0)
        : 0;
      if (reportedSize > MAX_FILE_BYTES) {
        throw new Error(`File "${relativePath}" exceeds 10 MB limit (${Math.round(reportedSize / 1024 / 1024)} MB).`);
      }
      estimatedTotal += reportedSize;
      // Skip duplicates: first occurrence wins (H3 fix)
      if (!entries.some((e) => e.canonicalName === canonical)) {
        entries.push({ canonicalName: canonical, zipEntry });
      }
    }
  });

  if (estimatedTotal > MAX_TOTAL_BYTES) {
    throw new Error("Zip file exceeds maximum allowed size (50 MB decompressed).");
  }

  // Decompress with per-file AND total actual size verification
  let actualTotal = 0;
  for (const { canonicalName, zipEntry } of entries) {
    const content = await zipEntry.async("string");
    const contentBytes = content.length * 2; // JS strings are UTF-16 (2 bytes per char)
    if (contentBytes > MAX_FILE_BYTES) {
      throw new Error(
        `File "${canonicalName}" exceeds 10 MB limit (${Math.round(contentBytes / 1024 / 1024)} MB).`
      );
    }
    actualTotal += contentBytes;
    if (actualTotal > MAX_TOTAL_BYTES) {
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
  let totalBytes = 0;

  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    const canonical = matchRecognizedFile(path);
    if (canonical) {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(`File "${file.name}" exceeds 10 MB limit (${Math.round(file.size / 1024 / 1024)} MB).`);
      }
      totalBytes += file.size;
      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new Error("Total file size exceeds 50 MB limit.");
      }
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
  let totalBytes = 0;

  for (const file of files) {
    const canonical = matchRecognizedFile(file.name);
    if (canonical) {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(`File "${file.name}" exceeds 10 MB limit (${Math.round(file.size / 1024 / 1024)} MB).`);
      }
      totalBytes += file.size;
      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new Error("Total file size exceeds 50 MB limit.");
      }
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

  // positions.csv is recognized but has no parser yet — exclude from enrichment count
  const PARSEABLE_ENRICHMENT = ["messages.csv", "endorsement_received_info.csv", "endorsement_given_info.csv", "recommendations_received.csv", "invitations.csv"];
  return {
    loaded,
    missing,
    hasConnections: fileMap.has("connections.csv"),
    enrichmentFileCount: loaded.filter((f) => PARSEABLE_ENRICHMENT.includes(f)).length,
  };
}
