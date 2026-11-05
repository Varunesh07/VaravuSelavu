import * as SQLite from 'expo-sqlite';
import { CURRENT_SCHEMA_VERSION, SCHEMA_V1_STATEMENTS } from './schema';
import { DEFAULT_CATEGORIES } from '../constants';

const DB_NAME = 'varavuselavu.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Gets or initializes the SQLite database instance.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    // Enforce WAL mode and foreign keys on open
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');

    await runMigrations(db);

    dbInstance = db;
    return db;
  })();

  return initPromise;
}

/**
 * Runs sequential transactional migrations using PRAGMA user_version.
 */
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    // Migration v1
    await db.withTransactionAsync(async () => {
      for (const statement of SCHEMA_V1_STATEMENTS) {
        await db.execAsync(statement);
      }
      await seedDefaultCategories(db);
      await db.execAsync(`PRAGMA user_version = 1;`);
    });
  }

  // Future migrations:
  // if (currentVersion < 2) { ... PRAGMA user_version = 2; }
}

/**
 * Seeds default categories if categories table is empty.
 */
async function seedDefaultCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  const existingCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories;'
  );

  if ((existingCount?.count ?? 0) === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (name, type, icon, color, sort_order, hidden)
         VALUES (?, ?, ?, ?, ?, 0);`,
        cat.name,
        cat.type,
        cat.icon,
        cat.color,
        cat.sortOrder
      );
    }
  }
}

