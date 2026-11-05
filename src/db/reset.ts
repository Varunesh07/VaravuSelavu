import { getDatabase } from './index';
import { DEFAULT_CATEGORIES } from '../constants';
import { getSetting } from '../services/settings';

/**
 * Resets all user data in a single transactional SQLite operation:
 * - Deletes all messages and chats
 * - Deletes all transactions
 * - Deletes and re-seeds default categories
 * - Clears non-essential settings while preserving 'theme' and 'backup_folder_uri'
 * - Groq key in SecureStore is preserved
 * - Never triggers auto-backup on the wiped database
 */
export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();

  // Read preserved settings before wipe
  const preservedTheme = await getSetting('theme');
  const preservedFolder = await getSetting('backup_folder_uri');

  await db.withTransactionAsync(async () => {
    // 1. Clear chat tables
    await db.execAsync('DELETE FROM messages;');
    await db.execAsync('DELETE FROM chats;');

    // 2. Clear transactions
    await db.execAsync('DELETE FROM transactions;');

    // 3. Clear and re-seed categories
    await db.execAsync('DELETE FROM categories;');
    for (const cat of DEFAULT_CATEGORIES) {
      await db.runAsync(
        `INSERT INTO categories (name, type, icon, color, sort_order, hidden)
         VALUES (?, ?, ?, ?, ?, 0);`,
        cat.name,
        cat.type,
        cat.icon,
        cat.color,
        cat.sortOrder
      );
    }

    // 4. Reset settings table except preserved keys
    await db.execAsync('DELETE FROM settings;');
    if (preservedTheme) {
      await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?);', 'theme', preservedTheme);
    }
    if (preservedFolder) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?);',
        'backup_folder_uri',
        preservedFolder
      );
    }
  });
}

