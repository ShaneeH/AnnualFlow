import { availablePeriodKinds, choosePeriodKind, periodKind } from './period-kind';

describe('period-kind', () => {
  it('classifies period codes', () => {
    expect(periodKind('FY2025')).toBe('annual');
    expect(periodKind('M12_2025')).toBe('annual');
    expect(periodKind('Q3_2025')).toBe('quarterly');
    expect(periodKind('M3_2025')).toBe('quarterly');
    expect(periodKind('H1_2025')).toBe('other');
    expect(periodKind('YTD_2025')).toBe('other');
  });

  it('lists available kinds in display order and picks a default', () => {
    const rows = [{ period: 'Q1_2025' }, { period: 'FY2024' }, { period: 'Q2_2025' }];
    expect(availablePeriodKinds(rows)).toEqual(['annual', 'quarterly']);
    expect(choosePeriodKind(['annual', 'quarterly'], null)).toBe('annual');
    expect(choosePeriodKind(['annual', 'quarterly'], 'quarterly')).toBe('quarterly');
    expect(choosePeriodKind(['quarterly'], 'annual')).toBe('quarterly');
    expect(choosePeriodKind([], 'annual')).toBeNull();
  });
});
