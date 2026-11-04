# 03 — Database and Backup

Engine: SQLite via `expo-sqlite`. Database file name: `varavuselavu.db`. Run `PRAGMA journal_mode = WAL;` and `PRAGMA foreign_keys = ON;` on open.

## Migrations
Keep `PRAGMA user_version`. On startup, run migrations in order (v1 → v2 → v3 …) until `user_version` equals the latest. Never edit an old migration; add a new one. This is what keeps data safe across app updates.

Migration rules:
- Run each migration inside its own transaction. Update `user_version` only after the transaction succeeds.
- Never delete user data in a migration.
- A backup exported from an older schema version must restore successfully into a newer app (the app runs the needed migrations after restoring).

## Tables (version 1)

```sql
CREATE TABLE categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('in','out')),
  icon       TEXT NOT NULL,
  color      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (name, type)
);

CREATE TABLE transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL CHECK (type IN ('in','out')),
  amount      INTEGER NOT NULL CHECK (amount > 0),   -- paise
  category_id INTEGER NOT NULL REFERENCES categories(id),
  note        TEXT NOT NULL DEFAULT '',
  date        TEXT NOT NULL,                          -- 'YYYY-MM-DD'
  created_at  INTEGER NOT NULL,                       -- unix ms
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_tx_date ON transactions(date);
CREATE INDEX idx_tx_cat_date ON transactions(category_id, date);

CREATE TABLE chats (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL DEFAULT 'New chat',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id    INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT NOT NULL,
  chart_json TEXT,              -- validated chart spec + data snapshot (see 04-AI-CHAT.md), or NULL
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_msg_chat ON messages(chat_id, id);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```
Settings keys: `theme` (light|dark|system), `backup_folder_uri`, `last_backup_at`.
The Groq key is NOT in the database. It lives in expo-secure-store.

## Seed data (on first run only)
Insert the default categories from `02-DESIGN.md` (names, types, icons, colors, sort order exactly as listed).

## Key queries (put in `src/db/stats.ts`)
- **Balance:** `SUM(in) - SUM(out)` over all time.
- **Totals for a period:** in and out sums between two dates.
- **By category for a period** (type = out): `SELECT category_id, SUM(amount) ... GROUP BY category_id ORDER BY 2 DESC`.
- **By day for a period:** `GROUP BY date`.
- **By month for a year:** `GROUP BY substr(date,1,7)`.
- **Days that have transactions in a month** (for calendar dots): `SELECT date, SUM(CASE type WHEN 'out' THEN 1 ELSE 0 END) ...`.
- **Transactions for a day / month** with category join, newest first, with optional category filter and note search (`LIKE`).
- **Delete category rules:** hide instead of delete if transactions use it.

Every query takes parameters (never string-concatenate user input).

## Money helpers (`src/utils/money.ts`)
- `toPaise("123.45") → 12345`, `formatINR(12345) → "₹123.45"`, use Indian digit grouping (`en-IN`) e.g. `₹1,23,456`.
- Hide ".00" when amount is whole: `₹120`.
- Unit-test these.

## Backup file format
Single JSON file, name `varavuselavu-backup.json`:
```json
{
  "app": "varavuselavu",
  "schema_version": 1,
  "exported_at": 1730000000000,
  "categories": [ ... all rows ... ],
  "transactions": [ ... all rows ... ],
  "chats": [ ... ],
  "messages": [ ... ],
  "settings": { "theme": "system" }
}
```
Do not include the Groq key.

## Backup behavior (`src/services/backup.ts`)
1. **Choose folder (once):** Settings → "Choose backup folder" uses `StorageAccessFramework.requestDirectoryPermissionsAsync()`. Save the folder URI in `settings.backup_folder_uri`.
2. **Auto-backup:** after any data change (debounced 3 s), write `varavuselavu-backup.json` in that folder. **Skip auto-backup when the database has no transactions.** Update `last_backup_at`.
3. **Manual "Back up now"** does the same immediately and shows a toast.
4. **Restore:** Settings → "Restore from file" (document picker, JSON only). Validate with zod (`app === 'varavuselavu'`, known `schema_version`). Ask "This will replace current data. Continue?" Cancel any pending backups. Then in ONE transaction: clear tables, insert everything, re-run migrations if the backup is older. After restoring, ask the user to choose the backup folder again.
5. **After reinstalling the app** (data is wiped by Android on uninstall): on first launch, if the database has no transactions, show a friendly dialog "Restore from a backup?" with "Choose backup file" and "Start fresh". The user picks the backup file from their phone's folder. (The saved folder URI is also wiped on uninstall, so the file must be picked again once.)
6. **Updating over the old app** (normal case) keeps all data automatically. No restore needed.
7. If no backup folder is chosen yet, show a gentle reminder card on Home once: "Choose a backup folder so your data is safe".

### Backup safety rules
- **One at a time:** only one backup runs at a time. If a new backup is triggered while one is running, queue it (and collapse multiple queued requests into one).
- **Read transaction:** export all rows inside one SQLite read transaction so the snapshot is consistent.
- **Atomic write / Keep previous:** write to a temporary file, verify the temp file can be read back and parsed, then rename it over the main backup. If Android SAF makes "temp file then rename" unreliable across different storage providers, copy/write the existing good backup to `varavuselavu-backup-prev.json` as a second file first before overwriting the main backup.
- **Keep previous backup:** always maintain `varavuselavu-backup-prev.json` as a safety copy. Rotate: current → prev, new → current.
- **Cancel during restore:** cancel any pending or running backup before starting a restore.

## Reset all data
Before resetting, offer a **"Back up first?"** option that saves a separate timestamped copy (e.g. `varavuselavu-pre-reset-2026-11-04.json`) so the user can undo the reset later. Then in ONE transaction: delete from messages, chats, transactions, categories; re-seed default categories; reset settings except `theme` and `backup_folder_uri`. Do **not** auto-backup after reset (never overwrite the main backup with an empty database). Keep the Groq key.
