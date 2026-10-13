import { sortPeriodsChronologically, sortPeriodsForDisplay } from './period-sort';

const p = (period: string, periodEnd: string | null) => ({ period, periodEnd });

describe('period sorting', () => {
  it('puts full years first, then quarters, then halves; newest first within each kind', () => {
    const sorted = sortPeriodsForDisplay([
      p('Q1_2025', '2025-03-31'), p('H1_2025', '2025-06-30'), p('FY2024', '2024-12-31'),
      p('Q2_2025', '2025-06-30'), p('FY2025', '2025-12-31')
    ]).map(x => x.period);
    expect(sorted).toEqual(['FY2025', 'FY2024', 'Q2_2025', 'Q1_2025', 'H1_2025']);
  });

  it('sorts chronologically with undated periods last', () => {
    expect(sortPeriodsChronologically([p('X', null), p('FY2025', '2025-12-31'), p('FY2024', '2024-12-31')])
      .map(x => x.period)).toEqual(['FY2024', 'FY2025', 'X']);
  });
});
