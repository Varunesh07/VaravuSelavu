/**
 * Date utilities for Varavuselavu.
 * Rule: Always resolve dates using Asia/Kolkata timezone.
 * Database dates are always 'YYYY-MM-DD'.
 * Display format is '24 Apr 2026'.
 */

const TIMEZONE = 'Asia/Kolkata';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Returns today's date formatted as 'YYYY-MM-DD' in Asia/Kolkata timezone.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Returns current Year-Month as 'YYYY-MM' in Asia/Kolkata timezone.
 */
export function getCurrentYearMonth(): string {
  return getTodayDateString().slice(0, 7);
}

/**
 * Formats 'YYYY-MM-DD' to user-facing '24 Apr 2026'.
 * If date is today, optionally returns "Today".
 */
export function formatDisplayDate(dateStr: string, options?: { showTodayText?: boolean }): string {
  if (!dateStr || dateStr.length < 10) return dateStr || '';

  const today = getTodayDateString();
  if (options?.showTodayText && dateStr === today) {
    return 'Today';
  }

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

  const monthName = MONTH_SHORT_NAMES[month - 1] || monthStr;
  return `${day} ${monthName} ${year}`;
}

/**
 * Formats 'YYYY-MM' to 'November 2026'.
 */
export function formatMonthYear(yearMonth: string): string {
  if (!yearMonth || yearMonth.length < 7) return yearMonth;
  const [yearStr, monthStr] = yearMonth.split('-');
  const month = parseInt(monthStr, 10);
  const monthName = MONTH_NAMES[month - 1] || monthStr;
  return `${monthName} ${yearStr}`;
}

/**
 * Returns start and end dates ('YYYY-MM-01', 'YYYY-MM-DD') for a given month.
 */
export function getMonthRange(yearMonth: string): { from: string; to: string } {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const lastDay = new Date(year, month, 0).getDate();
  const paddedMonth = month.toString().padStart(2, '0');
  const paddedLastDay = lastDay.toString().padStart(2, '0');

  return {
    from: `${year}-${paddedMonth}-01`,
    to: `${year}-${paddedMonth}-${paddedLastDay}`,
  };
}

/**
 * Checks if a date string 'YYYY-MM-DD' is too far in the future.
 * Max allowed: today + 1 day.
 */
export function isDateInFuture(dateStr: string): boolean {
  const today = getTodayDateString();
  const [y1, m1, d1] = today.split('-').map(Number);
  const [y2, m2, d2] = dateStr.split('-').map(Number);

  const todayDate = new Date(y1, m1 - 1, d1);
  const targetDate = new Date(y2, m2 - 1, d2);

  const maxAllowed = new Date(todayDate);
  maxAllowed.setDate(todayDate.getDate() + 1);

  return targetDate.getTime() > maxAllowed.getTime();
}

/**
 * Resolves a month name (e.g. "December", "dec") to a date range.
 * Rule: A month with no year means the most recent past occurrence that is not in the future.
 * If explicit year is provided, that year is used.
 */
export function resolveMonthName(
  monthInput: string,
  explicitYear?: number
): { from: string; to: string; resolvedYearMonth: string } {
  const cleanInput = monthInput.toLowerCase().trim();
  const monthIndex = MONTH_NAMES.findIndex(
    (name) => name.toLowerCase().startsWith(cleanInput)
  );

  const today = getTodayDateString();
  const [currentYear, currentMonth] = today.split('-').map(Number);

  let targetYear = explicitYear;
  if (!targetYear) {
    // If the month is ahead of current month in the current year, use last year
    if (monthIndex + 1 > currentMonth) {
      targetYear = currentYear - 1;
    } else {
      targetYear = currentYear;
    }
  }

  const paddedMonth = (monthIndex + 1).toString().padStart(2, '0');
  const yearMonth = `${targetYear}-${paddedMonth}`;
  const range = getMonthRange(yearMonth);

  return {
    ...range,
    resolvedYearMonth: yearMonth,
  };
}

/**
 * Shifts a 'YYYY-MM' by delta months (e.g. -1 for previous month, +1 for next month).
 */
export function shiftMonth(yearMonth: string, delta: number): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) + delta;

  while (month < 1) {
    month += 12;
    year -= 1;
  }
  while (month > 12) {
    month -= 12;
    year += 1;
  }

  return `${year}-${month.toString().padStart(2, '0')}`;
}

