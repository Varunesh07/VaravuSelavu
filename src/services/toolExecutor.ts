import { getDatabase } from '../db';
import { paiseToRupees } from '../utils/money';
import {
  SpendingSummaryArgsSchema,
  CategoryBreakdownArgsSchema,
  TrendArgsSchema,
  TransactionsArgsSchema,
  ComparePeriodsArgsSchema,
  ShowChartArgsSchema,
  normalizeDateRange,
} from './tools';

export interface ChartSnapshot {
  type: 'pie' | 'bar' | 'line';
  title: string;
  metric: 'expense' | 'income';
  from: string;
  to: string;
  created_date: string;
  data: {
    label: string;
    value: number;
    color?: string;
    percent?: number;
  }[];
}

/**
 * Main dispatcher to execute a tool call by name.
 */
export async function executeToolCall(
  name: string,
  rawArgs: Record<string, any>
): Promise<{ result: any; chartSnapshot?: ChartSnapshot }> {
  switch (name) {
    case 'get_spending_summary':
      return { result: await executeSpendingSummary(rawArgs) };

    case 'get_category_breakdown':
      return { result: await executeCategoryBreakdown(rawArgs) };

    case 'get_trend':
      return { result: await executeTrend(rawArgs) };

    case 'get_transactions':
      return { result: await executeTransactions(rawArgs) };

    case 'compare_periods':
      return { result: await executeComparePeriods(rawArgs) };

    case 'show_chart':
      return await executeShowChart(rawArgs);

    default:
      return { result: { error: `Unknown tool: ${name}` } };
  }
}

/**
 * Tool 1: get_spending_summary
 */
export async function executeSpendingSummary(rawArgs: any) {
  const parsed = SpendingSummaryArgsSchema.safeParse(rawArgs);
  const { from, to, adjustedNote } = normalizeDateRange(
    parsed.success ? parsed.data.from : undefined,
    parsed.success ? parsed.data.to : undefined
  );

  const db = await getDatabase();

  const totals = await db.getAllAsync<{ type: 'in' | 'out'; total: number; count: number }>(
    `SELECT type, SUM(amount) as total, COUNT(*) as count
     FROM transactions
     WHERE date >= ? AND date <= ?
     GROUP BY type;`,
    from,
    to
  );

  let totalInPaise = 0;
  let totalOutPaise = 0;
  let txCount = 0;

  for (const r of totals) {
    txCount += r.count;
    if (r.type === 'in') totalInPaise = r.total;
    if (r.type === 'out') totalOutPaise = r.total;
  }

  // Top 3 expense categories
  const topCats = await db.getAllAsync<{ name: string; total: number }>(
    `SELECT c.name, SUM(t.amount) as total
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.type = 'out' AND t.date >= ? AND t.date <= ?
     GROUP BY c.id
     ORDER BY total DESC
     LIMIT 3;`,
    from,
    to
  );

  const top3 = topCats.map((c) => ({
    category: c.name,
    total_rupees: paiseToRupees(c.total),
    percent_of_spending:
      totalOutPaise > 0 ? Math.round((c.total / totalOutPaise) * 100) : 0,
  }));

  const netSavingsPaise = totalInPaise - totalOutPaise;

  return {
    from,
    to,
    adjusted_note: adjustedNote || null,
    total_income_rupees: paiseToRupees(totalInPaise),
    total_spent_rupees: paiseToRupees(totalOutPaise),
    net_savings_rupees: paiseToRupees(netSavingsPaise),
    balance_change: netSavingsPaise >= 0 ? `+₹${paiseToRupees(netSavingsPaise)}` : `−₹${paiseToRupees(Math.abs(netSavingsPaise))}`,
    transaction_count: txCount,
    top_3_expense_categories: top3,
    has_data: txCount > 0,
  };
}

/**
 * Tool 2: get_category_breakdown
 */
