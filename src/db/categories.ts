import { getDatabase } from './index';

export interface Category {
  id: number;
  name: string;
  type: 'in' | 'out';
  icon: string;
  color: string;
  sort_order: number;
  hidden: number; // 0 or 1
}

/**
 * Retrieves categories, optionally filtered by type (in/out) and hidden status.
 */
export async function getCategories(options?: {
  type?: 'in' | 'out';
  includeHidden?: boolean;
}): Promise<Category[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM categories WHERE 1=1';
  const params: any[] = [];

  if (options?.type) {
    query += ' AND type = ?';
    params.push(options.type);
  }

  if (!options?.includeHidden) {
    query += ' AND hidden = 0';
  }

  query += ' ORDER BY sort_order ASC, id ASC;';
  return db.getAllAsync<Category>(query, ...params);
}

/**
 * Retrieves a single category by ID (even if hidden).
 */
export async function getCategoryById(id: number): Promise<Category | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?;', id);
}

/**
 * Adds a new custom category.
 */
export async function createCategory(
  category: Omit<Category, 'id' | 'hidden'>
): Promise<number> {
  const db = await getDatabase();
  const res = await db.runAsync(
    `INSERT INTO categories (name, type, icon, color, sort_order, hidden)
     VALUES (?, ?, ?, ?, ?, 0);`,
    category.name.trim(),
    category.type,
    category.icon,
    category.color,
    category.sort_order
  );
  return res.lastInsertRowId;
}

/**
 * Updates an existing category (e.g. rename, change color, icon, hidden).
 */
export async function updateCategory(
  id: number,
  fields: Partial<Omit<Category, 'id'>>
): Promise<void> {
  const db = await getDatabase();
  const keys = Object.keys(fields);
  if (keys.length === 0) return;

  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  await db.runAsync(`UPDATE categories SET ${setClause} WHERE id = ?;`, ...values, id);
}

/**
 * Hides a category instead of hard deleting (preserves historical transaction integrity).
 */
export async function hideCategory(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE categories SET hidden = 1 WHERE id = ?;', id);
}

/**
 * Unhides a previously hidden category.
 */
export async function unhideCategory(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE categories SET hidden = 0 WHERE id = ?;', id);
}

/**
 * Gets the number of transactions associated with a category.
 */
export async function getCategoryTransactionCount(categoryId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?;',
    categoryId
  );
  return row?.count || 0;
}

/**
 * Deletes a category if it is not used in any transactions.
 * If used, returns success: false.
 */
export async function deleteCategory(
  categoryId: number
): Promise<{ success: boolean; error?: string }> {
  const count = await getCategoryTransactionCount(categoryId);
  if (count > 0) {
    return {
      success: false,
      error: `Category is used in ${count} transaction(s). You can hide it instead.`,
    };
  }

  const db = await getDatabase();
  await db.runAsync('DELETE FROM categories WHERE id = ?;', categoryId);
  return { success: true };
}
