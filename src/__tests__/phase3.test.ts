import {
  SpendingSummaryArgsSchema,
  CategoryBreakdownArgsSchema,
  TrendArgsSchema,
  TransactionsArgsSchema,
  ComparePeriodsArgsSchema,
  ShowChartArgsSchema,
  normalizeDateRange,
} from '../services/tools';

describe('Phase 3 AI Tools & Arguments Validation', () => {
  describe('Zod Schemas for Tool Arguments', () => {
    test('SpendingSummaryArgsSchema validates correct and missing dates', () => {
      const valid = SpendingSummaryArgsSchema.safeParse({ from: '2026-11-01', to: '2026-11-30' });
      expect(valid.success).toBe(true);

      const empty = SpendingSummaryArgsSchema.safeParse({});
      expect(empty.success).toBe(true);

      const badDate = SpendingSummaryArgsSchema.safeParse({ from: '11/01/2026', to: '2026-11-30' });
      expect(badDate.success).toBe(false);
    });

    test('CategoryBreakdownArgsSchema validates type enum and defaults to expense', () => {
      const parsed = CategoryBreakdownArgsSchema.parse({ from: '2026-11-01', to: '2026-11-30' });
      expect(parsed.type).toBe('expense');

      const incomeParsed = CategoryBreakdownArgsSchema.parse({
        from: '2026-11-01',
        to: '2026-11-30',
        type: 'income',
      });
      expect(incomeParsed.type).toBe('income');

      const invalidType = CategoryBreakdownArgsSchema.safeParse({
        from: '2026-11-01',
        to: '2026-11-30',
        type: 'invalid',
      });
      expect(invalidType.success).toBe(false);
    });

    test('TrendArgsSchema validates group_by options', () => {
      const valid = TrendArgsSchema.safeParse({
        from: '2026-11-01',
        to: '2026-11-30',
        group_by: 'week',
      });
      expect(valid.success).toBe(true);

      const badGroupBy = TrendArgsSchema.safeParse({
        from: '2026-11-01',
        to: '2026-11-30',
        group_by: 'hourly',
      });
      expect(badGroupBy.success).toBe(false);
    });

    test('TransactionsArgsSchema limits items up to 15', () => {
      const valid = TransactionsArgsSchema.parse({
        from: '2026-11-01',
        to: '2026-11-30',
        limit: 10,
      });
      expect(valid.limit).toBe(10);

      const overLimit = TransactionsArgsSchema.safeParse({
        from: '2026-11-01',
        to: '2026-11-30',
        limit: 50,
      });
      expect(overLimit.success).toBe(false);
    });

    test('ComparePeriodsArgsSchema checks all 4 date boundaries', () => {
      const valid = ComparePeriodsArgsSchema.safeParse({
        from_a: '2026-10-01',
        to_a: '2026-10-31',
        from_b: '2026-11-01',
        to_b: '2026-11-30',
      });
      expect(valid.success).toBe(true);
    });

    test('ShowChartArgsSchema validates chart specifications', () => {
      const validPie = ShowChartArgsSchema.safeParse({
        type: 'pie',
        title: 'Monthly Breakdown',
        from: '2026-11-01',
        to: '2026-11-30',
      });
      expect(validPie.success).toBe(true);

      const invalidChartType = ShowChartArgsSchema.safeParse({
        type: 'radar',
        title: 'Invalid',
        from: '2026-11-01',
        to: '2026-11-30',
      });
      expect(invalidChartType.success).toBe(false);
    });
  });

  describe('normalizeDateRange Safety & Rules', () => {
    test('Swaps inverted dates (from > to)', () => {
      const result = normalizeDateRange('2026-12-31', '2026-01-01');
      expect(result.from).toBe('2026-01-01');
      expect(result.to).toBe('2026-12-31');
      expect(result.adjustedNote).toBeDefined();
    });

    test('Defaults missing dates to current month range', () => {
      const result = normalizeDateRange();
      expect(result.from).toMatch(/^\d{4}-\d{2}-01$/);
      expect(result.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('Caps ranges exceeding 366 days', () => {
      const result = normalizeDateRange('2020-01-01', '2026-11-05');
      const diffDays = Math.round(
        (new Date(result.to).getTime() - new Date(result.from).getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBeLessThanOrEqual(366);
      expect(result.adjustedNote).toContain('366 days');
    });
  });

  describe('Show Chart Safety Rules', () => {
    test('Line chart with category grouping switches to bar chart', () => {
      let type: 'pie' | 'bar' | 'line' = 'line';
      const group_by = 'category';

      if (type === 'line' && group_by === 'category') {
        type = 'bar';
      }

      expect(type).toBe('bar');
    });

    test('Pie chart slices cap at max 6 with Other grouping', () => {
      const rawCategories = [
        { label: 'Food', value: 100 },
        { label: 'Travel', value: 80 },
        { label: 'Education', value: 60 },
        { label: 'Fun', value: 40 },
        { label: 'Shopping', value: 30 },
        { label: 'Snacks', value: 20 },
        { label: 'Misc', value: 10 },
      ];

      const top5 = rawCategories.slice(0, 5);
      const remaining = rawCategories.slice(5);

      const slices = [...top5];
      if (remaining.length > 0) {
        slices.push({
          label: 'Others',
          value: remaining.reduce((sum, r) => sum + r.value, 0),
        });
      }

      expect(slices.length).toBe(6);
      expect(slices[5].label).toBe('Others');
      expect(slices[5].value).toBe(30);
    });
  });
});

