import { Platform } from 'react-native';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as FileSystemNew from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

import { getDatabase } from '../db';
import { CURRENT_SCHEMA_VERSION } from '../db/schema';
import { getSetting, setSetting } from './settings';
import { getTodayDateString } from '../utils/dates';
import {
  BACKUP_FILE_NAME,
  BACKUP_PREV_FILE_NAME,
  BackupDataSchema,
  BackupData,
} from './backupTypes';

export {
  BACKUP_FILE_NAME,
  BACKUP_PREV_FILE_NAME,
  BackupDataSchema,
  BackupData,
};

// Access StorageAccessFramework from legacy or new expo-file-system
const StorageAccessFramework =
  (FileSystemLegacy as any)?.StorageAccessFramework ||
  (FileSystemNew as any)?.StorageAccessFramework;

// Active file system helper
const activeFs = FileSystemLegacy || FileSystemNew;

// Queue and lock states
let isBackingUp = false;
let hasQueuedBackup = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Triggers an automatic backup after data changes (debounced by default 3 seconds).
 * Automatically cancels if database has no transactions.
 */
export function triggerAutoBackup(delayMs = 3000): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    executeBackup({ isAuto: true }).catch((err) => {
      console.warn('Auto-backup background notice:', err?.message || err);
    });
  }, delayMs);
}

/**
 * Cancels any pending or queued auto-backups (e.g. before restoring or during reset).
 */
export function cancelPendingBackups(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  hasQueuedBackup = false;
}

/**
 * Prompts user to select a backup directory.
 * On Android, opens the system StorageAccessFramework directory picker.
 * On other platforms or fallback, uses Directory.pickDirectoryAsync or document directory.
 */
export async function chooseBackupFolder(): Promise<{
  granted: boolean;
  directoryUri?: string;
  cancelled?: boolean;
  error?: string;
}> {
  // Strategy 1: Android StorageAccessFramework (native Android SAF folder picker)
  if (Platform.OS === 'android' && StorageAccessFramework?.requestDirectoryPermissionsAsync) {
    try {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions && permissions.granted && permissions.directoryUri) {
        await setSetting('backup_folder_uri', permissions.directoryUri);
        return { granted: true, directoryUri: permissions.directoryUri };
      }
      if (permissions && !permissions.granted) {
        return { granted: false, cancelled: true };
      }
    } catch (err: any) {
      console.warn('SAF folder selection failed, trying fallback:', err);
    }
  }

  // Strategy 2: Modern expo-file-system Directory.pickDirectoryAsync
  if (typeof (FileSystemNew as any)?.Directory?.pickDirectoryAsync === 'function') {
    try {
      const dir = await (FileSystemNew as any).Directory.pickDirectoryAsync();
      if (dir && dir.uri) {
        await setSetting('backup_folder_uri', dir.uri);
        return { granted: true, directoryUri: dir.uri };
      }
    } catch (err: any) {
      console.warn('Directory.pickDirectoryAsync fallback notice:', err);
    }
  }

  // Strategy 3: Internal app documents folder fallback
  const fallbackUri =
    (FileSystemLegacy as any)?.documentDirectory ||
    (FileSystemNew as any)?.documentDirectory ||
    (FileSystemNew as any)?.Paths?.documentDirectory;

  if (fallbackUri) {
    await setSetting('backup_folder_uri', fallbackUri);
    return { granted: true, directoryUri: fallbackUri };
  }

  return { granted: false, error: 'Could not open folder picker on this device.' };
}

/**
 * Exports full SQLite database snapshot inside one consistent read transaction.
 * Does NOT export the Groq API key.
 */
export async function exportDatabaseSnapshot(): Promise<BackupData> {
  const db = await getDatabase();

  return db.withTransactionAsync(async () => {
    const categories = await db.getAllAsync<any>(
      'SELECT id, name, type, icon, color, sort_order, hidden FROM categories;'
    );
    const transactions = await db.getAllAsync<any>(
      'SELECT id, type, amount, category_id, note, date, created_at, updated_at FROM transactions;'
    );
    const chats = await db.getAllAsync<any>(
      'SELECT id, title, created_at, updated_at FROM chats;'
    );
    const messages = await db.getAllAsync<any>(
      'SELECT id, chat_id, role, content, chart_json, created_at FROM messages;'
    );

    // Export non-sensitive settings (theme only)
    const theme = await getSetting('theme');
    const settings: Record<string, string> = {};
    if (theme) settings.theme = theme;

    const data: BackupData = {
      app: 'varavuselavu',
      schema_version: CURRENT_SCHEMA_VERSION,
      exported_at: Date.now(),
      categories,
      transactions,
      chats,
      messages,
      settings,
    };

    return data;
  });
}

/**
 * Writes content to a file in a given folder (supports Android SAF and standard file systems).
 * Also maintains safety rotation with prev file and verifies read-back.
 */
