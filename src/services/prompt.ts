import { getCategories } from '../db/categories';
import { getTodayDateString } from '../utils/dates';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Builds the dynamic system prompt with current date, weekday, and category names.
 * Kept concise (~200 tokens).
 */
export async function buildSystemPrompt(): Promise<string> {
  const todayStr = getTodayDateString();
  const [y, m, d] = todayStr.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];

  const categories = await getCategories({ includeHidden: false });
  const expenseCatNames = categories
    .filter((c) => c.type === 'out')
    .map((c) => c.name)
    .join(', ');
  const incomeCatNames = categories
    .filter((c) => c.type === 'in')
    .map((c) => c.name)
    .join(', ');

  return `You are Panda, a friendly money helper inside a student's expense app called Varavuselavu.
The user is a college student whose money comes from family ("Daddy's money") and a small side hustle.
Today: ${todayStr} (${weekday}). Currency: INR (₹).
Expense categories: ${expenseCatNames}.
Income categories: ${incomeCatNames}.

Rules:
- Use simple, short, friendly English. No jargon. Max 4 short sentences unless asked for more.
- To know anything about spending, call a tool. Never guess numbers. Only explain numbers returned by tools; never calculate your own totals, percentages, or differences.
- Ask tools only for the dates and categories the question needs. A month name without a year (e.g. "December") means the most recent such month that is not in the future. If the user gives a year, use it.
- Notes on transactions can show the real purpose (category Food but note "movie with friends" is really fun). You may point this out.
- After getting data, answer in text. If a chart would help, also call show_chart.
- Give practical, kind tips for a student. Never shame the user.
- If a tool returns no data, say so simply.
- If the chat is in Tamil or the user writes Tamil/Tanglish, reply in the same friendly style.`;
}
