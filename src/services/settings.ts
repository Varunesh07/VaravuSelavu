import { getDatabase } from '../db';
import { ThemeMode } from '../store/themeStore';

export interface AppSettings {
  theme: ThemeMode;
  backup_folder_uri: string | null;
  last_backup_at: number | null;
  backup_reminder_dismissed: boolean;
  first_launch_prompted: boolean;
}

/**
 * Gets a string setting by key from SQLite settings table.
 */
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?;',
    key
  );
  return row ? row.value : null;
}

/**
 * Sets a string setting by key in SQLite settings table.
 */
export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    key,
    value
  );
}

/**
 * Removes a setting by key.
 */
export async function removeSetting(key: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM settings WHERE key = ?;', key);
}

/**
 * Retrieves all core app settings in a typed object.
 */
export async function getAllSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings;'
  );

  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(r.key, r.value);
  }

  const rawTheme = map.get('theme');
  const theme: ThemeMode =
    rawTheme === 'light' || rawTheme === 'dark' || rawTheme === 'system'
      ? rawTheme
      : 'system';

  const rawLastBackup = map.get('last_backup_at');
  const last_backup_at = rawLastBackup ? parseInt(rawLastBackup, 10) : null;

  return {
    theme,
    backup_folder_uri: map.get('backup_folder_uri') || null,
    last_backup_at: !isNaN(last_backup_at as number) ? last_backup_at : null,
    backup_reminder_dismissed: map.get('backup_reminder_dismissed') === '1',
    first_launch_prompted: map.get('first_launch_prompted') === '1',
  };
}
