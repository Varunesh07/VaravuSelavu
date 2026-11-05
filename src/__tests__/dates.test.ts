import {
  getTodayDateString,
  getCurrentYearMonth,
  formatDisplayDate,
  formatMonthYear,
  getMonthRange,
  isDateInFuture,
  resolveMonthName,
  shiftMonth,
} from '../utils/dates';

describe('Date Utilities (Asia/Kolkata timezone rules)', () => {
  it('returns valid YYYY-MM-DD for today', () => {
    const today = getTodayDateString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(getCurrentYearMonth()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('formats display dates in 24 Apr 2026 format', () => {
    expect(formatDisplayDate('2026-04-24')).toBe('24 Apr 2026');
    expect(formatDisplayDate('2026-11-04')).toBe('4 Nov 2026');
  });

  it('returns Today when showTodayText is enabled', () => {
    const today = getTodayDateString();
    expect(formatDisplayDate(today, { showTodayText: true })).toBe('Today');
  });

  it('formats month and year nicely', () => {
    expect(formatMonthYear('2026-11')).toBe('November 2026');
    expect(formatMonthYear('2026-01')).toBe('January 2026');
  });

  it('computes accurate month ranges including leap years', () => {
    expect(getMonthRange('2026-02')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    // 2024 was leap year
    expect(getMonthRange('2024-02')).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
    });
    expect(getMonthRange('2026-12')).toEqual({
      from: '2026-12-01',
      to: '2026-12-31',
    });
  });

  it('validates dates in the far future (max today + 1 day)', () => {
    const today = getTodayDateString();
    const [y, m, d] = today.split('-').map(Number);

    // Today is allowed
    expect(isDateInFuture(today)).toBe(false);

    // Far future is disallowed
    expect(isDateInFuture('2099-01-01')).toBe(true);
  });

  it('shifts months backwards and forwards correctly across year boundaries', () => {
    expect(shiftMonth('2026-05', 1)).toBe('2026-06');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
  });

  it('resolves month names to past/current occurrence', () => {
    const result = resolveMonthName('october', 2026);
    expect(result.from).toBe('2026-10-01');
    expect(result.to).toBe('2026-10-31');
  });
});
