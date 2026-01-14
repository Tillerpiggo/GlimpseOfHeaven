/**
 * Storage service for rhythm data and audio files
 * Handles localStorage for rhythm data and IndexedDB for audio files
 */

import type { RhythmData, PatternData } from "@/types";
import { generateId } from "@/utils/id";
import { DEFAULT_SUBDIVISIONS, DEFAULT_PATTERN_LENGTHS, DEFAULT_EFFECT_SUBDIVISIONS, DEFAULT_EFFECT_PATTERN_LENGTHS } from "@/constants";

// IndexedDB configuration
const DB_NAME = "orbitalCirclesDB";
const DB_VERSION = 1;
const AUDIO_STORE = "audioFiles";

// LocalStorage key
const RHYTHMS_KEY = "orbitalRhythms";

/**
 * Open the IndexedDB database
 */
export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: "id" });
      }
    };
  });
}

/**
 * Save audio file to IndexedDB
 */
export async function saveAudioToDB(
  id: string,
  audioBlob: Blob,
  fileName: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readwrite");
    const store = transaction.objectStore(AUDIO_STORE);
    const request = store.put({
      id,
      blob: audioBlob,
      fileName,
      timestamp: Date.now(),
    });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Load audio file from IndexedDB
 */
export async function loadAudioFromDB(
  id: string
): Promise<{ blob: Blob; fileName: string } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readonly");
    const store = transaction.objectStore(AUDIO_STORE);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (request.result) {
        resolve({ blob: request.result.blob, fileName: request.result.fileName });
      } else {
        resolve(null);
      }
    };
  });
}

/**
 * Delete audio file from IndexedDB
 */
export async function deleteAudioFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readwrite");
    const store = transaction.objectStore(AUDIO_STORE);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Load all saved rhythms from localStorage
 */
export function loadRhythms(): RhythmData[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(RHYTHMS_KEY);
  return saved ? JSON.parse(saved) : [];
}

/**
 * Save all rhythms to localStorage
 */
export function saveRhythms(rhythms: RhythmData[]): void {
  localStorage.setItem(RHYTHMS_KEY, JSON.stringify(rhythms));
}

/**
 * Migrate a single pattern to include new fields
 */
function migratePattern(pattern: PatternData): PatternData {
  return {
    ...pattern,
    instrument: pattern.instrument || "orbital",
    rotationEnabledPattern: pattern.rotationEnabledPattern || Array(16).fill(false),
    rotationDirectionPattern: pattern.rotationDirectionPattern || Array(16).fill(false),
    effectSubdivisions: pattern.effectSubdivisions || { ...DEFAULT_EFFECT_SUBDIVISIONS },
    effectPatternLengths: pattern.effectPatternLengths || { ...DEFAULT_EFFECT_PATTERN_LENGTHS },
  };
}

/**
 * Migrate old rhythm data to new format (converts legacy patterns to PatternData)
 * This handles backwards compatibility with older saved rhythms
 */
export function migrateRhythmData(rhythm: RhythmData): RhythmData {
  if (rhythm.patterns && rhythm.patterns.length > 0) {
    // Migrate existing patterns to add new fields
    const migratedPatterns = rhythm.patterns.map(migratePattern);
    // Migrate arrangement clips to use stack instead of track
    const migratedArrangement = rhythm.arrangement.map(clip => ({
      ...clip,
      stack: (clip as { track?: number }).track ?? clip.stack ?? 0,
    }));
    return {
      ...rhythm,
      patterns: migratedPatterns,
      arrangement: migratedArrangement,
    };
  }

  // Create a pattern from legacy fields
  const legacyPattern: PatternData = {
    id: generateId(),
    name: "Pattern 1",
    bars: 4,
    instrument: "orbital",
    directionPattern: rhythm.directionPattern || Array(16).fill(false),
    circles1VisiblePattern: rhythm.circles1VisiblePattern || Array(16).fill(true),
    circles2VisiblePattern: rhythm.circles2VisiblePattern || Array(16).fill(true),
    circles1PositionPattern: rhythm.circles1PositionPattern || Array(16).fill(false),
    circles2PositionPattern: rhythm.circles2PositionPattern || Array(16).fill(false),
    circlesGrowthPattern: rhythm.circlesGrowthPattern || Array(16).fill(false),
    tilt3DPattern: rhythm.tilt3DPattern || Array(16).fill(false),
    rotationEnabledPattern: Array(16).fill(false),
    rotationDirectionPattern: Array(16).fill(false),
    flipYPattern: Array(16).fill(false),
    subdivisions: rhythm.subdivisions || { ...DEFAULT_SUBDIVISIONS },
    effectSubdivisions: { ...DEFAULT_EFFECT_SUBDIVISIONS },
    patternLengths: rhythm.patternLengths || { ...DEFAULT_PATTERN_LENGTHS },
    effectPatternLengths: { ...DEFAULT_EFFECT_PATTERN_LENGTHS },
  };

  return {
    ...rhythm,
    patterns: [legacyPattern],
    arrangement: [
      { id: generateId(), patternId: legacyPattern.id, startBar: 0, length: 4, stack: 0 },
    ],
  };
}
