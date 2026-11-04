# 05 — Build Phases and Timeline

Estimated total: **about 14 working days** for one person. With an AI agent building, it can be much faster, but keep the order and the checklists. Each phase ends with a working app that can be installed and used.

| Phase | Days | Result |
|---|---|---|
| 0. Setup | 1 | Empty app runs on the phone, GitHub ready |
| 1. Data + Add + History | 3 | Can add, edit, delete, see transactions, calendar |
| 2. Home + Charts | 2 | Balance, tiles, switchable charts |
| 3. AI Chat | 3 | Chat with text and charts, saved chats |
| 4. Settings + Backup + Reset | 2 | Theme, categories, key, backup/restore, reset |
| 5. Panda + Polish | 2 | Mascot, animations, empty states, speed pass |
| 6. Release pipeline | 1 | GitHub builds a signed APK, update-over-old tested |

Tip: do Phase 6's pipeline early if possible (right after Phase 1) so every phase can be installed on the real phone. Test every phase on the real phone, not only an emulator.

---

## Phase 0 — Setup (Day 1)
Tasks
1. Create the Expo project with TypeScript: `npx create-expo-app varavuselavu --template`, then clean the template.
2. Install the packages listed in `01-ARCHITECTURE.md` using `npx expo install`.
3. Create the folder structure from `01-ARCHITECTURE.md`.
4. Add `src/theme` (colors, spacing, typography, `useTheme`) with light and dark values from `02-DESIGN.md`.
5. Set `app.json`: name "Varavuselavu", slug, `android.package` = `com.<yourname>.varavuselavu` (**choose once, never change**), version 1.0.0, `android.versionCode` 1, icon and splash placeholders.
6. Load the Inter font before showing the first screen.
7. Make a GitHub repo, commit, add `.gitignore` (node_modules, android/ios build folders if generated, `*.keystore`, `.env`).
8. Add `docs/` with these md files and the reference images.

Done when
- [x] App opens on the phone (Expo Go or dev build) and shows a themed blank Home.
- [x] Code is on GitHub / git repository.

---

## Phase 1 — Data, Add, History (Days 2–4)
Tasks
1. `src/db`: open database, migrations, schema v1, seed categories (`03-DATABASE.md`).
2. `utils/money.ts` and `utils/dates.ts` + unit tests.
3. `transactions.ts`: insert, update, delete, get by id, list by month with filters, list by day, days-with-transactions.
4. Floating bottom bar (custom tab bar) with 5 slots; placeholder screens for Chat and Settings.
5. **Add screen** exactly as in `02-DESIGN.md` (in/out switch, amount, category chips — hidden categories still show when editing a transaction that uses them — note, date, save, edit mode, delete).
6. **History screen:** Calendar mode and List mode, search, category chips, month picker, swipe-to-delete.
7. Zustand `dataVersion` store so screens refresh after changes.
8. Dummy data helper (dev only): a hidden long-press on the version text in Settings that adds 2,000 or 10,000 random transactions (configurable), used to test speed.

Done when
- [ ] Can add an expense and income with a note; it shows in History immediately.
- [ ] Calendar dots appear; tapping a day shows only that day's transactions and totals.
- [ ] Edit and delete work. Notes are searchable.
- [ ] With 2,000 and 10,000 dummy transactions, History scrolls smoothly and opens in under 300 ms.
- [ ] Works in airplane mode.

---

## Phase 2 — Home and Charts (Days 5–6)
Tasks
1. `stats.ts` queries: balance, totals, by category, by day, by month.
2. **BalanceCard** with usage bar and colors. Usage bar: total spent ÷ total money in (all time). If money in is 0, hide bar and show "Add money in to see usage". If spent exceeds money in, full red bar and "Over by ₹X".
3. **Category tiles** (top 4 this month) → tap opens History filtered.
4. **ChartCard** with Pie / Bar / Line tabs and Week / Month / Year chips, built on `ChartView` (a reusable component that takes `{type, labels, values}`; it will be reused by the AI chat).
5. Line chart tooltip on touch. Pie percentage labels and legend.
6. Recent transactions list (5).
7. Empty states.

Done when
- [ ] Numbers on Home match History totals (check with a manual example).
- [ ] Switching chart type is instant (no visible delay).
- [ ] Pie never shows more than 6 slices.
- [ ] Usage bar color changes at 70% and 90%. Hides when money in is 0. Shows "Over by ₹X" when spent exceeds money in.

---

