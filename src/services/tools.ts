import { z } from 'zod';
import { getCurrentYearMonth, getMonthRange } from '../utils/dates';

/**
 * Standard OpenAI Tool Definitions for Groq.
 */
export const GROQ_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_spending_summary',
      description:
        'Get spending and income summary for a date range: total money in, total spent, net savings, transaction count, and top 3 expense categories. Dates are optional YYYY-MM-DD.',
      parameters: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format (inclusive). Optional, defaults to start of current month.',
          },
          to: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format (inclusive). Optional, defaults to end of current month.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_category_breakdown',
      description:
        'Get category-wise breakdown of spending or income with exact amounts, transaction counts, and percentages calculated in SQL. Sorted from highest to lowest.',
      parameters: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format. Optional, defaults to current month.',
          },
          to: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format. Optional, defaults to current month.',
          },
          type: {
            type: 'string',
            enum: ['expense', 'income'],
            description: 'Whether to break down expenses or income. Default is expense.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_trend',
      description:
        'Get spending trend over time grouped by day, week, or month (max 31 data points). Useful for seeing if spending is increasing or decreasing.',
      parameters: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format. Optional, defaults to current month.',
          },
          to: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format. Optional, defaults to current month.',
          },
          group_by: {
            type: 'string',
            enum: ['day', 'week', 'month'],
            description: 'How to group data points: day, week, or month.',
          },
          category: {
            type: 'string',
            description: 'Optional category name to filter the trend (e.g. "Food & snacks").',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_transactions',
      description:
        'Get individual transactions with note details, category, date, and amount. Returns list plus total_count and has_more flag. Max 15 items.',
      parameters: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format. Optional, defaults to current month.',
          },
          to: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format. Optional, defaults to current month.',
          },
          category: {
            type: 'string',
            description: 'Optional category name filter.',
          },
          search: {
            type: 'string',
            description: 'Optional search keyword to match in notes or category names.',
          },
          sort: {
            type: 'string',
            enum: ['date_desc', 'amount_desc'],
            description: 'Sort order: newest first (date_desc) or largest amount first (amount_desc).',
          },
          limit: {
            type: 'integer',
            description: 'Maximum transactions to return (1-15, default 10).',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'compare_periods',
      description:
        'Compare spending between two date ranges (period A vs period B). Returns totals, difference, and category-level changes computed by SQL.',
      parameters: {
        type: 'object',
        properties: {
          from_a: {
            type: 'string',
            description: 'Start date of Period A (e.g. last month).',
          },
          to_a: {
            type: 'string',
            description: 'End date of Period A.',
          },
          from_b: {
            type: 'string',
            description: 'Start date of Period B (e.g. this month).',
          },
          to_b: {
            type: 'string',
            description: 'End date of Period B.',
          },
        },
        required: ['from_a', 'to_a', 'from_b', 'to_b'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'show_chart',
      description:
        'Display an interactive chart to the user. Guidance: pie for category breakdown/share of whole; bar for comparing categories or months; line for trend over time. Local tool: app renders chart directly.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['pie', 'bar', 'line'],
            description: 'Type of chart.',
          },
          title: {
            type: 'string',
            description: 'Short descriptive title for the chart (e.g. "December Expenses").',
          },
          metric: {
            type: 'string',
            enum: ['expense', 'income'],
            description: 'Whether to plot expense or income. Default is expense.',
          },
          group_by: {
            type: 'string',
            enum: ['category', 'day', 'week', 'month'],
            description: 'Grouping dimension: category (for pie/bar), day/week/month (for line/bar).',
          },
          from: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format. Optional, defaults to current month.',
          },
          to: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format. Optional, defaults to current month.',
          },
          category: {
            type: 'string',
            description: 'Optional category name filter.',
          },
        },
        required: ['type', 'title'],
      },
    },
  },
];

/**
 * Zod validation schemas for AI-provided tool arguments.
 */
const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .optional();

export const SpendingSummaryArgsSchema = z.object({
  from: DateStringSchema,
  to: DateStringSchema,
});

export const CategoryBreakdownArgsSchema = z.object({
  from: DateStringSchema,
  to: DateStringSchema,
  type: z.enum(['expense', 'income']).default('expense'),
});

export const TrendArgsSchema = z.object({
  from: DateStringSchema,
  to: DateStringSchema,
  group_by: z.enum(['day', 'week', 'month']).default('day'),
  category: z.string().optional(),
});

export const TransactionsArgsSchema = z.object({
  from: DateStringSchema,
  to: DateStringSchema,
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['date_desc', 'amount_desc']).default('date_desc'),
  limit: z.coerce.number().min(1).max(15).default(10),
});

export const ComparePeriodsArgsSchema = z.object({
  from_a: DateStringSchema,
  to_a: DateStringSchema,
  from_b: DateStringSchema,
  to_b: DateStringSchema,
});

export const ShowChartArgsSchema = z.object({
  type: z.enum(['pie', 'bar', 'line']),
  title: z.string().min(1).max(60),
  metric: z.enum(['expense', 'income']).default('expense'),
  group_by: z.enum(['category', 'day', 'week', 'month']).default('category'),
  from: DateStringSchema,
  to: DateStringSchema,
  category: z.string().optional(),
});

/**
 * Helper to normalize and validate a date range:
 * - If missing, defaults to current month.
 * - If from > to, swaps them.
 * - Caps maximum span to 366 days.
 */
export function normalizeDateRange(rawFrom?: string, rawTo?: string): {
  from: string;
  to: string;
  adjustedNote?: string;
} {
  const currentMonthRange = getMonthRange(getCurrentYearMonth());
  let from = rawFrom || currentMonthRange.from;
  let to = rawTo || currentMonthRange.to;
  let adjustedNote: string | undefined;

  // Swap if from > to
  if (from > to) {
    const temp = from;
    from = to;
    to = temp;
    adjustedNote = `Swapped inverted dates: ${from} to ${to}`;
  }

  // Cap span to 366 days
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const diffDays = Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24));

  if (diffDays > 366) {
    const adjustedFrom = new Date(toMs - 365 * 24 * 60 * 60 * 1000);
    const y = adjustedFrom.getFullYear();
    const m = String(adjustedFrom.getMonth() + 1).padStart(2, '0');
    const d = String(adjustedFrom.getDate()).padStart(2, '0');
    from = `${y}-${m}-${d}`;
    adjustedNote = `Requested range exceeded 366 days. Adjusted start date to ${from}`;
  }

  return { from, to, adjustedNote };
}

