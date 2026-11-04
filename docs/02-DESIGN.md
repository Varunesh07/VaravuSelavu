# 02 — Design Spec

Style: modern, rounded, playful but clean. Big readable numbers. Inspired by the two reference images (purple/orange, card tiles, floating bottom bar, calendar, pie chart).

## Design tokens

### Colors
| Token | Light | Dark |
|---|---|---|
| background | #F6F6FB | #0E0E14 |
| card | #FFFFFF | #1A1A24 |
| cardAlt (inputs, chips) | #EFEFF6 | #242433 |
| text | #14141F | #F4F4FA |
| textMuted | #6B6B80 | #9A9AB0 |
| primary (purple) | #7C3AED | #8B5CF6 |
| accent (orange) | #F97316 | #FB923C |
| income (green) | #16A34A | #22C55E |
| expense (red-orange) | #EF4444 | #F87171 |
| border | #E5E5F0 | #2E2E40 |
| warning | #F59E0B | #FBBF24 |

Balance card: always dark purple gradient (#4C1D95 → #7C3AED) with a subtle wave pattern, white text, in both themes.

### Category colors and icons (use `@expo/vector-icons`, Ionicons or MaterialCommunityIcons)
| Category | Type | Color | Icon idea |
|---|---|---|---|
| Daddy's money | in | #7C3AED | wallet |
| Side hustle | in | #16A34A | briefcase / cash |
| Other (income) | in | #0EA5E9 | gift |
| Food & snacks | out | #F97316 | fast-food |
| Travel & fuel | out | #3B82F6 | bus / car |
| Education | out | #8B5CF6 | school / book |
| Recharge & subscriptions | out | #14B8A6 | phone / wifi |
| Shopping | out | #EC4899 | bag |
| Outings & fun | out | #EAB308 | game-controller |
| Others | out | #94A3B8 | ellipsis |

### Typography (Inter)
- Big number: 34 / bold
- Title: 20 / semibold
- Body: 15 / regular
- Caption: 12 / medium, textMuted

### Shape and spacing
- Spacing scale: 4, 8, 12, 16, 20, 24, 32.
- Screen side padding: 16.
- Card radius: 20. Chip radius: 999. Button radius: 16.
- Soft shadow on cards in light mode, none in dark mode.
- Minimum tap target: 44×44.

### Theme
Light, Dark, or Follow phone (default). Changes apply instantly with no restart.

## Navigation: floating bottom bar
A rounded pill floating above the bottom edge (see reference 1): 4 icons and a big round **+** in the centre.
Order: **Home · History · (+) · Chat · Settings**.
- Active tab icon sits in a filled circle (primary color).
- The + button is bigger, orange (accent), and opens the Add screen as a modal.
- Bar hides while the keyboard is open.

## Screen 1 — Home
Top to bottom (scrollable):
1. **Header:** "Hi!" + today's date on the left, small panda face on the right (tap = go to Chat).
2. **BalanceCard** (dark purple gradient):
   - Label "Available balance", big amount in ₹.
   - Below: two mini pills, "In ₹X" (green arrow down) and "Out ₹Y" (orange arrow up).
   - **Usage bar:** total spent ÷ total money in (all time), as a percentage, with text "You've used 72% of your money". Bar color: purple under 70%, amber 70–90%, red above 90%. If money in is 0, hide the bar and show "Add money in to see usage". If spent exceeds money in, show a full red bar and "Over by ₹X".
3. **PandaBanner:** panda image (mood-based, ~96px) beside one short sentence, e.g. "Looking good! ₹4,200 left." Mood rules below.
4. **Category tiles** (2-column grid, like reference 1): each tile is a colored rounded card with icon, category name, and this month's total. Show the 4 highest-spending categories this month; a "See all" link goes to History. Tapping a tile opens History filtered to that category.
5. **ChartCard:**
   - Title "Spending".
   - Chart-type tabs (pill switch): **Pie · Bar · Line**. Tapping switches instantly with a short animation.
   - Period chips: **Week · Month · Year** (default Month).
   - Pie: spend share by category with % labels and legend. Bar: spend by category. Line: spend per day (touching a point shows a tooltip "7 Sep · ₹82").
   - Empty state when no data: panda sleepy + "No spending yet".
6. **Recent transactions:** last 5 rows + "See all".

## Screen 2 — History
1. **Segmented switch:** Calendar | List.
2. **Calendar mode** (like reference 2):
   - Month title with ‹ › arrows.
   - Days with transactions show a small dot (orange for expense, green if only income).
   - Selected day is a filled purple circle.
   - Under the calendar: a summary strip "Spent ₹X · Received ₹Y" for the selected day.
   - Under that: that day's transactions.
3. **List mode:** search box ("Search notes or category"), category filter chips (horizontal scroll), month picker, transactions grouped by day (header shows date and day total).
4. **Row:** category icon in a colored circle, category name (bold), note (muted, 1 line), amount on the right (green for in, red for out), time not needed.
5. Tap a row → opens Add screen in edit mode. Swipe left → Delete with confirm.

## Screen 3 — Add / Edit (modal, slides up)
1. Switch at top: **Money out | Money in** (out is default).
2. Big amount field (numeric keypad, ₹ prefix, auto-focus).
3. Category chips (wrap into rows; shows only categories of the chosen type). In edit mode, hidden categories must still show if the transaction being edited uses one.
4. **Note** field, multiline, placeholder "Add a note (optional), e.g. lunch with friends". Max 200 characters.
5. Date row: shows "Today"; tap opens a date picker. Cannot be in the far future (max today + 1 day).
6. **Save** button (full width, primary). Disabled until amount > 0 and a category is picked.
7. On save: close modal, light haptic, panda wink on Home.
8. Edit mode: title "Edit", plus a red "Delete" text button at the bottom.

## Screen 4 — Chats list
- Top: "Chats" title and a **New chat** button (purple).
- List of past chats: title (first question, trimmed to 40 chars), last message preview, relative time ("2h ago"). Swipe to delete.
- Empty state: panda thinking + "Ask me about your spending".
- Tapping New chat creates a chat and opens it.

## Screen 5 — Chat (one conversation)
- Header: back arrow, chat title, small panda.
- Messages: user bubbles right (purple, white text), AI bubbles left (card color). AI messages can contain **a chart under the text** (rendered with the same chart component as Home, full width, in a card).
- Suggestion chips above the input when the chat is empty: "Monthly summary", "Where am I wasting money?", "Will my money last this month?", "Biggest expenses this week".
- Input bar: text field + send button. Disabled while waiting.
- While waiting: panda "thinking" animation + three dots bubble.
- Offline: banner "No internet. AI needs it." and send disabled.
- Long press an AI message: Copy.
- Charts in saved messages show "as of {date}" to indicate when the data was captured.
- If the app closes while the AI is answering, the saved user message stays and shows a Retry button when the chat is reopened.

## Screen 6 — Settings
Sections (cards):
1. **Appearance:** Theme (Light / Dark / System).
2. **Categories:** list with rename, change color, add new, hide. Default categories cannot be deleted if used (they can be hidden).
3. **AI:** field for Groq API key (hidden, with show/hide), "Test key" button, link text "Get a free key at console.groq.com".
4. **Backup:** "Choose backup folder", "Back up now", "Restore from file", last backup time.
5. **Danger zone:** red **Reset all data** button. Tapping opens a confirm dialog that requires typing `RESET`. Before resetting, offer a **"Back up first?"** option. Deletes all transactions, chats and custom categories, then restores default categories. Does NOT delete the Groq key.
6. **About:** version number.

## Panda mascot
Original cute panda character (do NOT copy any existing cartoon). Flat, soft, rounded, thick-ish outline, big eyes. Transparent background PNG, 512×512.

Files in `assets/panda/`:
| File | When used |
|---|---|
| panda-happy.png | Lots of balance left (usage under 60%), after income added |
| panda-neutral.png | Usage 60–80%, default |
| panda-worried.png | Usage over 80%, or balance under 0 |
| panda-thinking.png | AI chat waiting, chat empty state |
| panda-wink.png | Right after saving a transaction (shows 2 seconds) |
| panda-sleepy.png | Empty states (no data) |

Animation: gentle up-and-down bounce (Reanimated, 2 s loop, 6px). Wink shows with a small scale pop.

**Image generation prompt (give to an image tool):**
> "Cute original panda mascot, flat vector style, soft rounded shapes, big shiny eyes, small blush cheeks, thick friendly outline, plain transparent background, centered, full body sitting, mood: {happy | neutral | slightly worried | thinking with paw on chin | winking | sleepy}. Colors: black, white, soft purple accent scarf (#7C3AED). 512x512."
Keep the same character, scarf and style across all six images.

App icon: the panda's happy face on a purple (#7C3AED) rounded square. Splash: purple background, panda centred.

## Empty and loading states
- No transactions: panda sleepy + "Nothing here yet" + button "Add first expense".
- Loading: never show spinners for local data (it is instant). Chat waiting uses the thinking panda.

## Accessibility
- Text contrast meets WCAG AA in both themes.
- Do not rely only on color: income has "+" prefix, expense has "−".