## Phase 3 — AI Chat (Days 7–9)
Tasks
1. Settings → AI: key field saved in secure-store, "Test key" button (sends a tiny request).
2. `services/tools.ts` (definitions only) and `services/toolExecutor.ts` (execution): the 5 database tools (`get_spending_summary`, `get_category_breakdown`, `get_trend`, `get_transactions`, `compare_periods`) plus the local `show_chart` tool, with JSON schemas, zod validation and SQL runners using `stats.ts` — see `04-AI-CHAT.md`.
3. `services/prompt.ts` and `services/ai.ts`: Groq call with `tools`, the tool loop (max 3 tool-calling steps, max 4 Groq requests, max 6 tool calls, 25 s deadline), retry, timeout, error mapping.
4. `chartSpec.ts`: `show_chart` spec → data via `stats.ts`, with the safety fixes. Save chart spec + data snapshot (labels and values) with the message.
5. DB: chats and messages functions.
6. Chats list screen (new chat, delete, previews).
7. Chat screen: bubbles, inline chart with "as of {date}" label, suggestion chips, thinking indicator, offline banner, copy on long-press, retry button (including for interrupted AI responses).
8. Unit tests for tool arguments, date resolution rules (month without year, future month, explicit year), date fixes, correct period-only data, loop limits (steps, requests, tool calls, deadline), result size with 2,000 and 10,000 transactions, tool result metadata (`total_count`, `has_more`), chart snapshot saving.

Done when
- [ ] "December analysis" fetches ONLY December data (check the tool call arguments) and answers from it.
- [ ] "Where did my money go this month?" returns text and a pie chart with correct numbers.
- [ ] "Am I spending more lately?" returns a line chart.
- [ ] "Compare October and November" uses `compare_periods` and shows a bar chart.
- [ ] A question with no chart need returns text only.
- [ ] Old chats reopen with their original chart data (snapshot, not redrawn from current data). Charts show "as of {date}".
- [ ] Offline, wrong key, and rate-limit cases show the right messages and the app never crashes.
- [ ] If the app closes while the AI is answering, the user message stays with a Retry button.
- [ ] The rest of the app stays smooth while the AI is thinking.

---

## Phase 4 — Settings, Backup, Reset (Days 10–11)
Tasks
1. Theme switch (Light/Dark/System) saved in settings.
2. Category management (rename, color, add, hide).
3. Backup service: choose folder, backup queue (one backup at a time), consistent read transaction export, atomic write to temp file with read-back verification, keep previous backup (`varavuselavu-backup-prev.json`), auto-backup (debounced 3s, skip if no transactions), back up now, restore from file (cancel pending backups during restore), validation (`03-DATABASE.md`).
4. Database migration framework: run each migration in a transaction, update `user_version` on success, support restoring older backup into newer schema version.
5. First-launch "Restore from a backup?" dialog when the database is empty.
6. Reset all data: offer "Back up first" (separate timestamped backup), require typing `RESET`, clear tables, re-seed categories, keep AI key & theme, do NOT auto-backup empty database.
7. Home reminder card to choose a backup folder.
8. Unit tests for backup queue, atomic write/read-back, migrations (v1 → v2), old-backup restore, and reset with pre-backup.

Done when
- [ ] Add a transaction → backup file in the chosen folder updates within about 5 seconds.
- [ ] Auto-backup is skipped when database has no transactions.
- [ ] Reset offers "Back up first" and does NOT overwrite the main backup with an empty file.
- [ ] Uninstall, reinstall, restore from file → all data (including chats) is back.
- [ ] Restoring an older schema backup into a newer app applies migrations successfully.
- [ ] Reset clears everything, re-seeds categories, keeps the AI key.
- [ ] Restoring a corrupted or wrong JSON shows an error and changes nothing.

---

## Phase 5 — Panda and Polish (Days 12–13)
Tasks
1. Add the six panda images (`02-DESIGN.md`), `PandaView` with mood prop and bounce animation.
2. Mood logic on Home (usage thresholds), wink after save, thinking in chat, sleepy in empty states.
3. App icon and splash.
4. Screen transitions, light haptics on save and delete.
5. **Speed pass:** test with both 2,000-row and 10,000-row dummy data. Profile Home, History and chart switching. Fix anything slower than 300 ms. Check memory is stable after 5 minutes of use.
6. Accessibility check (contrast, tap sizes, "+"/"−" signs).
7. Check small and large screen sizes and system font size at 130%.
8. Strip all financial data, tool results, and notes from release build console logs.
9. Remove the dummy-data helper from release builds (or keep it hidden behind `__DEV__`).

Done when
- [ ] No jank when scrolling or switching charts on the real phone (tested with 10,000 rows).
- [ ] Both themes look right on every screen.
- [ ] Cold start to Home under about 2 seconds.
- [ ] No sensitive financial data or tool results printed to logs in release mode.

---

## Phase 6 — Release pipeline (Day 14)
Follow `06-BUILD-AND-UPDATES.md`.

Done when
- [ ] Pushing to `main` produces a signed APK.
- [ ] Installing version 2 **over** version 1 keeps all data.
- [ ] Keystore is backed up outside GitHub.

---

## Out of scope (do NOT build)
Login, cloud sync, multiple users, bill photo scanning/OCR, budgets per category, recurring transactions, notifications, widgets, iOS support. They can be added later.
