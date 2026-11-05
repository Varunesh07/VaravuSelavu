import { getDatabase } from './index';
import { TransactionWithCategory } from './transactions';
import { paiseToRupees } from '../utils/money';
import { getTodayDateString, getCurrentYearMonth, getMonthRange } from '../utils/dates';

export interface AllTimeTotals {
  totalIncomePaise: number;
  totalExpensePaise: number;
  netPaise: number;
}

export interface TopCategoryStat {
  id: number;
  name: string;
  icon: string;
  color: string;
  totalPaise: number;
  count: number;
  percent: number;
}

export type ChartPeriod = 'week' | 'month' | 'year';

export interface PieChartSlice {
  value: number; // in Rupees
  color: string;
  label: string;
  percent: number;
}

export interface BarChartItem {
  value: number; // in Rupees
  label: string;
  frontColor?: string;
}

export interface LineChartPoint {
  value: number; // in Rupees
  label: string;
  dataPointText?: string;
}

/**
 * Returns all-time income, expense, and net balance in paise.
 */
export async function getAllTimeTotals(): Promise<AllTimeTotals> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ type: 'in' | 'out'; total: number }>(
    `SELECT type, SUM(amount) as total
     FROM transactions
     GROUP BY type;`
  );

  let totalIncomePaise = 0;
  let totalExpensePaise = 0;

  for (const row of rows) {
    if (row.type === 'in') {
      totalIncomePaise = row.total || 0;
    } else if (row.type === 'out') {
      totalExpensePaise = row.total || 0;
    }
  }

  return {
    totalIncomePaise,
    totalExpensePaise,
    netPaise: totalIncomePaise - totalExpensePaise,
  };
}

/**
 * Returns top spending categories sorted by highest expense.
 */
export async function getTopCategories(limit = 4): Promise<TopCategoryStat[]> {
  const db = await getDatabase();

  const totalExpenseRow = await db.getFirstAsync<{ total: number }>(
    `SELECT SUM(amount) as total FROM transactions WHERE type = 'out';`
  );
  const totalExpense = totalExpenseRow?.total || 0;

  const rows = await db.getAllAsync<{
    id: number;
    name: string;
    icon: string;
    color: string;
    totalPaise: number;
    count: number;
  }>(
    `SELECT c.id, c.name, c.icon, c.color, SUM(t.amount) as totalPaise, COUNT(t.id) as count
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.type = 'out'
     GROUP BY c.id
     ORDER BY totalPaise DESC
     LIMIT ?;`,
    limit
  );

  return rows.map((r) => ({
    ...r,
    percent: totalExpense > 0 ? Math.round((r.totalPaise / totalExpense) * 100) : 0,
  }));
}

/**
 * Returns recent transactions for the Home feed.
 */
export async function getRecentTransactions(limit = 5): Promise<TransactionWithCategory[]> {
  const db = await getDatabase();
  return db.getAllAsync<TransactionWithCategory>(
    `SELECT t.*, 
            c.name as category_name, 
            c.icon as category_icon, 
            c.color as category_color, 
            c.hidden as category_hidden
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     ORDER BY t.date DESC, t.id DESC
     LIMIT ?;`,
    limit
  );
}

/**
 * Helper to compute date range strings for periods.
 */
function getPeriodDateRange(period: ChartPeriod): { from: string; to: string } {
  const today = getTodayDateString();
  const [currentYear, currentMonth, currentDay] = today.split('-').map(Number);

  if (period === 'week') {
    const d = new Date(currentYear, currentMonth - 1, currentDay);
    d.setDate(d.getDate() - 6);
    const fromYear = d.getFullYear();
    const fromMonth = String(d.getMonth() + 1).padStart(2, '0');
    const fromDay = String(d.getDate()).padStart(2, '0');
    return {
      from: `${fromYear}-${fromMonth}-${fromDay}`,
      to: today,
    };
  }

  if (period === 'month') {
    const ym = getCurrentYearMonth();
    return getMonthRange(ym);
  }

  // period === 'year'
  return {
    from: `${currentYear}-01-01`,
    to: `${currentYear}-12-31`,
  };
}

/**
 * Aggregates Pie Chart data for expenses in the given period.
 * Max 6 slices: top 5 categories + "Other" if there are more.
 */
export async function getPieChartData(period: ChartPeriod): Promise<PieChartSlice[]> {
  const db = await getDatabase();
  const { from, to } = getPeriodDateRange(period);

  const rows = await db.getAllAsync<{
    name: string;
    color: string;
    totalPaise: number;
  }>(
    `SELECT c.name, c.color, SUM(t.amount) as totalPaise
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.type = 'out' AND t.date >= ? AND t.date <= ?
     GROUP BY c.id
     ORDER BY totalPaise DESC;`,
    from,
    to
  );

  if (rows.length === 0) return [];

  const totalPaiseAll = rows.reduce((acc, r) => acc + r.totalPaise, 0);
  if (totalPaiseAll === 0) return [];

  const slices: PieChartSlice[] = [];
  const topRows = rows.slice(0, 5);
  const remainingRows = rows.slice(5);

  for (const r of topRows) {
    slices.push({
      value: paiseToRupees(r.totalPaise),
      color: r.color,
      label: r.name,
      percent: Math.round((r.totalPaise / totalPaiseAll) * 100),
    });
  }

  if (remainingRows.length > 0) {
    const otherTotal = remainingRows.reduce((acc, r) => acc + r.totalPaise, 0);
    slices.push({
      value: paiseToRupees(otherTotal),
      color: '#94A3B8',
      label: 'Other',
      percent: Math.round((otherTotal / totalPaiseAll) * 100),
    });
  }

  return slices;
}

