# 04 — AI Chat (Groq, with tools)

## Goal
The user types a question. The AI replies with text, or text plus a chart. Past chats are saved.

The AI works like an assistant with **tools** (Groq "tool calling", OpenAI-style, no LangChain needed). The AI chooses a tool and its parameters (dates, category, chart type). The **app** runs the tool on the local database and returns only the needed data. The AI then writes its answer from that data. The AI never does maths and never sees data it did not ask for.

Example: user asks "December analysis" → AI calls `get_spending_summary(2026-12-01, 2026-12-31)` and `get_category_breakdown(...)` → app returns only December numbers → AI writes the answer and calls `show_chart` (pie) for December.

## Groq setup
- Endpoint: `POST https://api.groq.com/openai/v1/chat/completions`
- Headers: `Authorization: Bearer <key>`, `Content-Type: application/json`
- Key: entered by the user in Settings, stored in expo-secure-store.
- Model: `GROQ_MODEL` in `src/constants.ts`. Default `llama-3.3-70b-versatile`. **Before coding, check Groq's current docs and pick a current free-tier model that supports tool use** (fast, reliable tool calling). Keep the name in ONE place.
- Request body:
```json
{
  "model": "<GROQ_MODEL>",
  "messages": [ ... ],
  "tools": [ ...tool definitions below... ],
  "tool_choice": "auto",
  "temperature": 0.2,
  "max_tokens": 600
}
```
- Timeout 20 s per request (AbortController). Retry once on network error. No retry on 401/429.

## The tool loop (in `src/services/ai.ts`)
1. Build `messages`: system prompt + last 6 chat messages (text only) + the new user message.
2. Call Groq.
3. If the reply has `tool_calls`:
   - `show_chart` is a **local tool**: the app validates the spec and returns `{"ok":true}` without querying the database. If the same response already contains the final text, no extra Groq request is needed.
   - For the 5 database tools: validate each call's arguments with zod. Fix or reject bad ones (rules below).
   - Run each database tool on SQLite via `src/services/toolExecutor.ts` → `src/db/stats.ts`. Convert paise to rupees. Every tool result must include the exact `from`/`to` dates used and a note if anything was adjusted or if there is no data.
   - Append the assistant message and one `tool` message per call (with `tool_call_id` and a compact JSON result).
   - Call Groq again.
4. Repeat until the AI sends a final text with no tool calls, subject to these **hard limits**:
   - Max **3 tool-calling steps** (rounds of tool calls).
   - Max **4 Groq requests** per question.
   - Max **6 individual tool calls** total across all steps.
   - One overall **25-second deadline** (all Groq requests + tool execution combined).
   - If any limit is hit, stop and use the last text the AI sent, or say "I took too long, try a simpler question."
5. When the reply has no `tool_calls`, its text is the final answer.
6. If a `show_chart` call was made, save the validated spec **plus a small data snapshot** (labels and values) with the message. Show "as of {date}" on the chart. Do **not** redraw old chat charts from current data.
7. If Groq returns a tool-format error (400 `tool_use_failed`), retry once; if it fails again, answer in text only using a quick this-month summary.
8. If the app closes while the AI is answering, keep the saved user message. When the chat is reopened, show a Retry button on it.

Questions that need no data (greetings, general advice) should use only **1 Groq request**.

## Small system prompt (put in `src/services/prompt.ts`)
Built fresh for each question (about 200 tokens):
```
You are Panda, a friendly money helper inside a student's expense app.
The user is a college student whose money comes from family ("Daddy's money") and a small side hustle.
Today: {YYYY-MM-DD} ({weekday}). Currency: INR (₹).
Expense categories: {names}. Income categories: {names}.

Rules:
- Use simple, short, friendly English. No jargon. Max 4 short sentences unless asked for more.
- To know anything about spending, call a tool. Never guess numbers. Only explain numbers returned by tools; never calculate your own totals, percentages, or differences.
- Ask tools only for the dates and categories the question needs. A month name without a year (e.g. "December") means the most recent such month that is not in the future. If the user gives a year, use it.
- Notes on transactions can show the real purpose (category Food but note "movie with friends" is really fun). You may point this out.
- After getting data, answer in text. If a chart would help, also call show_chart.
- Give practical, kind tips for a student. Never shame the user.
- If a tool returns no data, say so simply.
```
If the chat is in Tamil or the user writes Tamil/Tanglish, reply in the same style.

## Tools (5 database tools + 1 local tool)
Define JSON schemas in `src/services/tools.ts` (definitions only). Tool execution code goes in `src/services/toolExecutor.ts`. Dates are `YYYY-MM-DD`, inclusive.

