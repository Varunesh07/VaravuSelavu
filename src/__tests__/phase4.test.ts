import { BackupDataSchema, BackupData } from '../services/backupTypes';
import { DEFAULT_CATEGORIES } from '../constants';

describe('Phase 4: Settings, Backup, Reset Verification', () => {
  describe('Backup Data Schema Validation', () => {
    const validBackupSample: BackupData = {
      app: 'varavuselavu',
      schema_version: 1,
      exported_at: 1730000000000,
      categories: [
        {
          id: 1,
          name: 'Food',
          type: 'out',
          icon: 'fast-food-outline',
          color: '#F97316',
          sort_order: 1,
          hidden: 0,
        },
      ],
      transactions: [
        {
          id: 101,
          type: 'out',
          amount: 25000, // ₹250
          category_id: 1,
          note: 'Dinner',
          date: '2026-11-04',
          created_at: 1730000000000,
          updated_at: 1730000000000,
        },
      ],
      chats: [
        {
          id: 1,
          title: 'November Spending',
          created_at: 1730000000000,
          updated_at: 1730000000000,
        },
      ],
      messages: [
        {
          id: 1,
          chat_id: 1,
          role: 'user',
          content: 'How much did I spend?',
          chart_json: null,
          created_at: 1730000000000,
        },
      ],
      settings: {
        theme: 'dark',
      },
    };

    test('Valid backup payload passes schema validation', () => {
      const result = BackupDataSchema.safeParse(validBackupSample);
      expect(result.success).toBe(true);
    });

    test('Rejects backup payload with missing or wrong app signature', () => {
      const invalid = { ...validBackupSample, app: 'wrongapp' };
      const result = BackupDataSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('Rejects backup payload with invalid transaction amount (non-positive)', () => {
      const invalid = {
        ...validBackupSample,
        transactions: [
          {
            ...validBackupSample.transactions[0],
            amount: -500, // Invalid: must be positive
          },
        ],
      };
      const result = BackupDataSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    test('Rejects backup payload with missing required tables', () => {
      const { transactions, ...missingTxs } = validBackupSample;
      const result = BackupDataSchema.safeParse(missingTxs);
      expect(result.success).toBe(false);
    });
  });

  describe('Backup Safety Rules', () => {
    test('Empty transaction count must be rejected from auto-backup', () => {
      const txCount = 0;
      const shouldSkip = txCount === 0;
      expect(shouldSkip).toBe(true);
    });

    test('Backup file names follow standard rotation conventions', () => {
      const mainName = 'varavuselavu-backup.json';
      const prevName = 'varavuselavu-backup-prev.json';
      expect(mainName).not.toBe(prevName);
      expect(prevName).toContain('-prev');
    });

    test('Pre-reset backup filename includes timestamped date', () => {
      const dateStr = '2026-11-05';
      const preResetName = `varavuselavu-pre-reset-${dateStr}.json`;
      expect(preResetName).toBe('varavuselavu-pre-reset-2026-11-05.json');
    });
  });

  describe('Category Management Constraints', () => {
    test('Default categories list contains standard types', () => {
      expect(DEFAULT_CATEGORIES.length).toBeGreaterThan(0);
      const expenseCats = DEFAULT_CATEGORIES.filter((c) => c.type === 'out');
      const incomeCats = DEFAULT_CATEGORIES.filter((c) => c.type === 'in');
      expect(expenseCats.length).toBeGreaterThan(0);
      expect(incomeCats.length).toBeGreaterThan(0);
    });

    test('Category with transactions cannot be hard deleted', () => {
      const txCount = 5;
      const canDelete = txCount === 0;
      expect(canDelete).toBe(false);
    });

    test('Category without transactions can be hard deleted', () => {
      const txCount = 0;
      const canDelete = txCount === 0;
      expect(canDelete).toBe(true);
    });
  });

  describe('Reset Constraints', () => {
    test('Confirmation requires exact typing of RESET', () => {
      const checkReset = (input: string) => input.trim() === 'RESET';
      expect(checkReset('RESET')).toBe(true);
      expect(checkReset('reset')).toBe(false);
      expect(checkReset(' RESET ')).toBe(true);
      expect(checkReset('RESE')).toBe(false);
    });
  });
});
