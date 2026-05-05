/**
 * Migration: localStorage v2/v3 → IndexedDB
 *
 * Runs once on first load. If localStorage has data and IndexedDB is empty,
 * migrates all connections and settings to IndexedDB, then removes the
 * localStorage key to avoid double-loading.
 */

import { getDB, saveFullState, type PersistedState } from "./localDB";
import type { Connection, GapAnalysis } from "./tieStrength";

const STORAGE_KEY = "navox-network-data";
const MIGRATION_FLAG = "navox-migrated-to-idb";

export async function migrateFromLocalStorage(): Promise<PersistedState | null> {
  // Already migrated
  if (localStorage.getItem(MIGRATION_FLAG) === "true") return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  // Check if IndexedDB already has data (another tab may have migrated)
  const db = getDB();
  const existingCount = await db.connections.count();
  if (existingCount > 0) {
    localStorage.setItem(MIGRATION_FLAG, "true");
    return null;
  }

  try {
    const stored = JSON.parse(raw);
    if (!stored.connections?.length) return null;

    const state: PersistedState = {
      connections: stored.connections as Connection[],
      gapAnalysis: stored.gapAnalysis as GapAnalysis,
      uploadedAt: stored.uploadedAt || new Date().toISOString(),
      displayFilename: stored.displayFilename || "LinkedIn Export",
      enrichment: stored.enrichment || undefined,
      schemaVersion: 3,
    };

    // Tag existing connections with linkedin_csv source if not already tagged
    for (const conn of state.connections) {
      if (!conn.source) {
        conn.source = "linkedin_csv";
        conn.sources = ["linkedin_csv"];
      }
    }

    await saveFullState(state);

    // Mark migration complete and clean up localStorage
    localStorage.setItem(MIGRATION_FLAG, "true");
    localStorage.removeItem(STORAGE_KEY);

    return state;
  } catch (e) {
    console.warn("Migration from localStorage failed:", e);
    return null;
  }
}
