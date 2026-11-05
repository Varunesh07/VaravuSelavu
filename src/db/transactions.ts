import { getDatabase } from './index';

export interface Transaction {
  id: number;
  type: 'in' | 'out';
  amount: number; // Stored in paise (integer > 0)
  category_id: number;
  note: string;
  date: string; // 'YYYY-MM-DD'
  created_at: number; // unix ms
  updated_at: number; // unix ms
}

export interface TransactionWithCategory extends Transaction {
  category_name: string;
  category_icon: string;
  category_color: string;
  category_hidden: number;
}

export interface CreateTransactionInput {
  type: 'in' | 'out';
  amount: number;
  category_id: number;
  note?: string;
  date: string;
}

export interface UpdateTransactionInput {
  type?: 'in' | 'out';
  amount?: number;
  category_id?: number;
  note?: string;
  date?: string;
}

/**
 * Inserts a new transaction. Amount must be integer paise > 0.
 */
export async function insertTransaction(input: CreateTransactionInput): Promise<number> {
  if (input.amount <= 0 || !Number.isInteger(input.amount)) {
    throw new Error('Transaction amount must be a positive integer in paise.');
  }

  const db = await getDatabase();
  const now = Date.now();
  const note = (input.note || '').trim();

  const res = await db.runAsync(
    `INSERT INTO transactions (type, amount, category_id, note, date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    input.type,
    input.amount,
    input.category_id,
    note,
    input.date,
    now,
    now
  );

  return res.lastInsertRowId;
}

/**
 * Updates an existing transaction by ID.
 */
export async function updateTransaction(
  id: number,
  input: UpdateTransactionInput
): Promise<void> {
  if (input.amount !== undefined && (input.amount <= 0 || !Number.isInteger(input.amount))) {
    throw new Error('Transaction amount must be a positive integer in paise.');
  }

  const db = await getDatabase();
  const now = Date.now();
  const fields: string[] = ['updated_at = ?'];
  const params: any[] = [now];

  if (input.type !== undefined) {
    fields.push('type = ?');
    params.push(input.type);
  }
  if (input.amount !== undefined) {
    fields.push('amount = ?');
    params.push(input.amount);
  }
  if (input.category_id !== undefined) {
    fields.push('category_id = ?');
    params.push(input.category_id);
  }
  if (input.note !== undefined) {
    fields.push('note = ?');
    params.push(input.note.trim());
  }
  if (input.date !== undefined) {
    fields.push('date = ?');
    params.push(input.date);
  }

  params.push(id);
  await db.runAsync(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?;`, ...params);
}

/**
 * Deletes a transaction by ID.
 */
export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM transactions WHERE id = ?;', id);
}

/**
 * Retrieves a single transaction joined with category metadata.
 */
export async function getTransactionById(id: number): Promise<TransactionWithCategory | null> {
  const db = await getDatabase();
  return db.getFirstAsync<TransactionWithCategory>(
    `SELECT t.*, 
            c.name as category_name, 
            c.icon as category_icon, 
            c.color as category_color, 
            c.hidden as category_hidden
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.id = ?;`,
    id
  );
}

/**
 * Retrieves transactions for a month ('YYYY-MM'), with optional category filter and search string.
 */
export async function getTransactionsByMonth(
  yearMonth: string,
  categoryId?: number,
  search?: string
): Promise<TransactionWithCategory[]> {
  const db = await getDatabase();
  let query = `
    SELECT t.*, 
           c.name as category_name, 
           c.icon as category_icon, 
           c.color as category_color, 
           c.hidden as category_hidden
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.date LIKE ?
  `;
  const params: any[] = [`${yearMonth}-%`];

  if (categoryId) {
    query += ' AND t.category_id = ?';
    params.push(categoryId);
  }

  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    query += ' AND (t.note LIKE ? OR c.name LIKE ?)';
    params.push(term, term);
  }

  query += ' ORDER BY t.date DESC, t.id DESC;';
  return db.getAllAsync<TransactionWithCategory>(query, ...params);
}

/**
 * Retrieves transactions for a specific date ('YYYY-MM-DD').
 */
export async function getTransactionsByDay(date: string): Promise<TransactionWithCategory[]> {
  const db = await getDatabase();
  return db.getAllAsync<TransactionWithCategory>(
    `SELECT t.*, 
            c.name as category_name, 
            c.icon as category_icon, 
            c.color as category_color, 
            c.hidden as category_hidden
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.date = ?
     ORDER BY t.id DESC;`,
    date
  );
}

/**
 * Returns a summary of which days in a month ('YYYY-MM') have transactions,
 * separated by expense and income. Useful for calendar dots.
 */
export async function getDaysWithTransactionsInMonth(
  yearMonth: string
): Promise<Record<string, { hasExpense: boolean; hasIncome: boolean }>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ date: string; type: 'in' | 'out' }>(
    `SELECT date, type FROM transactions
     WHERE date LIKE ?
     GROUP BY date, type;`,
    `${yearMonth}-%`
  );

  const result: Record<string, { hasExpense: boolean; hasIncome: boolean }> = {};
  for (const row of rows) {
    if (!result[row.date]) {
      result[row.date] = { hasExpense: false, hasIncome: false };
    }
    if (row.type === 'out') {
      result[row.date].hasExpense = true;
    } else if (row.type === 'in') {
      result[row.date].hasIncome = true;
    }
  }

  return result;
}

/**
 * Returns total expense and income (in paise) for a given day.
 */
export async function getDailyTotalsForDay(
  date: string
): Promise<{ expensePaise: number; incomePaise: number }> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ type: 'in' | 'out'; total: number }>(
    `SELECT type, SUM(amount) as total
     FROM transactions
     WHERE date = ?
     GROUP BY type;`,
    date
  );

  let expensePaise = 0;
  let incomePaise = 0;

  for (const row of rows) {
    if (row.type === 'out') {
      expensePaise = row.total || 0;
    } else if (row.type === 'in') {
      incomePaise = row.total || 0;
    }
  }

  return { expensePaise, incomePaise };
}

