import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  PRINTANYWHERE_TEMP_DIRNAME,
  PRINTANYWHERE_TEMP_PREFIX,
  TEMP_CLEANUP_INTERVAL_MS,
  TEMP_FILE_TTL_MS,
} from "@/lib/printanywhere/constants";
import { secureLog } from "@/lib/printanywhere/log";
import { newId } from "@/lib/printanywhere/security";

export type TempResource = {
  resourceId: string;
  filePath: string;
  extension: string;
};

const tempRoot = path.join(os.tmpdir(), PRINTANYWHERE_TEMP_DIRNAME);

let startupCleanupDone = false;
let cleanupIntervalStarted = false;

async function ensureTempRoot() {
  await fs.mkdir(tempRoot, { recursive: true, mode: 0o700 });
}

function isManagedTempFile(fileName: string): boolean {
  return fileName.startsWith(PRINTANYWHERE_TEMP_PREFIX);
}

export async function initializeCleanupSubsystem() {
  await ensureTempRoot();

  if (!startupCleanupDone) {
    startupCleanupDone = true;
    await cleanupOrphanedFilesOnStartup();
  }

  if (!cleanupIntervalStarted) {
    cleanupIntervalStarted = true;
    setInterval(() => {
      void cleanupExpiredFiles();
    }, TEMP_CLEANUP_INTERVAL_MS).unref();
  }
}

export async function createTempResource(buffer: Buffer, extension: string): Promise<TempResource> {
  await ensureTempRoot();

  const resourceId = newId(PRINTANYWHERE_TEMP_PREFIX);
  const normalizedExt = extension.toLowerCase();
  const filePath = path.join(tempRoot, `${resourceId}.${normalizedExt}`);

  await fs.writeFile(filePath, buffer, { mode: 0o600 });

  return {
    resourceId,
    filePath,
    extension: normalizedExt,
  };
}

export async function deleteTempResource(filePath: string) {
  try {
    await fs.rm(filePath, { force: true });
    return true;
  } catch {
    return false;
  }
}

export async function verifyTempResourceDeleted(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return false;
  } catch {
    return true;
  }
}

export async function cleanupOrphanedFilesOnStartup() {
  try {
    const entries = await fs.readdir(tempRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !isManagedTempFile(entry.name)) continue;
      const filePath = path.join(tempRoot, entry.name);
      await fs.rm(filePath, { force: true });
    }
    secureLog("Startup orphan cleanup complete");
  } catch {
    secureLog("Startup orphan cleanup skipped");
  }
}

export async function cleanupExpiredFiles() {
  try {
    const now = Date.now();
    const entries = await fs.readdir(tempRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !isManagedTempFile(entry.name)) continue;
      const filePath = path.join(tempRoot, entry.name);
      const stat = await fs.stat(filePath);
      const ageMs = now - stat.mtimeMs;
      if (ageMs > TEMP_FILE_TTL_MS) {
        await fs.rm(filePath, { force: true });
      }
    }
  } catch {
    secureLog("Periodic cleanup pass skipped");
  }
}

export function getTempRootPath() {
  return tempRoot;
}
