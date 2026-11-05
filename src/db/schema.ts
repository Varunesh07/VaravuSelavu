/**
 * SQLite Database Schema and Versioning for Varavuselavu.
 */

export const CURRENT_SCHEMA_VERSION = 1;

export const SCHEMA_V1_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('in','out')),
    icon       TEXT NOT NULL,
    color      TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    hidden     INTEGER NOT NULL DEFAULT 0,
    UNIQUE (name, type)
  );`,

  `CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL CHECK (type IN ('in','out')),
    amount      INTEGER NOT NULL CHECK (amount > 0),   -- stored in paise
    category_id INTEGER NOT NULL REFERENCES categories(id),
    note        TEXT NOT NULL DEFAULT '',
    date        TEXT NOT NULL,                          -- 'YYYY-MM-DD'
    created_at  INTEGER NOT NULL,                       -- unix ms
    updated_at  INTEGER NOT NULL
  );`,

  `CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);`,
  `CREATE INDEX IF NOT EXISTS idx_tx_cat_date ON transactions(category_id, date);`,

  `CREATE TABLE IF NOT EXISTS chats (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL DEFAULT 'New chat',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id    INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
    content    TEXT NOT NULL,
    chart_json TEXT,                                    -- validated chart spec + snapshot
    created_at INTEGER NOT NULL
  );`,

  `CREATE INDEX IF NOT EXISTS idx_msg_chat ON messages(chat_id, id);`,

  `CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
];
