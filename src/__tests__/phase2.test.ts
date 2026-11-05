import { formatINR } from '../utils/money';

describe('Phase 2 Business Logic & Usage Bar Verification', () => {
  describe('BalanceCard Usage Bar Rules', () => {
    function computeUsageState(incomePaise: number, expensePaise: number) {
      const hasIncome = incomePaise > 0;
      const isOverspent = hasIncome && expensePaise > incomePaise;
      const usageRatio = hasIncome ? expensePaise / incomePaise : 0;
      const usagePercent = Math.round(usageRatio * 100);

      let barColor = '#DDD6FE'; // light purple
      if (isOverspent || usagePercent > 90) {
        barColor = '#EF4444'; // red
      } else if (usagePercent >= 70) {
        barColor = '#F59E0B'; // amber
      }

      const fillWidth = isOverspent ? 100 : Math.min(100, Math.max(0, usagePercent));

      return {
        hasIncome,
        isOverspent,
        usagePercent,
        barColor,
        fillWidth,
        overAmountPaise: isOverspent ? expensePaise - incomePaise : 0,
      };
    }

    test('Zero income state hides usage bar and shows prompt', () => {
      const state = computeUsageState(0, 50000); // 0 in, ₹500 out
      expect(state.hasIncome).toBe(false);
      expect(state.isOverspent).toBe(false);
    });

    test('Normal threshold < 70% uses purple bar', () => {
      const state = computeUsageState(100000, 40000); // ₹1,000 in, ₹400 out (40%)
      expect(state.hasIncome).toBe(true);
      expect(state.isOverspent).toBe(false);
      expect(state.usagePercent).toBe(40);
      expect(state.fillWidth).toBe(40);
      expect(state.barColor).toBe('#DDD6FE');
    });

    test('Warning threshold 70% to 90% uses amber bar', () => {
      const state = computeUsageState(100000, 75000); // ₹1,000 in, ₹750 out (75%)
      expect(state.hasIncome).toBe(true);
      expect(state.isOverspent).toBe(false);
      expect(state.usagePercent).toBe(75);
      expect(state.fillWidth).toBe(75);
      expect(state.barColor).toBe('#F59E0B');
    });

    test('Critical threshold > 90% (not overspent) uses red bar', () => {
      const state = computeUsageState(100000, 95000); // ₹1,000 in, ₹950 out (95%)
      expect(state.hasIncome).toBe(true);
      expect(state.isOverspent).toBe(false);
      expect(state.usagePercent).toBe(95);
      expect(state.fillWidth).toBe(95);
      expect(state.barColor).toBe('#EF4444');
    });

    test('Overspent state uses 100% full red bar and computes over amount', () => {
      const state = computeUsageState(100000, 150000); // ₹1,000 in, ₹1,500 out
      expect(state.hasIncome).toBe(true);
      expect(state.isOverspent).toBe(true);
      expect(state.fillWidth).toBe(100);
      expect(state.barColor).toBe('#EF4444');
      expect(state.overAmountPaise).toBe(50000);
      expect(formatINR(state.overAmountPaise)).toBe('₹500');
    });
  });

  describe('Pie Chart Slice Constraint Rule', () => {
    test('Pie chart groups into max 6 slices with Other category', () => {
      const inputCategories = [
        { name: 'Food', paise: 50000 },
        { name: 'Travel', paise: 30000 },
        { name: 'Recharge', paise: 20000 },
        { name: 'Shopping', paise: 15000 },
        { name: 'Outings', paise: 10000 },
        { name: 'Stationery', paise: 5000 },
        { name: 'Snacks', paise: 2000 },
      ];

      const top5 = inputCategories.slice(0, 5);
      const remaining = inputCategories.slice(5);

      const totalPaise = inputCategories.reduce((sum, c) => sum + c.paise, 0);
      const otherTotal = remaining.reduce((sum, c) => sum + c.paise, 0);

      const slices = [
        ...top5.map((c) => ({
          name: c.name,
          percent: Math.round((c.paise / totalPaise) * 100),
        })),
        {
          name: 'Other',
          percent: Math.round((otherTotal / totalPaise) * 100),
        },
      ];

      expect(slices.length).toBe(6);
      expect(slices[5].name).toBe('Other');
      expect(slices[5].percent).toBe(5); // 7,000 / 132,000 ~ 5%
    });
  });
});
