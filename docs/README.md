# Varavuselavu — Project Brief (read this first)

App name: **Varavuselavu** (Tamil for income and expense). Show this name as the app name on the phone and in the app. The panda mascot is just a character inside the app.

A personal Android expense-tracker app for ONE user (a college student). It runs only on the owner's Android phone. No login, no server, no accounts.

## What the app does
- Track money IN (Daddy's money, Side hustle, Other) and money OUT (Food & snacks, Travel & fuel, Education, Recharge & subscriptions, Shopping, Outings & fun, Others).
- Every transaction: amount, category, optional note, date.
- Calendar view of transactions by date.
- Charts (pie, bar, line) the user can switch between.
- AI chat (Groq, free key): the user asks questions, the AI calls tools to fetch only the needed data, then replies with text or a chart inside the chat. Past chats are saved.
- Cute panda mascot that reacts to the money situation.
- Backup/restore, reset-all-data button, light/dark/system theme.

## Non-negotiable rules for the building agent
1. **Fast and smooth** is the top priority. Everything except AI chat must work fully offline and open instantly.
2. **Simple, "good enough"** code. No over-engineering. No extra features beyond these docs.
3. Money is stored as **integers in paise** (₹1 = 100). Never use floats for money.
4. The AI never does maths. All derived numbers (totals, percentages, differences) are computed by SQL in the database; the AI only explains what the tools return.
5. Never send the whole database to the AI. The AI uses read-only **tools** (see `04-AI-CHAT.md`) and receives only the data it asks for, such as one month.
6. The Groq API key is stored only on the phone (expo-secure-store). Never hard-code it. Never commit it.
7. Currency symbol: ₹ (Indian rupee). Date format shown to user: `24 Apr 2026`. Store dates as `YYYY-MM-DD`.
8. Every phase in `05-PHASES.md` must pass its checklist before starting the next one.
9. The Android `applicationId` and the signing keystore must never change after the first release, or updates will not install over the old app and data will be lost. See `06-BUILD-AND-UPDATES.md`.
10. Use today's date from the phone in the `Asia/Kolkata` timezone.
11. Never print financial data, tool results or user notes in console logs in release builds.

## Files in this folder
| File | What it covers |
|---|---|
| `01-ARCHITECTURE.md` | Tech stack, folder structure, how parts connect |
| `02-DESIGN.md` | Every screen, every component, colors, fonts, panda |
| `03-DATABASE.md` | Tables, queries, backup file format |
| `04-AI-CHAT.md` | Groq setup, AI tools, prompt, chart rendering |
| `05-PHASES.md` | Timeline, what to build in each phase, checklists |
| `06-BUILD-AND-UPDATES.md` | GitHub, automatic APK builds, signing, updating |

## Reference images
Put the owner's two design screenshots in `docs/reference/` (named `ref-1.png`, `ref-2.png`). Match their **style** (card tiles, floating bottom bar with centre + button, line chart with tooltip, calendar, pie chart, purple/orange colors), but use the screens defined in `02-DESIGN.md`. Use ₹ instead of $.
