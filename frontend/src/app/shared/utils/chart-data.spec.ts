import { hasSeries, isPresent, seriesWithData } from './chart-data';

describe('chart-data utils', () => {
  const rows = [
    { revenue: null, netMargin: 12.5, customers: null },
    { revenue: 1000, netMargin: null, customers: null }
  ];

  it('detects present numbers only', () => {
    expect(isPresent(0)).toBe(true);
    expect(isPresent(null)).toBe(false);
    expect(isPresent(undefined)).toBe(false);
    expect(isPresent(Number.NaN)).toBe(false);
  });

  it('reports whether any row has data for a key', () => {
    expect(hasSeries(rows, 'revenue')).toBe(true);
    expect(hasSeries(rows, 'customers')).toBe(false);
  });

  it('drops all-null series', () => {
    expect(seriesWithData(rows, ['revenue', 'netMargin', 'customers']))
      .toEqual(['revenue', 'netMargin']);
  });

  it('returns nothing for an empty history', () => {
    expect(hasSeries([] as typeof rows, 'revenue')).toBe(false);
  });
});