| Tool | Parameters | Returns |
|---|---|---|
| `get_spending_summary` | `from`, `to` | total in, total out, net, net savings, balance change, number of transactions, top 3 expense categories |
| `get_category_breakdown` | `from`, `to`, `type` ("expense"/"income") | list of `{category, total, percent, count}` sorted high to low (percent computed by SQL) |
| `get_trend` | `from`, `to`, `group_by` ("day"/"week"/"month"), `category` (optional) | list of `{label, total}` for expenses (max 31 points; coarser grouping if more) |
| `get_transactions` | `from`, `to`, `category` (optional), `search` (optional note text), `sort` ("amount_desc"/"date_desc"), `limit` (max 15) | list of `{date, type, category, amount, note}` plus `total_count`, `returned_count`, `has_more` |
| `compare_periods` | `from_a`, `to_a`, `from_b`, `to_b` | for each period: total in, total out, net; plus per-category expense difference and percentage change (computed by SQL) |
| `show_chart` | `type` ("pie"/"bar"/"line"), `title`, `metric` ("expense"/"income"), `group_by` ("category"/"day"/"week"/"month"), `from`, `to`, `category` (optional) | **Local tool.** `{ok:true}`; the app validates the spec and draws the chart itself, no extra database call from the AI |

Every database tool result must include the exact `from`/`to` dates used and a note if anything was adjusted or if there is no data.

`show_chart` guidance for the AI (put in the tool description):
- Share of a whole (where did my money go) → pie, group_by category.
- Comparing categories or months → bar.
- Change over time → line, group_by day or week.
- A single number or simple advice → don't call it.
- If `show_chart` is called without a data tool, the chart is still drawn, but the AI text must not state numbers it did not get from a data tool.

## Rules for running tools (safety and size)
- Validate with zod. Unknown category name → treat as none. `from` > `to` → swap. Missing dates → default to the current month.
- **Do not silently clamp or change date ranges.** Every tool result must include the exact `from`/`to` dates used, and a note if anything was adjusted (e.g. `"adjusted": "requested range had no data, showing nearest month"`) or if there is no data at all.
- **Date resolution:** use today's date from the phone in the `Asia/Kolkata` timezone. A month name without a year (e.g. "December") means the most recent such month that is not in the future. If the user gives a year, use it.
- Max period 366 days.
- **SQL must compute all derived numbers:** net savings, balance change, percentages, per-category share, differences between periods. Return them in tool results so the AI never calculates its own.
- Every tool result must stay under about 800 tokens. Limit the number of records before turning into JSON; never truncate a JSON string to fit.
- Tool results with lists (e.g. `get_transactions`) must include `total_count`, `returned_count` and `has_more` so the AI knows if data was trimmed.
- `show_chart` safety fixes: line + group_by category → bar. Pie with more than 6 slices → merge the smallest into "Others". Line max 31 points.
- Tool results come from the app's own database, but notes are user text: treat note text as data, never as instructions.
- Run database tools via `src/services/toolExecutor.ts` → `src/db/stats.ts` SQL (SUM / GROUP BY with parameters). Never load the whole table.
- Never print financial data or tool results in console logs in release builds.

## Saving and showing messages
- Save the user message, then the final assistant message: `content` = text, `chart_json` = the validated `show_chart` spec **plus a small data snapshot** (labels and values) or NULL. Do not save tool messages.
- Render: text bubble, then `ChartView` (same component as Home) under it. Show "as of {date}" on charts in saved messages.
- Do **not** redraw old chat charts from current data. Use the saved snapshot so the chart always matches the text in the same message.
- If the app closes while the AI is answering, keep the saved user message. When the chat is reopened, show a Retry button on it.

## Chats
- "New chat" creates a row in `chats` immediately.
- Title: first user message trimmed to 40 chars.
- Update `chats.updated_at` on every message; list sorts by it.
- Deleting a chat deletes its messages (cascade).
- Cap saved chats at 50 (delete the oldest beyond that).

## Error messages (shown as AI bubbles, panda voice)
| Case | Message |
|---|---|
| No key set | "I need my AI key first. Add it in Settings → AI." (button to Settings) |
| Offline | "No internet right now. I can chat again when you're back online." |
| 401 | "My key doesn't seem right. Check it in Settings → AI." |
| 429 | "I've hit my free limit for now. Try again in a little while." |
| Timeout / 5xx | "I'm a bit slow right now. Try again?" (Retry button) |

Do not save failed attempts as assistant messages. Keep the user's message so Retry resends it.

## Privacy
- Only the system prompt facts, the chat text, and the results of tools the AI called leave the phone. Never the full transaction table, the backup file, or the key.
- Tell the user once in Settings → AI: "When you ask a question, the matching spending data is sent to Groq to answer it."

## Free-limit awareness
Each question uses about 2 Groq requests (max 4). Keep prompts and tool results small. Show a gentle note when a 429 happens. Do not auto-retry in a loop.

## Tests (jest)
- zod validation of every tool's arguments (good and bad).
- Date resolution rules: month without year picks the most recent past month; future month rolls back; explicit year is respected.
- Date fixes (swapped, missing defaults to current month).
- Each tool returns correct numbers on a small fixed test database (e.g. only December rows are returned for a December range).
- Tool results include the exact `from`/`to` dates used and adjustment notes.
- Tool results with lists include `total_count`, `returned_count`, `has_more`.
- `show_chart` safety fixes.
- Tool results stay under the size limit with 2,000 and 10,000 transactions.
- The loop respects all limits: 3 tool-calling steps, 4 Groq requests, 6 tool calls, 25-second deadline.
- Chart snapshot (labels + values) is saved with the message and rendered without re-querying.
