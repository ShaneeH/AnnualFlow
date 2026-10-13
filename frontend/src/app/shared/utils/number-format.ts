/**
 * The one place numbers are formatted for display: KPI cards, chart axes and
 * chart tooltips all use these helpers so the same value always reads the same.
 *
 *   formatMoney(248_600_000)   -> "€248.6m"
 *   formatMoney(1_200_000_000) -> "€1.2bn"
 *   formatMoney(25_000)        -> "€25.0k"
 *   formatPerShare(0.88)       -> "€0.88"
 *   formatPercent(14.14)       -> "14.1%"
 *   formatCount(4120)          -> "4,120"
 */

export const EMPTY_VALUE = '—';

function isNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Compact euro amount. `digits` = decimals for the scaled value (axes use 0). */
export function formatMoney(value: number | null | undefined, digits = 1): string {
  if (!isNumber(value)) return EMPTY_VALUE;

  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs >= 1e9) return `${sign}€${(abs / 1e9).toFixed(digits)}bn`;
  if (abs >= 1e6) return `${sign}€${(abs / 1e6).toFixed(digits)}m`;
  if (abs >= 1e3) return `${sign}€${(abs / 1e3).toFixed(digits)}k`;
  return `${sign}€${abs.toLocaleString('en-IE', { maximumFractionDigits: 2 })}`;
}

/** Per-share amounts such as EPS: always two decimals, never scaled. */
export function formatPerShare(value: number | null | undefined): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  return `${value < 0 ? '-' : ''}€${Math.abs(value).toFixed(2)}`;
}

/** Percentages are already in percent units (14.14 means 14.14%). */
export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  return `${value.toFixed(digits)}%`;
}

/** Whole counts such as customers. */
export function formatCount(value: number | null | undefined): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  return Math.round(value).toLocaleString('en-IE');
}

/** Plain ratios such as debt to equity. */
export function formatRatio(value: number | null | undefined): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  return `${value.toFixed(2)}×`;
}

/** Signed percentage change for KPI deltas: "+18.0%" / "-3.2%". */
export function formatChange(value: number | null | undefined): string {
  if (!isNumber(value)) return EMPTY_VALUE;
  return `${value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(1)}%`;
}

export type ValueFormat = 'currency' | 'perShare' | 'percent' | 'count' | 'ratio';

export function formatValue(value: number | null | undefined, format: ValueFormat): string {
  switch (format) {
    case 'currency': return formatMoney(value);
    case 'perShare': return formatPerShare(value);
    case 'percent': return formatPercent(value);
    case 'count': return formatCount(value);
    case 'ratio': return formatRatio(value);
  }
}
