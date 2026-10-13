import {
  formatChange, formatCount, formatMoney, formatPercent, formatPerShare, formatRatio, formatValue
} from './number-format';

describe('number-format', () => {
  it('formats money compactly with m / bn / k suffixes', () => {
    expect(formatMoney(248_600_000)).toBe('€248.6m');
    expect(formatMoney(1_200_000_000)).toBe('€1.2bn');
    expect(formatMoney(25_000)).toBe('€25.0k');
    expect(formatMoney(500)).toBe('€500');
    expect(formatMoney(-4_500_000)).toBe('-€4.5m');
    expect(formatMoney(250_000_000, 0)).toBe('€250m');
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(Number.NaN)).toBe('—');
  });

  it('formats per-share, percent, count, ratio and change', () => {
    expect(formatPerShare(0.88)).toBe('€0.88');
    expect(formatPerShare(-0.1)).toBe('-€0.10');
    expect(formatPercent(14.14)).toBe('14.1%');
    expect(formatPercent(60)).toBe('60.0%');
    expect(formatCount(4120)).toBe('4,120');
    expect(formatRatio(0.8301)).toBe('0.83×');
    expect(formatChange(18)).toBe('+18.0%');
    expect(formatChange(-3.24)).toBe('-3.2%');
  });

  it('dispatches by format name', () => {
    expect(formatValue(35_140_000, 'currency')).toBe('€35.1m');
    expect(formatValue(0.88, 'perShare')).toBe('€0.88');
    expect(formatValue(undefined, 'percent')).toBe('—');
  });
});