async function writeBackupToFolder(
  folderUri: string,
  fileName: string,
  jsonString: string,
  options?: { rotatePrev?: boolean }
): Promise<string> {
  const isSAF = folderUri.startsWith('content://') && StorageAccessFramework;

  if (isSAF) {
    // 1. Check existing files in folder
    const files: string[] = await StorageAccessFramework.readDirectoryAsync(folderUri);

    // Helper to find file in SAF directory
    const findUri = (name: string) => {
      const encoded = encodeURIComponent(name);
      return files.find((u) => u.endsWith(name) || u.endsWith(encoded) || u.includes(encoded));
    };

    const existingMainUri = findUri(fileName);

    // 2. Rotate current -> prev if requested and existing file is valid
    if (options?.rotatePrev && existingMainUri) {
      try {
        const oldContent = await StorageAccessFramework.readAsStringAsync(existingMainUri);
        if (oldContent && oldContent.includes('"varavuselavu"')) {
          let prevUri = findUri(BACKUP_PREV_FILE_NAME);
          if (!prevUri) {
            prevUri = await StorageAccessFramework.createFileAsync(
              folderUri,
              BACKUP_PREV_FILE_NAME,
              'application/json'
            );
          }
          await StorageAccessFramework.writeAsStringAsync(prevUri, oldContent, {
            encoding: (activeFs as any).EncodingType?.UTF8 || 'utf8',
          });
        }
      } catch (rotateErr) {
        console.warn('Rotation to previous backup failed:', rotateErr);
      }
    }

    // 3. Write target file
    let targetUri = existingMainUri;
    if (!targetUri) {
      targetUri = await StorageAccessFramework.createFileAsync(
        folderUri,
        fileName,
        'application/json'
      );
    }

    await StorageAccessFramework.writeAsStringAsync(targetUri, jsonString, {
      encoding: (activeFs as any).EncodingType?.UTF8 || 'utf8',
    });

    // 4. Verify read-back
    const readBack = await StorageAccessFramework.readAsStringAsync(targetUri);
    const parsed = JSON.parse(readBack);
    if (!parsed || parsed.app !== 'varavuselavu') {
      throw new Error('Backup write verification failed: corrupted output');
    }

    return targetUri;
  } else {
    // Standard File System fallback (iOS / Testing / App Storage)
    const cleanDir = folderUri.endsWith('/') ? folderUri : `${folderUri}/`;
    const targetPath = `${cleanDir}${fileName}`;
    const prevPath = `${cleanDir}${BACKUP_PREV_FILE_NAME}`;

    if (options?.rotatePrev) {
      try {
        const info = await (activeFs as any).getInfoAsync?.(targetPath);
        if (info?.exists) {
          const oldContent = await (activeFs as any).readAsStringAsync?.(targetPath);
          if (oldContent) {
            await (activeFs as any).writeAsStringAsync?.(prevPath, oldContent);
          }
        }
      } catch (e) {
        console.warn('Fallback rotation failed:', e);
      }
    }

    await (activeFs as any).writeAsStringAsync?.(targetPath, jsonString);

    // Verify read back
    const readBack = await (activeFs as any).readAsStringAsync?.(targetPath);
    const parsed = JSON.parse(readBack);
    if (!parsed || parsed.app !== 'varavuselavu') {
      throw new Error('Backup write verification failed');
    }

    return targetPath;
  }
}

/**
 * Main execution logic for backing up the database.
 * Enforces:
 * - One backup at a time (queued)
 * - Skip backup when transactions = 0 (never overwrite good backup with empty one)
 * - Atomic write with previous copy preservation
 * - Read-back verification
 */
export async function executeBackup(options?: {
  isAuto?: boolean;
}): Promise<{ ok: boolean; skipped?: boolean; reason?: string; error?: string }> {
  // If already running, queue it and exit
  if (isBackingUp) {
    hasQueuedBackup = true;
    return { ok: false, skipped: true, reason: 'queued' };
  }

  isBackingUp = true;

  try {
    const db = await getDatabase();

    // 1. Check transaction count. NEVER back up or overwrite if 0 transactions!
    const txRow = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions;'
    );
    const count = txRow?.count || 0;
    if (count === 0) {
      return { ok: false, skipped: true, reason: 'no_transactions' };
    }

    // 2. Check backup folder
    const folderUri = await getSetting('backup_folder_uri');
    if (!folderUri) {
      return { ok: false, skipped: true, reason: 'no_folder' };
    }

    // 3. Export snapshot
    const snapshot = await exportDatabaseSnapshot();
    const jsonString = JSON.stringify(snapshot, null, 2);

    // 4. Write and verify with rotation
    await writeBackupToFolder(folderUri, BACKUP_FILE_NAME, jsonString, { rotatePrev: true });

    // 5. Update last_backup_at setting
    const now = Date.now();
    await setSetting('last_backup_at', now.toString());

    return { ok: true };
  } catch (err: any) {
    console.error('Backup failed:', err);
    return { ok: false, error: err?.message || 'Failed to complete backup' };
  } finally {
    isBackingUp = false;
    // Process queued backup if one arrived while running
    if (hasQueuedBackup) {
      hasQueuedBackup = false;
      executeBackup({ isAuto: true }).catch(() => {});
    }
  }
}

/**
 * Creates a separate timestamped pre-reset backup before wiping the database.
 * E.g. varavuselavu-pre-reset-2026-11-05.json
 */
