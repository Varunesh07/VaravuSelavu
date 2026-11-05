import { z } from 'zod';

export const BACKUP_FILE_NAME = 'varavuselavu-backup.json';
export const BACKUP_PREV_FILE_NAME = 'varavuselavu-backup-prev.json';

// Zod Validation Schema for backup files
export const BackupDataSchema = z.object({
  app: z.literal('varavuselavu'),
  schema_version: z.number().int().min(1),
  exported_at: z.number(),
  categories: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      type: z.enum(['in', 'out']),
      icon: z.string(),
      color: z.string(),
      sort_order: z.number().default(0),
      hidden: z.number().default(0),
    })
  ),
  transactions: z.array(
    z.object({
      id: z.number().optional(),
      type: z.enum(['in', 'out']),
      amount: z.number().int().positive(),
      category_id: z.number(),
      note: z.string().default(''),
      date: z.string(),
      created_at: z.number().optional(),
      updated_at: z.number().optional(),
    })
  ),
  chats: z
    .array(
      z.object({
        id: z.number(),
        title: z.string(),
        created_at: z.number(),
        updated_at: z.number(),
      })
    )
    .default([]),
  messages: z
    .array(
      z.object({
        id: z.number().optional(),
        chat_id: z.number(),
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        chart_json: z.string().nullable().optional(),
        created_at: z.number(),
      })
    )
    .default([]),
  settings: z.record(z.string(), z.string()).optional(),
});

export type BackupData = z.infer<typeof BackupDataSchema>;
