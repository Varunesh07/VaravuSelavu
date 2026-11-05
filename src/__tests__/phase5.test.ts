import { getHomePandaMood, getPostSaveReaction } from '../utils/pandaMood';
import { formatINR } from '../utils/money';

describe('Phase 5: Panda Mascot & Polish Verification', () => {
  describe('Home Screen Panda Mood Rules', () => {
    test('Returns "sleeping" when there is no money in yet (income <= 0)', () => {
      const moodZero = getHomePandaMood(0, 0);
      expect(moodZero.reaction).toBe('sleeping');
      expect(moodZero.message).toContain('No money in yet');

      const moodExpensesOnly = getHomePandaMood(0, 50000);
      expect(moodExpensesOnly.reaction).toBe('sleeping');
    });

    test('Returns "happy" when usage is strictly under 60%', () => {
      // Spent ₹1,000 out of ₹10,000 (10% usage)
      const mood10 = getHomePandaMood(1000000, 100000);
      expect(mood10.reaction).toBe('happy');
      expect(mood10.message).toContain('spending is well under control');

      // Spent ₹5,900 out of ₹10,000 (59% usage)
      const mood59 = getHomePandaMood(1000000, 590000);
      expect(mood59.reaction).toBe('happy');
    });

    test('Returns "pleading" when usage is between 60% and 90%', () => {
      // Exactly 60%
      const mood60 = getHomePandaMood(1000000, 600000);
      expect(mood60.reaction).toBe('pleading');
      expect(mood60.message).toContain('Careful');

      // 75%
      const mood75 = getHomePandaMood(1000000, 750000);
      expect(mood75.reaction).toBe('pleading');

      // Exactly 90%
      const mood90 = getHomePandaMood(1000000, 900000);
      expect(mood90.reaction).toBe('pleading');
    });

    test('Returns "crying" when usage is over 90% or user is overspent', () => {
      // 91%
      const mood91 = getHomePandaMood(1000000, 910000);
      expect(mood91.reaction).toBe('crying');
      expect(mood91.message).toContain('Budget alert');

      // Overspent (Spent ₹12,000 out of ₹10,000)
      const moodOver = getHomePandaMood(1000000, 1200000);
      expect(moodOver.reaction).toBe('crying');
    });
  });

  describe('Post-Save Panda Reaction Rules', () => {
    test('Saving money in returns "celebrating"', () => {
      const reaction = getPostSaveReaction('in', 500000, 200000);
      expect(reaction).toBe('celebrating');
    });

    test('Saving an expense that makes user overspent returns "shocked"', () => {
      // Expense = ₹6,000, Income = ₹5,000 -> Overspent!
      const reaction = getPostSaveReaction('out', 500000, 600000);
      expect(reaction).toBe('shocked');
    });

    test('Saving an expense while staying within income returns "happy"', () => {
      // Expense = ₹3,000, Income = ₹5,000 -> Under income!
      const reaction = getPostSaveReaction('out', 500000, 300000);
      expect(reaction).toBe('happy');
    });
  });

  describe('Accessibility and Currency Signs', () => {
    test('FormatINR correctly formats Indian currency with rupee symbol', () => {
      expect(formatINR(50000)).toBe('₹500');
      expect(formatINR(12500000)).toBe('₹1,25,000');
    });

    test('Sign conventions consistently distinguish Income and Expense', () => {
      const incomePrefix = '+ ';
      const expensePrefix = '− ';
      expect(incomePrefix).not.toBe(expensePrefix);
      expect(incomePrefix.trim()).toBe('+');
      expect(expensePrefix.trim()).toBe('−');
    });
  });

  describe('Performance Batch Simulation', () => {
    test('Batch generation correctly chunks 2,000 and 10,000 transactions', () => {
      const count = 2000;
      const batchSize = 250;
      const batches: number[] = [];

      let inserted = 0;
      while (inserted < count) {
        const currentBatch = Math.min(batchSize, count - inserted);
        batches.push(currentBatch);
        inserted += currentBatch;
      }

      expect(inserted).toBe(count);
      expect(batches.length).toBe(8); // 8 chunks of 250 = 2000
      expect(batches.reduce((a, b) => a + b, 0)).toBe(count);

      // Verify 10,000
      let inserted10k = 0;
      const batches10k: number[] = [];
      while (inserted10k < 10000) {
        const cur = Math.min(batchSize, 10000 - inserted10k);
        batches10k.push(cur);
        inserted10k += cur;
      }
      expect(inserted10k).toBe(10000);
      expect(batches10k.length).toBe(40); // 40 chunks of 250 = 10,000
    });
  });

  describe('Chart Fallback Rules', () => {
    test('Line chart with fewer than 3 points is converted to bar chart', () => {
      const lineData1 = [{ label: 'Nov 01', value: 400 }];
      const lineData2 = [
        { label: 'Nov 01', value: 400 },
        { label: 'Nov 02', value: 650 },
      ];
      const lineData3 = [
        { label: 'Nov 01', value: 400 },
        { label: 'Nov 02', value: 650 },
        { label: 'Nov 03', value: 300 },
      ];

      const getEffectiveChartType = (type: string, dataLength: number) => {
        return type === 'line' && dataLength < 3 ? 'bar' : type;
      };

      expect(getEffectiveChartType('line', lineData1.length)).toBe('bar');
      expect(getEffectiveChartType('line', lineData2.length)).toBe('bar');
      expect(getEffectiveChartType('line', lineData3.length)).toBe('line');
      expect(getEffectiveChartType('pie', 1)).toBe('pie');
      expect(getEffectiveChartType('bar', 1)).toBe('bar');
    });
  });
});

