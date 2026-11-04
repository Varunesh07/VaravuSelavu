import { APP_NAME, APP_VERSION, DEFAULT_CATEGORIES } from '../constants';
import { lightColors, darkColors } from '../theme/colors';

describe('Sanity & Configuration Tests', () => {
  it('has correct app metadata', () => {
    expect(APP_NAME).toBe('Varavuselavu');
    expect(APP_VERSION).toBe('1.0.0');
  });

  it('has 10 default categories defined', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(10);
    const inCategories = DEFAULT_CATEGORIES.filter((c) => c.type === 'in');
    const outCategories = DEFAULT_CATEGORIES.filter((c) => c.type === 'out');
    expect(inCategories).toHaveLength(3);
    expect(outCategories).toHaveLength(7);
  });

  it('has valid theme color tokens', () => {
    expect(lightColors.primary).toBe('#7C3AED');
    expect(darkColors.primary).toBe('#8B5CF6');
    expect(lightColors.accent).toBe('#F97316');
  });
});

