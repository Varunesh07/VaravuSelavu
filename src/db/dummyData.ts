import { getDatabase } from './index';
import { getCategories } from './categories';
import { useDataStore } from '../store/dataStore';

const SAMPLE_EXPENSE_NOTES = [
  'Chai and samosa',
  'Metro card reload',
  'Hostel canteen dinner',
  'Amazon essentials',
  'College stationery & printouts',
  'Biryani with friends',
  'Uber auto to junction',
  'Coffee and puffs',
  'Grocery snacks & milk',
  'Movie tickets & popcorn',
  'Phone recharge',
  'Bus fare',
  'Textbook photocopy',
  'Medicine from pharmacy',
  'T-shirt from Zudio',
];

const SAMPLE_INCOME_NOTES = [
  'Pocket money from dad',
  'Freelance web bug fix',
  'Birthday gift from uncle',
  'Tutoring junior student',
  'Hackathon cash prize',
  'Reimbursement',
];

/**
 * Generates N dummy transactions distributed over the past 365 days.
 * Only intended for use in development / testing.
 */
export async function generateDummyTransactions(count: number): Promise<void> {
  const db = await getDatabase();
  const categories = await getCategories({ includeHidden: true });

  const inCategories = categories.filter((c) => c.type === 'in');
  const outCategories = categories.filter((c) => c.type === 'out');

  if (outCategories.length === 0 || inCategories.length === 0) {
    throw new Error('Please ensure default categories are seeded before generating dummy data.');
  }

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // Prepare batch statements
  const batchSize = 250;
  let inserted = 0;

  while (inserted < count) {
    const currentBatch = Math.min(batchSize, count - inserted);
    const rows: {
      type: 'in' | 'out';
      amount: number;
      category_id: number;
      note: string;
      date: string;
      created_at: number;
      updated_at: number;
    }[] = [];

    for (let i = 0; i < currentBatch; i++) {
      // 85% expenses, 15% income
      const isIncome = Math.random() < 0.15;
      const type: 'in' | 'out' = isIncome ? 'in' : 'out';

      // Pick category
      const catList = isIncome ? inCategories : outCategories;
      const cat = catList[Math.floor(Math.random() * catList.length)];

      // Pick date within last 365 days
      const daysAgo = Math.floor(Math.random() * 365);
      const txDate = new Date(now.getTime() - daysAgo * dayMs);
      const year = txDate.getFullYear();
      const month = String(txDate.getMonth() + 1).padStart(2, '0');
      const day = String(txDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Pick realistic amounts in paise
      let amountInPaise: number;
      let note: string;

      if (isIncome) {
        // Income: ₹1,000 to ₹25,000
        const rupees = Math.floor(Math.random() * 240 + 10) * 100;
        amountInPaise = rupees * 100;
        note = SAMPLE_INCOME_NOTES[Math.floor(Math.random() * SAMPLE_INCOME_NOTES.length)];
      } else {
        // Expense: ₹20 to ₹1,500
        const rupees = Math.floor(Math.random() * 148 + 2) * 10;
        amountInPaise = rupees * 100;
        note = SAMPLE_EXPENSE_NOTES[Math.floor(Math.random() * SAMPLE_EXPENSE_NOTES.length)];
      }

      const txTime = txDate.getTime();
      rows.push({
        type,
        amount: amountInPaise,
        category_id: cat.id,
        note,
        date: dateStr,
        created_at: txTime,
        updated_at: txTime,
      });
    }

    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        await db.runAsync(
          `INSERT INTO transactions (type, amount, category_id, note, date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          row.type,
          row.amount,
          row.category_id,
          row.note,
          row.date,
          row.created_at,
          row.updated_at
        );
      }
    });

    inserted += currentBatch;
  }

  useDataStore.getState().bumpDataVersion();
}

/**
 * Clears all transactions from the database (DEV only).
 */
export async function clearAllTransactions(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM transactions;');
  useDataStore.getState().bumpDataVersion();
}