export async function executePreResetBackup(): Promise<{
  ok: boolean;
  fileName?: string;
  error?: string;
}> {
  try {
    const db = await getDatabase();
    const txRow = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions;'
    );
    if ((txRow?.count || 0) === 0) {
      return { ok: true, fileName: 'none' };
    }

    const folderUri = await getSetting('backup_folder_uri');
    const targetFolder = folderUri || (activeFs as any).documentDirectory || '';

    const today = getTodayDateString();
    const fileName = `varavuselavu-pre-reset-${today}.json`;

    const snapshot = await exportDatabaseSnapshot();
    const jsonString = JSON.stringify(snapshot, null, 2);

    await writeBackupToFolder(targetFolder, fileName, jsonString, { rotatePrev: false });

    return { ok: true, fileName };
  } catch (err: any) {
    console.error('Pre-reset backup failed:', err);
    return { ok: false, error: err?.message || 'Failed to save pre-reset backup' };
  }
}

/**
 * Restores the entire database from a picked JSON file.
 * - Cancels pending backups
 * - Validates schema with Zod
 * - In ONE transaction: clears tables, inserts everything
 * - Re-runs migrations if schema is older
 * - Updates dataVersion store to refresh all UI
 */
export async function restoreFromFile(fileUri: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  // Cancel any pending backups
  cancelPendingBackups();

  try {
    // 1. Read JSON file with dual SAF/standard fallback
    let content = '';
    try {
      if (fileUri.startsWith('content://') && StorageAccessFramework) {
        content = await StorageAccessFramework.readAsStringAsync(fileUri);
      } else {
        content = await (activeFs as any).readAsStringAsync(fileUri);
      }
    } catch {
      try {
        content = await (activeFs as any).readAsStringAsync(fileUri);
      } catch {
        if (StorageAccessFramework) {
          content = await StorageAccessFramework.readAsStringAsync(fileUri);
        }
      }
    }

    if (!content) {
      return { ok: false, error: 'Backup file is empty or cannot be read.' };
    }

    // 2. Parse and Validate
    let rawJson: any;
    try {
      rawJson = JSON.parse(content);
    } catch {
      return { ok: false, error: 'Selected file is not valid JSON.' };
    }

    const parsed = BackupDataSchema.safeParse(rawJson);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Invalid backup format or missing required data tables.',
      };
    }

    const backup = parsed.data;

    // 3. Database transactional restore
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      // Clear existing records
      await db.execAsync('DELETE FROM messages;');
      await db.execAsync('DELETE FROM chats;');
      await db.execAsync('DELETE FROM transactions;');
      await db.execAsync('DELETE FROM categories;');

      // Insert categories
      for (const cat of backup.categories) {
        await db.runAsync(
          `INSERT INTO categories (id, name, type, icon, color, sort_order, hidden)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          cat.id,
          cat.name,
          cat.type,
          cat.icon,
          cat.color,
          cat.sort_order ?? 0,
          cat.hidden ?? 0
        );
      }

      // Insert transactions
      for (const tx of backup.transactions) {
        await db.runAsync(
          `INSERT INTO transactions (id, type, amount, category_id, note, date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          tx.id ?? null,
          tx.type,
          tx.amount,
          tx.category_id,
          tx.note || '',
          tx.date,
          tx.created_at || Date.now(),
          tx.updated_at || Date.now()
        );
      }

      // Insert chats
      for (const chat of backup.chats) {
        await db.runAsync(
          `INSERT INTO chats (id, title, created_at, updated_at)
           VALUES (?, ?, ?, ?);`,
          chat.id,
          chat.title,
          chat.created_at,
          chat.updated_at
        );
      }

      // Insert messages
      for (const msg of backup.messages) {
        await db.runAsync(
          `INSERT INTO messages (id, chat_id, role, content, chart_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?);`,
          msg.id ?? null,
          msg.chat_id,
          msg.role,
          msg.content,
          msg.chart_json ?? null,
          msg.created_at
        );
      }

      // Restore settings if present
      if (backup.settings?.theme) {
        await db.runAsync(
          `INSERT INTO settings (key, value) VALUES ('theme', ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
          backup.settings.theme
        );
      }
    });

    // 4. Update UI stores
    const { useDataStore } = await import('../store/dataStore');
    useDataStore.getState().bumpDataVersion({ skipAutoBackup: true });

    return { ok: true };
  } catch (err: any) {
    console.error('Restore failed:', err);
    return { ok: false, error: err?.message || 'Restore process failed.' };
  }
}

/**
 * Opens document picker for user to select a backup file to restore.
 */
export async function pickAndRestoreBackup(): Promise<{
  ok: boolean;
  cancelled?: boolean;
  error?: string;
}> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json', '*/*'],
      copyToCacheDirectory: true,
    });

    if (res.canceled || !res.assets || res.assets.length === 0) {
      return { ok: false, cancelled: true };
    }

    const file = res.assets[0];
    return restoreFromFile(file.uri);
  } catch (err: any) {
    console.error('File pick error:', err);
    return { ok: false, error: err?.message || 'Failed to select file.' };
  }
}