export async function executeCategoryBreakdown(rawArgs: any) {
  const parsed = CategoryBreakdownArgsSchema.safeParse(rawArgs);
  const args = parsed.success ? parsed.data : { from: undefined, to: undefined, type: 'expense' as const };
  const { from, to, adjustedNote } = normalizeDateRange(args.from, args.to);
  const dbType = args.type === 'income' ? 'in' : 'out';

  const db = await getDatabase();

  const totalRow = await db.getFirstAsync<{ total: number }>(
    `SELECT SUM(amount) as total
     FROM transactions
     WHERE type = ? AND date >= ? AND date <= ?;`,
    dbType,
    from,
    to
  );
  const overallTotal = totalRow?.total || 0;

  const rows = await db.getAllAsync<{ name: string; total: number; count: number }>(
    `SELECT c.name, SUM(t.amount) as total, COUNT(t.id) as count
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.type = ? AND t.date >= ? AND t.date <= ?
     GROUP BY c.id
     ORDER BY total DESC;`,
    dbType,
    from,
    to
  );

  const categories = rows.map((r) => ({
    category: r.name,
    total_rupees: paiseToRupees(r.total),
    percent: overallTotal > 0 ? Math.round((r.total / overallTotal) * 100) : 0,
    count: r.count,
  }));

  return {
    from,
    to,
    type: args.type,
    adjusted_note: adjustedNote || null,
    overall_total_rupees: paiseToRupees(overallTotal),
    categories,
    has_data: categories.length > 0,
  };
}

/**
 * Tool 3: get_trend
 */
export async function executeTrend(rawArgs: any) {
  const parsed = TrendArgsSchema.safeParse(rawArgs);
  const args = parsed.success
    ? parsed.data
    : { from: undefined, to: undefined, group_by: 'day' as const, category: undefined };
  const { from, to, adjustedNote } = normalizeDateRange(args.from, args.to);

  const db = await getDatabase();
  let query = `
    SELECT t.date, SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'out' AND t.date >= ? AND t.date <= ?
  `;
  const params: any[] = [from, to];

  if (args.category) {
    query += ' AND c.name LIKE ?';
    params.push(`%${args.category.trim()}%`);
  }

  query += ' GROUP BY t.date ORDER BY t.date ASC;';
  const rows = await db.getAllAsync<{ date: string; total: number }>(query, ...params);

  // If daily and > 31 rows, aggregate by week to respect max 31 points
  let points: { label: string; total_rupees: number }[] = [];

  if (args.group_by === 'day' && rows.length <= 31) {
    points = rows.map((r) => ({
      label: r.date.slice(5), // 'MM-DD'
      total_rupees: paiseToRupees(r.total),
    }));
  } else if (args.group_by === 'month') {
    const monthMap = new Map<string, number>();
    for (const r of rows) {
      const ym = r.date.slice(0, 7);
      monthMap.set(ym, (monthMap.get(ym) || 0) + r.total);
    }
    points = Array.from(monthMap.entries()).map(([ym, total]) => ({
      label: ym,
      total_rupees: paiseToRupees(total),
    }));
  } else {
    // Group into 7-day windows or weeks
    const weekMap = new Map<string, number>();
    for (const r of rows) {
      const dayNum = parseInt(r.date.split('-')[2], 10);
      const weekLabel = `W${Math.floor((dayNum - 1) / 7) + 1} (${r.date.slice(5, 7)})`;
      weekMap.set(weekLabel, (weekMap.get(weekLabel) || 0) + r.total);
    }
    points = Array.from(weekMap.entries()).map(([label, total]) => ({
      label,
      total_rupees: paiseToRupees(total),
    }));
  }

  return {
    from,
    to,
    group_by: args.group_by,
    category: args.category || 'all',
    adjusted_note: adjustedNote || null,
    point_count: points.length,
    points,
    has_data: points.length > 0,
  };
}

/**
 * Tool 4: get_transactions
 */
