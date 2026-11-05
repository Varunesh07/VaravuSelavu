import { toPaise, formatINR, paiseToRupees } from '../utils/money';

describe('Money Utilities (paise & formatINR)', () => {
  describe('toPaise', () => {
    it('converts whole numbers correctly', () => {
      expect(toPaise('120')).toBe(12000);
      expect(toPaise(120)).toBe(12000);
      expect(toPaise('0')).toBe(0);
      expect(toPaise(0)).toBe(0);
    });

    it('converts decimal amounts to exact integer paise without float errors', () => {
      expect(toPaise('123.45')).toBe(12345);
      expect(toPaise('0.50')).toBe(50);
      expect(toPaise('0.05')).toBe(5);
      expect(toPaise('99.99')).toBe(9999);
    });

    it('handles commas, spaces and ₹ currency symbols', () => {
      expect(toPaise('₹1,234.50')).toBe(123450);
      expect(toPaise(' 10,000 ')).toBe(1000000);
      expect(toPaise('₹ 500')).toBe(50000);
    });

    it('handles single decimal digit gracefully', () => {
      expect(toPaise('12.5')).toBe(1250);
    });

    it('returns 0 on invalid input', () => {
      expect(toPaise('')).toBe(0);
      expect(toPaise('abc')).toBe(0);
    });
  });

  describe('formatINR', () => {
    it('hides .00 when amount is whole rupees', () => {
      expect(formatINR(12000)).toBe('₹120');
      expect(formatINR(0)).toBe('₹0');
    });

    it('shows two decimal places when amount has paise', () => {
      expect(formatINR(12345)).toBe('₹123.45');
      expect(formatINR(50)).toBe('₹0.50');
      expect(formatINR(5)).toBe('₹0.05');
    });

    it('formats Indian numbering system correctly', () => {
      expect(formatINR(12345600)).toBe('₹1,23,456');
      expect(formatINR(10000000)).toBe('₹1,00,000');
      expect(formatINR(1000000000)).toBe('₹1,00,00,000');
    });

    it('formats expense and income signs with ± symbols', () => {
      expect(formatINR(12000, { showSign: true, isExpense: true })).toBe('− ₹120');
      expect(formatINR(12000, { showSign: true, isExpense: false })).toBe('+ ₹120');
    });
  });

  describe('paiseToRupees', () => {
    it('converts correctly', () => {
      expect(paiseToRupees(12345)).toBe(123.45);
      expect(paiseToRupees(50000)).toBe(500);
    });
  });
});