/**
 * Aggregates Bar Chart data for expenses in the given period.
 */
export async function getBarChartData(
  period: ChartPeriod,
  barColor = '#7C3AED'
): Promise<BarChartItem[]> {
  const db = await getDatabase();
  const today = getTodayDateString();
  const [currentYear, currentMonth, currentDay] = today.split('-').map(Number);

  if (period === 'week') {
    // 7 days ending today
    const items: BarChartItem[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, currentDay - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const label = dayNames[d.getDay()];

      const row = await db.getFirstAsync<{ total: number }>(
        `SELECT SUM(amount) as total FROM transactions WHERE type = 'out' AND date = ?;`,
        dateStr
      );

      items.push({
        value: paiseToRupees(row?.total || 0),
        label,
        frontColor: barColor,
      });
    }

    return items;
  }

  if (period === 'month') {
    // Group month into 4 or 5 weeks
    const ym = getCurrentYearMonth();
    const rows = await db.getAllAsync<{ date: string; amount: number }>(
      `SELECT date, amount FROM transactions WHERE type = 'out' AND date LIKE ?;`,
      `${ym}-%`
    );

    const weekBuckets: number[] = [0, 0, 0, 0, 0];
    for (const r of rows) {
      const dayNum = parseInt(r.date.split('-')[2], 10);
      const weekIndex = Math.min(Math.floor((dayNum - 1) / 7), 4);
      weekBuckets[weekIndex] += r.amount;
    }

    return weekBuckets.map((paise, idx) => ({
      value: paiseToRupees(paise),
      label: `W${idx + 1}`,
      frontColor: barColor,
    }));
  }

  // period === 'year' (12 months)
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const items: BarChartItem[] = [];

  for (let m = 1; m <= 12; m++) {
    const paddedM = String(m).padStart(2, '0');
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT SUM(amount) as total FROM transactions WHERE type = 'out' AND date LIKE ?;`,
      `${currentYear}-${paddedM}-%`
    );

    items.push({
      value: paiseToRupees(row?.total || 0),
      label: monthLabels[m - 1],
      frontColor: barColor,
    });
  }

  return items;
}

/**
 * Aggregates Line Chart trend data for expenses in the given period.
 */
export async function getLineChartData(period: ChartPeriod): Promise<LineChartPoint[]> {
  const db = await getDatabase();
  const today = getTodayDateString();
  const [currentYear, currentMonth, currentDay] = today.split('-').map(Number);

  if (period === 'week') {
    // 7 points
    const points: LineChartPoint[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, currentDay - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      const row = await db.getFirstAsync<{ total: number }>(
        `SELECT SUM(amount) as total FROM transactions WHERE type = 'out' AND date = ?;`,
        dateStr
      );

      points.push({
        value: paiseToRupees(row?.total || 0),
        label: dayNames[d.getDay()],
      });
    }

    return points;
  }

  if (period === 'month') {
    // Days of current month up to today (or entire month)
    const ym = getCurrentYearMonth();
    const range = getMonthRange(ym);
    const lastDayNum = parseInt(range.to.split('-')[2], 10);

    const rows = await db.getAllAsync<{ date: string; total: number }>(
      `SELECT date, SUM(amount) as total 
       FROM transactions 
       WHERE type = 'out' AND date LIKE ?
       GROUP BY date;`,
      `${ym}-%`
    );

    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.date, r.total);
    }

    const points: LineChartPoint[] = [];
    for (let d = 1; d <= lastDayNum; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${ym}-${dayStr}`;
      const totalPaise = map.get(dateStr) || 0;
      // Show label every 5 days to avoid clutter
      const label = d === 1 || d % 5 === 0 || d === lastDayNum ? String(d) : '';

      points.push({
        value: paiseToRupees(totalPaise),
        label,
      });
    }

    return points;
  }

  // period === 'year' (12 points)
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const points: LineChartPoint[] = [];

  for (let m = 1; m <= 12; m++) {
    const paddedM = String(m).padStart(2, '0');
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT SUM(amount) as total FROM transactions WHERE type = 'out' AND date LIKE ?;`,
      `${currentYear}-${paddedM}-%`
    );

    points.push({
      value: paiseToRupees(row?.total || 0),
      label: monthLabels[m - 1],
    });
  }

  return points;
}

