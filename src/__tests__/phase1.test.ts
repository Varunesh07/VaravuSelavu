import { toPaise, paiseToRupees, formatINR } from '../utils/money';
import { getTodayDateString, formatDisplayDate, isDateInFuture, shiftMonth } from '../utils/dates';

describe('Phase 1 Business Logic Verification', () => {
  test('transaction amount validation logic', () => {
    // Valid amounts
    expect(toPaise(100)).toBe(10000);
    expect(toPaise(0.5)).toBe(50);
    expect(paiseToRupees(10000)).toBe(100);

    // Formatted INR
    expect(formatINR(150000)).toBe('₹1,500');
    expect(formatINR(12550)).toBe('₹125.50');
  });

  test('date future boundary logic', () => {
    const today = getTodayDateString();
    expect(isDateInFuture(today)).toBe(false);

    // Far future date should be rejected
    expect(isDateInFuture('2099-01-01')).toBe(true);
  });

  test('month shifting logic', () => {
    expect(shiftMonth('2026-11', -1)).toBe('2026-10');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  test('display date formatting with today option', () => {
    const today = getTodayDateString();
    expect(formatDisplayDate(today, { showTodayText: true })).toBe('Today');
    expect(formatDisplayDate('2026-04-24')).toBe('24 Apr 2026');
  });
});