export async function executeTransactions(rawArgs: any) {
  const parsed = TransactionsArgsSchema.safeParse(rawArgs);
  const args = parsed.success
    ? parsed.data
    : { from: undefined, to: undefined, category: undefined, search: undefined, sort: 'date_desc' as const, limit: 10 };
  const { from, to, adjustedNote } = normalizeDateRange(args.from, args.to);
  const limit = Math.min(args.limit || 10, 15);

  const db = await getDatabase();

  let countQuery = `
    SELECT COUNT(*) as count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.date >= ? AND t.date <= ?
  `;
  const countParams: any[] = [from, to];

  if (args.category) {
    countQuery += ' AND c.name LIKE ?';
    countParams.push(`%${args.category.trim()}%`);
  }
  if (args.search) {
    countQuery += ' AND (t.note LIKE ? OR c.name LIKE ?)';
    countParams.push(`%${args.search.trim()}%`, `%${args.search.trim()}%`);
  }

  const countRow = await db.getFirstAsync<{ count: number }>(countQuery, ...countParams);
  const totalCount = countRow?.count || 0;

  let query = `
    SELECT t.date, t.type, c.name as category, t.amount, t.note
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.date >= ? AND t.date <= ?
  `;
  const params: any[] = [from, to];

  if (args.category) {
    query += ' AND c.name LIKE ?';
    params.push(`%${args.category.trim()}%`);
  }
  if (args.search) {
    query += ' AND (t.note LIKE ? OR c.name LIKE ?)';
    params.push(`%${args.search.trim()}%`, `%${args.search.trim()}%`);
  }

  if (args.sort === 'amount_desc') {
    query += ' ORDER BY t.amount DESC, t.date DESC LIMIT ?;';
  } else {
    query += ' ORDER BY t.date DESC, t.id DESC LIMIT ?;';
  }
  params.push(limit);

  const rows = await db.getAllAsync<{
    date: string;
    type: 'in' | 'out';
    category: string;
    amount: number;
    note: string;
  }>(query, ...params);

  const txs = rows.map((r) => ({
    date: r.date,
    type: r.type === 'in' ? 'income' : 'expense',
    category: r.category,
    amount_rupees: paiseToRupees(r.amount),
    note: r.note || '',
  }));

  return {
    from,
    to,
    adjusted_note: adjustedNote || null,
    total_count: totalCount,
    returned_count: txs.length,
    has_more: totalCount > txs.length,
    transactions: txs,
  };
}

/**
 * Tool 5: compare_periods
 */
export async function executeComparePeriods(rawArgs: any) {
  const parsed = ComparePeriodsArgsSchema.safeParse(rawArgs);
  const args = parsed.success
    ? parsed.data
    : { from_a: undefined, to_a: undefined, from_b: undefined, to_b: undefined };

  const periodA = normalizeDateRange(args.from_a, args.to_a);
  const periodB = normalizeDateRange(args.from_b, args.to_b);

  const db = await getDatabase();

  // Helper for period totals
  const getTotals = async (from: string, to: string) => {
    const rows = await db.getAllAsync<{ type: 'in' | 'out'; total: number }>(
      `SELECT type, SUM(amount) as total
       FROM transactions
       WHERE date >= ? AND date <= ?
       GROUP BY type;`,
      from,
      to
    );
    let inPaise = 0;
    let outPaise = 0;
    for (const r of rows) {
      if (r.type === 'in') inPaise = r.total;
      if (r.type === 'out') outPaise = r.total;
    }
    return {
      income_rupees: paiseToRupees(inPaise),
      spent_rupees: paiseToRupees(outPaise),
      net_rupees: paiseToRupees(inPaise - outPaise),
    };
  };

  const aTotals = await getTotals(periodA.from, periodA.to);
  const bTotals = await getTotals(periodB.from, periodB.to);

  const spentDiffRupees = bTotals.spent_rupees - aTotals.spent_rupees;
  let percentChangeSpent = 0;
  if (aTotals.spent_rupees > 0) {
    percentChangeSpent = Math.round((spentDiffRupees / aTotals.spent_rupees) * 100);
  }

  // Per category comparison for expenses
  const catRowsA = await db.getAllAsync<{ name: string; total: number }>(
    `SELECT c.name, SUM(t.amount) as total
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.type = 'out' AND t.date >= ? AND t.date <= ?
     GROUP BY c.id;`,
    periodA.from,
    periodA.to
  );

  const catRowsB = await db.getAllAsync<{ name: string; total: number }>(
    `SELECT c.name, SUM(t.amount) as total
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.type = 'out' AND t.date >= ? AND t.date <= ?
     GROUP BY c.id;`,
    periodB.from,
    periodB.to
  );

  const catMap = new Map<string, { aRupees: number; bRupees: number }>();
  for (const r of catRowsA) {
    catMap.set(r.name, { aRupees: paiseToRupees(r.total), bRupees: 0 });
  }
  for (const r of catRowsB) {
    const existing = catMap.get(r.name) || { aRupees: 0, bRupees: 0 };
    existing.bRupees = paiseToRupees(r.total);
    catMap.set(r.name, existing);
  }

  const categoryComparisons = Array.from(catMap.entries()).map(([name, data]) => {
    const diff = data.bRupees - data.aRupees;
    const pct = data.aRupees > 0 ? Math.round((diff / data.aRupees) * 100) : 0;
    return {
      category: name,
      period_a_rupees: data.aRupees,
      period_b_rupees: data.bRupees,
      difference_rupees: diff,
      percent_change: pct,
    };
  });

  return {
    period_a: { from: periodA.from, to: periodA.to, ...aTotals },
    period_b: { from: periodB.from, to: periodB.to, ...bTotals },
    spending_difference_rupees: spentDiffRupees,
    spending_percent_change: percentChangeSpent,
    category_comparisons: categoryComparisons.slice(0, 8),
  };
}

