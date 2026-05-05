/**
 * Navox Network — IndexedDB Storage (Dexie.js)
 *
 * Replaces localStorage for connection data. Supports 11K+ connections
 * without hitting the ~5MB localStorage limit.
 *
 * All data stays in the user's browser. Never sent to any server.
 */

import Dexie, { type Table } from "dexie";
import type { Connection, GapAnalysis } from "./tieStrength";
import type { ImportBatch } from "./types";

export interface SettingsRecord {
  key: string;
  value: unknown;
}

export class NavoxDB extends Dexie {
  connections!: Table<Connection, string>;
  imports!: Table<ImportBatch, string>;
  settings!: Table<SettingsRecord, string>;

  constructor() {
    super("navox-network");
    this.version(1).stores({
      connections: "id, source, status, [firstName+lastName+company]",
      imports: "id, source, importedAt",
      settings: "key",
    });
  }
}

let dbInstance: NavoxDB | null = null;

export function getDB(): NavoxDB {
  if (!dbInstance) {
    dbInstance = new NavoxDB();
  }
  return dbInstance;
}

// ── Settings helpers ──────────────────────────────────────────────────────

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = getDB();
  const record = await db.settings.get(key);
  return record?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = getDB();
  await db.settings.put({ key, value });
}

export async function deleteSetting(key: string): Promise<void> {
  const db = getDB();
  await db.settings.delete(key);
}

// ── Connection helpers ────────────────────────────────────────────────────

export async function saveConnections(connections: Connection[]): Promise<void> {
  const db = getDB();
  await db.connections.clear();
  await db.connections.bulkPut(connections);
}

export async function loadConnections(): Promise<Connection[]> {
  const db = getDB();
  return db.connections.toArray();
}

export async function updateConnection(id: string, changes: Partial<Connection>): Promise<void> {
  const db = getDB();
  await db.connections.update(id, changes);
}

export async function clearAllData(): Promise<void> {
  const db = getDB();
  await db.connections.clear();
  await db.imports.clear();
  await db.settings.clear();
}

// ── Import batch helpers ──────────────────────────────────────────────────

export async function saveImportBatch(batch: ImportBatch): Promise<void> {
  const db = getDB();
  await db.imports.put(batch);
}

export async function loadImportBatches(): Promise<ImportBatch[]> {
  const db = getDB();
  return db.imports.toArray();
}

// ── Full state persistence (replaces localStorage payload) ────────────────

export interface PersistedState {
  connections: Connection[];
  gapAnalysis: GapAnalysis;
  uploadedAt: string;
  displayFilename: string;
  enrichment?: unknown;
  schemaVersion: number;
}

export async function saveFullState(state: PersistedState): Promise<void> {
  const db = getDB();
  await db.transaction("rw", [db.connections, db.settings], async () => {
    await db.connections.clear();
    await db.connections.bulkPut(state.connections);
    await db.settings.put({ key: "gapAnalysis", value: state.gapAnalysis });
    await db.settings.put({ key: "uploadedAt", value: state.uploadedAt });
    await db.settings.put({ key: "displayFilename", value: state.displayFilename });
    await db.settings.put({ key: "schemaVersion", value: state.schemaVersion });
    if (state.enrichment) {
      await db.settings.put({ key: "enrichment", value: state.enrichment });
    }
  });
}

export async function loadFullState(): Promise<PersistedState | null> {
  const db = getDB();
  const connections = await db.connections.toArray();
  if (connections.length === 0) return null;

  const gapAnalysis = await getSetting<GapAnalysis>("gapAnalysis");
  const uploadedAt = await getSetting<string>("uploadedAt");
  const displayFilename = await getSetting<string>("displayFilename");
  const enrichment = await getSetting<unknown>("enrichment");
  const schemaVersion = await getSetting<number>("schemaVersion");

  if (!gapAnalysis) return null;

  return {
    connections,
    gapAnalysis,
    uploadedAt: uploadedAt || new Date().toISOString(),
    displayFilename: displayFilename || "LinkedIn Export",
    enrichment: enrichment || undefined,
    schemaVersion: schemaVersion || 3,
  };
}
