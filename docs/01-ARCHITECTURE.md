# 01 — Architecture

## Overview
A single Android app. No backend server. All data lives in a SQLite database on the phone. The only network call is from the AI chat to Groq's API.

```
┌──────────────────────── Phone ────────────────────────┐
│  UI screens (React Native / Expo Router)              │
│        │                                              │
│  State (zustand) + hooks                              │
│        │                                              │
│  Data layer (src/db) ── SQLite (expo-sqlite)          │
│        │                                              │
│  Backup service ── JSON file in a user-chosen folder  │
│        │                                              │
│  AI service ──(internet, chat only)──► Groq API       │
└───────────────────────────────────────────────────────┘
```

## Tech stack
| Part | Choice | Notes |
|---|---|---|
| Framework | React Native + **Expo** (latest stable SDK), **TypeScript** | Hermes engine on (default) |
| Navigation | **expo-router** | Tabs + modal for Add |
| Database | **expo-sqlite** (async API) | Raw SQL, no ORM |
| State | **zustand** | Small stores: theme, settings, a "data changed" counter |
| Lists | **@shopify/flash-list** | History and chat lists |
| Charts | **react-native-gifted-charts** (+ react-native-svg, expo-linear-gradient) | Pie, bar, line |
| Calendar | **react-native-calendars** | Dots on days with transactions |
| Animation | **react-native-reanimated** | Panda bounce, screen transitions |
| Secure key storage | **expo-secure-store** | Groq key |
| Files / backup | **expo-file-system** (Storage Access Framework on Android), **expo-document-picker**, **expo-sharing** | |
| Validation | **zod** | Validate AI JSON replies |
| Network check | **@react-native-community/netinfo** | Offline banner in chat |
| Tests | **jest** + jest-expo | Utils and AI JSON validation only |
| Font | **Inter** via @expo-google-fonts/inter (bundled, not downloaded at runtime) | |

Use the newest stable versions compatible with the chosen Expo SDK. Run `npx expo install` for Expo-managed packages so versions match.

## Folder structure
```
varavuselavu/
├─ app/                      # expo-router screens
│  ├─ _layout.tsx            # root: fonts, DB init, theme, restore prompt
│  ├─ (tabs)/
│  │  ├─ _layout.tsx         # custom floating bottom bar
│  │  ├─ index.tsx           # Home
│  │  ├─ history.tsx         # History (calendar + list)
│  │  ├─ chats.tsx           # Chat list
│  │  └─ settings.tsx        # Settings
│  ├─ add.tsx                # Add/Edit transaction (modal)
│  └─ chat/[id].tsx          # One chat
├─ src/
│  ├─ db/
│  │  ├─ index.ts            # open DB, migrations
│  │  ├─ schema.ts           # CREATE TABLE statements + version
│  │  ├─ transactions.ts     # insert/update/delete/query
│  │  ├─ categories.ts
│  │  ├─ chats.ts
│  │  └─ stats.ts            # SUM/GROUP BY queries for charts and AI
│  ├─ services/
│  │  ├─ ai.ts               # Groq call, tool loop, error handling
│  │  ├─ tools.ts            # AI tool JSON schemas (definitions only)
│  │  ├─ toolExecutor.ts     # runs each tool against SQLite
│  │  ├─ prompt.ts           # system prompt builder
│  │  ├─ chartSpec.ts        # turn AI chart spec into chart data via stats.ts
│  │  └─ backup.ts           # export/import/auto-backup
│  ├─ components/            # Card, Chip, TransactionRow, BalanceCard, CategoryTile,
│  │                         # ChartCard, ChartView, PandaView, ChatBubble, EmptyState...
│  ├─ theme/                 # colors.ts, spacing.ts, typography.ts, useTheme.ts
│  ├─ store/                 # zustand stores
│  ├─ utils/                 # money.ts, dates.ts, id.ts
│  └─ constants.ts           # GROQ_MODEL, default categories, app version
├─ assets/
│  ├─ panda/                 # panda-happy.png, -neutral, -worried, -thinking, -wink, -sleepy
│  └─ icon.png, splash.png
├─ docs/                     # these md files + reference/
├─ .github/workflows/build-apk.yml
└─ app.json
```

## Data flow rules
- Screens never write SQL. They call functions in `src/db/*`.
- After any write, call `bumpDataVersion()` in the store. Screens that show data re-query when this number changes.
- After any write, schedule an **auto-backup** (debounced 3 seconds). Skip auto-backup when the database has no transactions.
- Aggregations (totals, per-category, per-day) are done in SQL, not in JavaScript loops.

## Performance rules
1. Add indexes (see `03-DATABASE.md`).
2. History uses FlashList and loads **one month at a time** (never all rows).
3. Home runs only aggregate queries (a few SUM/GROUP BY calls), never loads every transaction.
4. Charts: max 31 points on a line chart, max 6 pie slices (rest merged into "Others").
5. Panda images are small PNGs (512×512 max, under 150 KB each).
6. Animations use Reanimated on the UI thread. No heavy animations on lists.
7. AI calls are async and never block the UI. 25-second overall deadline per question.
8. Use `React.memo` for list rows. Avoid inline functions in list items.

## Offline behavior
| Feature | Offline |
|---|---|
| Add/edit/delete, History, calendar, Home, charts, panda, settings, backup, reset | Works fully |
| AI chat | Reading old chats works. Sending shows "No internet. AI needs it." |

## Error handling
- Database error: show a small toast, never crash. Log to console.
- AI error: show it as a chat message in the panda's voice (see `04-AI-CHAT.md`).
- Backup error: toast "Backup failed, open Settings to fix the folder".
- Never print financial data, tool results or user notes in console logs in release builds.