/**
 * Tool 6: show_chart (Local tool)
 * Validates spec, enforces safety rules, and generates a local data snapshot.
 */
export async function executeShowChart(rawArgs: any): Promise<{
  result: { ok: boolean };
  chartSnapshot: ChartSnapshot;
}> {
  const parsed = ShowChartArgsSchema.safeParse(rawArgs);
  const args = parsed.success
    ? parsed.data
    : {
        type: 'pie' as const,
        title: 'Spending Breakdown',
        metric: 'expense' as const,
        group_by: 'category' as const,
        from: undefined,
        to: undefined,
        category: undefined,
      };

  const { from, to } = normalizeDateRange(args.from, args.to);
  let chartType = args.type;

  // Safety fix: Line chart grouped by category is invalid; fallback to bar
  if (chartType === 'line' && args.group_by === 'category') {
    chartType = 'bar';
  }

  const db = await getDatabase();
  const dbType = args.metric === 'income' ? 'in' : 'out';

  const snapshotData: {
    label: string;
    value: number;
    color?: string;
    percent?: number;
  }[] = [];

  if (args.group_by === 'category' || chartType === 'pie') {
    // Category aggregation
    const rows = await db.getAllAsync<{ name: string; color: string; total: number }>(
      `SELECT c.name, c.color, SUM(t.amount) as total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.type = ? AND t.date >= ? AND t.date <= ?
       GROUP BY c.id
       ORDER BY total DESC;`,
      dbType,
      from,
      to
    );

    const totalPaiseAll = rows.reduce((acc, r) => acc + r.total, 0);

    if (chartType === 'pie') {
      // Max 6 slices: top 5 + "Others"
      const top5 = rows.slice(0, 5);
      const rest = rows.slice(5);

      for (const r of top5) {
        snapshotData.push({
          label: r.name,
          value: paiseToRupees(r.total),
          color: r.color,
          percent: totalPaiseAll > 0 ? Math.round((r.total / totalPaiseAll) * 100) : 0,
        });
      }

      if (rest.length > 0) {
        const otherPaise = rest.reduce((acc, r) => acc + r.total, 0);
        snapshotData.push({
          label: 'Others',
          value: paiseToRupees(otherPaise),
          color: '#94A3B8',
          percent: totalPaiseAll > 0 ? Math.round((otherPaise / totalPaiseAll) * 100) : 0,
        });
      }
    } else {
      // Bar chart by category
      for (const r of rows.slice(0, 8)) {
        snapshotData.push({
          label: r.name,
          value: paiseToRupees(r.total),
          color: r.color,
          percent: totalPaiseAll > 0 ? Math.round((r.total / totalPaiseAll) * 100) : 0,
        });
      }
    }
  } else {
    // Time-based aggregation (day / week / month)
    const rows = await db.getAllAsync<{ date: string; total: number }>(
      `SELECT t.date, SUM(t.amount) as total
       FROM transactions t
       WHERE t.type = ? AND t.date >= ? AND t.date <= ?
       GROUP BY t.date
       ORDER BY t.date ASC;`,
      dbType,
      from,
      to
    );

    // Limit to max 31 points
    const step = Math.max(1, Math.ceil(rows.length / 31));
    for (let i = 0; i < rows.length; i += step) {
      const r = rows[i];
      snapshotData.push({
        label: r.date.slice(5),
        value: paiseToRupees(r.total),
      });
    }
  }

  const today = new Date().toISOString().split('T')[0];

  const snapshot: ChartSnapshot = {
    type: chartType,
    title: args.title,
    metric: args.metric,
    from,
    to,
    created_date: today,
    data: snapshotData,
  };

  return {
    result: { ok: true },
    chartSnapshot: snapshot,
  };
}
