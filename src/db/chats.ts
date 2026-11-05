import { getDatabase } from './index';

export interface Chat {
  id: number;
  title: string;
  created_at: number;
  updated_at: number;
  message_count?: number;
  last_message?: string;
}

export interface ChatMessage {
  id: number;
  chat_id: number;
  role: 'user' | 'assistant';
  content: string;
  chart_json: string | null;
  created_at: number;
}

const MAX_SAVED_CHATS = 50;

/**
 * Creates a new chat row and returns the new chat ID.
 */
export async function createChat(title = 'New chat'): Promise<number> {
  const db = await getDatabase();
  const now = Date.now();

  const res = await db.runAsync(
    `INSERT INTO chats (title, created_at, updated_at) VALUES (?, ?, ?);`,
    title,
    now,
    now
  );

  await enforceChatLimit();
  return res.lastInsertRowId;
}

/**
 * Deletes oldest chats if total count exceeds 50.
 */
async function enforceChatLimit(): Promise<void> {
  const db = await getDatabase();
  const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM chats;');
  const count = countRow?.count || 0;

  if (count > MAX_SAVED_CHATS) {
    const excess = count - MAX_SAVED_CHATS;
    await db.runAsync(
      `DELETE FROM chats WHERE id IN (
        SELECT id FROM chats ORDER BY updated_at ASC LIMIT ?
      );`,
      excess
    );
  }
}

/**
 * Retrieves all saved chats (up to 50), sorted by last updated first.
 */
export async function getChats(): Promise<Chat[]> {
  const db = await getDatabase();
  return db.getAllAsync<Chat>(
    `SELECT c.*, 
            (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as message_count,
            (SELECT content FROM messages m WHERE m.chat_id = c.id ORDER BY id DESC LIMIT 1) as last_message
     FROM chats c
     ORDER BY c.updated_at DESC
     LIMIT ?;`,
    MAX_SAVED_CHATS
  );
}

/**
 * Retrieves a single chat by ID.
 */
export async function getChatById(id: number): Promise<Chat | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Chat>('SELECT * FROM chats WHERE id = ?;', id);
}

/**
 * Updates a chat's title.
 */
export async function updateChatTitle(id: number, title: string): Promise<void> {
  const db = await getDatabase();
  const cleanTitle = title.trim().slice(0, 40);
  await db.runAsync(
    `UPDATE chats SET title = ?, updated_at = ? WHERE id = ?;`,
    cleanTitle,
    Date.now(),
    id
  );
}

/**
 * Deletes a chat and all its associated messages (cascades).
 */
export async function deleteChat(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM chats WHERE id = ?;', id);
}

/**
 * Retrieves all messages in a chat session in chronological order.
 */
export async function getMessages(chatId: number): Promise<ChatMessage[]> {
  const db = await getDatabase();
  return db.getAllAsync<ChatMessage>(
    `SELECT * FROM messages WHERE chat_id = ? ORDER BY id ASC;`,
    chatId
  );
}

/**
 * Inserts a message into a chat and updates the chat's updated_at timestamp.
 */
export async function insertMessage(
  chatId: number,
  role: 'user' | 'assistant',
  content: string,
  chartJson?: string | null
): Promise<number> {
  const db = await getDatabase();
  const now = Date.now();

  const res = await db.runAsync(
    `INSERT INTO messages (chat_id, role, content, chart_json, created_at)
     VALUES (?, ?, ?, ?, ?);`,
    chatId,
    role,
    content,
    chartJson || null,
    now
  );

  // Update chat updated_at
  await db.runAsync(`UPDATE chats SET updated_at = ? WHERE id = ?;`, now, chatId);

  return res.lastInsertRowId;
}

/**
 * Deletes a single message (e.g. for retrying).
 */
export async function deleteMessage(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM messages WHERE id = ?;', id);
}

